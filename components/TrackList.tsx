import React from 'react';
import { Track, Cluster, AnalysisStatus } from '../types';
import { Music, AlertCircle, Loader2, Play, Pause, Trash2 } from 'lucide-react';

interface TrackListProps {
  tracks: Track[];
  clusters: Cluster[];
  playingTrackId: string | null;
  onPlay: (track: Track) => void;
  onDelete: (trackId: string) => void;
}

const TrackList: React.FC<TrackListProps> = ({ tracks, clusters, playingTrackId, onPlay, onDelete }) => {
  const getClusterColor = (id?: number) => {
    if (id === undefined) return 'transparent';
    return clusters.find(c => c.id === id)?.color || '#64748b';
  };

  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <h2 className="font-semibold text-slate-200">Track List</h2>
      </div>
      <div className="overflow-y-auto flex-1 p-2 space-y-2">
        {tracks.length === 0 && (
          <div className="text-center py-10 text-slate-500">
            No tracks added yet.
          </div>
        )}
        
        {tracks.map((track) => {
          const isPlaying = playingTrackId === track.id;
          
          return (
            <div 
              key={track.id}
              onClick={() => track.status === AnalysisStatus.COMPLETED && onPlay(track)}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer group relative
                ${isPlaying 
                  ? 'bg-indigo-500/20 border-indigo-500/50' 
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-600'
                }`}
            >
              {/* Status/Play Icon */}
              <div className="flex-shrink-0 w-8 flex justify-center">
                {track.status === AnalysisStatus.ANALYZING ? (
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                ) : track.status === AnalysisStatus.ERROR ? (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 text-indigo-400" />
                ) : (
                  <div className="relative w-5 h-5 flex items-center justify-center">
                     {/* Play icon on hover */}
                     <Play className="w-4 h-4 text-slate-400 absolute opacity-0 group-hover:opacity-100 transition-opacity" />
                     {/* Dot when not hovering */}
                     <div 
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity"
                        style={{ borderColor: getClusterColor(track.clusterId) }}
                      >
                        <div 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: getClusterColor(track.clusterId) }} 
                        />
                      </div>
                  </div>
                )}
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0 mr-8"> {/* Added margin-right for delete button */}
                <div className="flex justify-between items-start">
                  <p className={`text-sm font-medium truncate pr-2 ${isPlaying ? 'text-indigo-200' : 'text-slate-200'}`}>
                    {track.name}
                  </p>
                  {track.features && (
                     <span className="text-xs font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                       {Math.round(track.features.tempo)} BPM
                     </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  {track.status === AnalysisStatus.ERROR ? (
                    <p className="text-xs text-red-400 truncate">{track.error}</p>
                  ) : track.features ? (
                    <p className="text-xs text-slate-400 truncate flex-1">
                      {track.features.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      {track.status === AnalysisStatus.ANALYZING ? 'Analyzing audio features...' : 'Waiting...'}
                    </p>
                  )}
                </div>
              </div>

              {/* Delete Button (Visible on Hover) */}
              <button 
                onClick={(e) => {
                  e.stopPropagation(); // Prevent playing when clicking delete
                  onDelete(track.id);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-slate-500 hover:text-red-400 hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete track"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrackList;