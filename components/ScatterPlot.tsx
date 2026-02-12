import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Track, Cluster } from '../types';

interface ScatterPlotProps {
  tracks: Track[];
  clusters: Cluster[];
  playingTrackId: string | null;
  onTrackSelect: (track: Track) => void;
  width?: number;
  height?: number;
}

interface PopupState {
  x: number;
  y: number;
  content: React.ReactNode;
  visible: boolean;
}

const ScatterPlot: React.FC<ScatterPlotProps> = ({ 
  tracks, 
  clusters, 
  playingTrackId,
  onTrackSelect,
  width = 600, 
  height = 400 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for popups (Hover and Click)
  const [hoverTooltip, setHoverTooltip] = useState<PopupState | null>(null);
  const [clickPopup, setClickPopup] = useState<PopupState | null>(null);

  // Auto-dismiss click popup
  useEffect(() => {
    if (clickPopup?.visible) {
      const timer = setTimeout(() => {
        setClickPopup(prev => prev ? { ...prev, visible: false } : null);
      }, 4000); // Disappear after 4 seconds
      return () => clearTimeout(timer);
    }
  }, [clickPopup?.visible, clickPopup?.content]); // Reset timer if content changes

  // Relaxed filter: Show points as soon as they have features
  const data = useMemo(() => tracks.filter(t => t.features), [tracks]);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 40, bottom: 50, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);

    // Grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(-innerHeight).tickFormat(() => ""))
      .attr("stroke-opacity", 0.1)
      .attr("stroke", "#94a3b8");

    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth).tickFormat(() => ""))
      .attr("stroke-opacity", 0.1)
      .attr("stroke", "#94a3b8");

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(5);
    const yAxis = d3.axisLeft(yScale).ticks(5);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr("color", "#94a3b8")
      .style("font-size", "12px");

    g.append("g")
      .call(yAxis)
      .attr("color", "#94a3b8")
      .style("font-size", "12px");

    // Labels
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 40)
      .attr("text-anchor", "middle")
      .attr("fill", "#94a3b8")
      .text("Valence (Sad → Happy)");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -35)
      .attr("text-anchor", "middle")
      .attr("fill", "#94a3b8")
      .text("Energy (Calm → Intense)");

    // Selection Halo
    g.selectAll("circle.halo")
      .data(data.filter(d => d.id === playingTrackId))
      .enter()
      .append("circle")
      .attr("class", "halo")
      .attr("cx", d => xScale(d.features!.valence))
      .attr("cy", d => yScale(d.features!.energy))
      .attr("r", d => 12 + (d.features!.danceability * 6))
      .attr("fill", "none")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("opacity", 0.5)
      .append("animate")
        .attr("attributeName", "r")
        .attr("values", d => `${12 + (d.features!.danceability * 6)};${18 + (d.features!.danceability * 6)};${12 + (d.features!.danceability * 6)}`)
        .attr("dur", "2s")
        .attr("repeatCount", "indefinite");

    // Points
    g.selectAll("circle.point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "point")
      .attr("cx", d => xScale(d.features!.valence))
      .attr("cy", d => yScale(d.features!.energy))
      .attr("r", d => 6 + (d.features!.danceability * 6))
      .attr("fill", d => {
        if (d.clusterId === undefined) return "#64748b";
        return clusters.find(c => c.id === d.clusterId)?.color || "#64748b";
      })
      .attr("opacity", d => d.id === playingTrackId ? 1 : 0.8)
      .attr("stroke", d => d.id === playingTrackId ? "#fff" : "#0f172a")
      .attr("stroke-width", d => d.id === playingTrackId ? 3 : 2)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onTrackSelect(d);
        
        // Show detailed popup on click
        const containerRect = containerRef.current?.getBoundingClientRect();
        const mouseX = event.clientX - (containerRect?.left || 0);
        const mouseY = event.clientY - (containerRect?.top || 0);

        setClickPopup({
          x: mouseX + 15,
          y: mouseY - 10,
          visible: true,
          content: (
            <div className="max-w-xs">
              <div className="font-bold text-slate-100 mb-1">{d.name}</div>
              <div className="text-xs text-slate-300 leading-relaxed border-t border-slate-600 pt-1 mt-1">
                {d.features?.description}
              </div>
            </div>
          )
        });
      })
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("stroke", "#fff").attr("opacity", 1);
        
        const containerRect = containerRef.current?.getBoundingClientRect();
        const mouseX = event.clientX - (containerRect?.left || 0);
        const mouseY = event.clientY - (containerRect?.top || 0);

        setHoverTooltip({
          x: mouseX + 15,
          y: mouseY - 10,
          visible: true,
          content: (
             <>
               <strong>{d.name}</strong><br/>
               <span className="opacity-75">BPM: {Math.round(d.features?.tempo || 0)}</span><br/>
               <span className="text-slate-400 text-[10px] mt-1 block">Click to play & view details</span>
             </>
          )
        });
      })
      .on("mousemove", (event) => {
        const containerRect = containerRef.current?.getBoundingClientRect();
        const mouseX = event.clientX - (containerRect?.left || 0);
        const mouseY = event.clientY - (containerRect?.top || 0);
        
        setHoverTooltip(prev => prev ? { ...prev, x: mouseX + 15, y: mouseY - 10 } : null);
      })
      .on("mouseout", (event, d) => {
        const isPlaying = d.id === playingTrackId;
        d3.select(event.currentTarget)
          .attr("stroke", isPlaying ? "#fff" : "#0f172a")
          .attr("opacity", isPlaying ? 1 : 0.8);
        setHoverTooltip(null);
      });

  }, [data, clusters, width, height, playingTrackId, onTrackSelect]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 border border-slate-800 rounded-xl bg-slate-900/50">
        Waiting for analysis results...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative bg-slate-800/30 rounded-xl p-4 border border-slate-700">
      <h3 className="absolute top-4 left-6 text-sm font-semibold text-slate-400 uppercase tracking-wider">
        Cluster Map
      </h3>
      <div className="flex justify-center">
        <svg ref={svgRef} width={width} height={height} className="overflow-visible" />
      </div>

      {/* Hover Tooltip */}
      {hoverTooltip?.visible && (
        <div 
          className="absolute z-40 bg-slate-800 border border-slate-600 text-slate-200 text-xs px-2 py-1.5 rounded shadow-xl pointer-events-none whitespace-nowrap"
          style={{ top: hoverTooltip.y, left: hoverTooltip.x }}
        >
          {hoverTooltip.content}
        </div>
      )}

      {/* Click Popup (Detailed) */}
      {clickPopup?.visible && (
        <div 
          className="absolute z-50 bg-slate-900/95 border border-indigo-500 text-slate-100 text-sm p-3 rounded-lg shadow-2xl backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200"
          style={{ top: clickPopup.y, left: clickPopup.x }}
        >
          {clickPopup.content}
        </div>
      )}
    </div>
  );
};

export default ScatterPlot;