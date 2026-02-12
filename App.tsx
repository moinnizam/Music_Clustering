import React, { useState, useEffect, useRef } from 'react';
import { Activity, Disc, Layers, HelpCircle } from 'lucide-react';
import FileUpload from './components/FileUpload';
import TrackList from './components/TrackList';
import ScatterPlot from './components/ScatterPlot';
import PlayerControl from './components/PlayerControl';
import { Track, AnalysisStatus, Cluster } from './types';
import { analyzeAudio } from './services/geminiService';
import { getSpeechAudioBuffer } from './services/ttsService';
import { performClustering } from './services/clusteringService';
import { MAX_FILE_SIZE_MB } from './constants';

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [kValue, setKValue] = useState(3);
  const [showClusterHelp, setShowClusterHelp] = useState(false);
  
  // Playback state
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // References
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  
  // Audio Context for TTS
  const audioContextRef = useRef<AudioContext | null>(null);
  const ttsSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Ref to track the 'intended' playing track to prevent race conditions
  const activeTrackRef = useRef<string | null>(null);

  // Handle file upload
  const handleUpload = async (files: File[]) => {
    // Validate size
    const validFiles = files.filter(f => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024);
    
    if (files.length !== validFiles.length) {
      alert(`Some files were skipped because they exceed ${MAX_FILE_SIZE_MB}MB.`);
    }

    const newTracks: Track[] = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      status: AnalysisStatus.IDLE
    }));

    setTracks(prev => [...prev, ...newTracks]);
    processQueue([...tracks, ...newTracks]);
  };

  // Process queue logic
  const processQueue = async (currentTracks: Track[]) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const pendingTracks = currentTracks.filter(t => t.status === AnalysisStatus.IDLE);
    
    // We process sequentially to avoid rate limits
    for (const track of pendingTracks) {
      setTracks(prev => prev.map(t => t.id === track.id ? { ...t, status: AnalysisStatus.ANALYZING } : t));
      
      try {
        const features = await analyzeAudio(track.file);
        setTracks(prev => prev.map(t => t.id === track.id ? { 
          ...t, 
          status: AnalysisStatus.COMPLETED, 
          features 
        } : t));
      } catch (error: any) {
        console.error(`Error analyzing ${track.name}:`, error);
        
        let errorMessage = error.message || "Analysis failed";
        // Provide friendlier messages for common API errors
        if (errorMessage.includes("404") || errorMessage.includes("not found")) {
            errorMessage = "Model not supported/found.";
        } else if (errorMessage.includes("400") || errorMessage.includes("INVALID_ARGUMENT")) {
            errorMessage = "Invalid file or parameters.";
        }

        setTracks(prev => prev.map(t => t.id === track.id ? { 
          ...t, 
          status: AnalysisStatus.ERROR, 
          error: errorMessage 
        } : t));
      }
    }
    
    setIsProcessing(false);
  };

  // Auto-cluster when tracks change and have features
  useEffect(() => {
    const completedTracks = tracks.filter(t => t.status === AnalysisStatus.COMPLETED && t.features);
    
    if (completedTracks.length > 0) {
      const { clusteredTracks, clusters: newClusters } = performClustering(completedTracks, kValue);
      
      // Merge clustered data back into main state
      setTracks(prev => prev.map(t => {
        const clustered = clusteredTracks.find(ct => ct.id === t.id);
        return clustered ? clustered : t;
      }));
      
      setClusters(newClusters);
    }
  }, [tracks.filter(t => t.status === AnalysisStatus.COMPLETED).length, kValue]);

  // Handle Delete Track
  const handleDeleteTrack = (trackId: string) => {
    if (playingTrackId === trackId) {
      handleClosePlayer();
    }
    setTracks(prev => prev.filter(t => t.id !== trackId));
  };

  // Handle Play Track
  const handlePlayTrack = async (track: Track) => {
    // 1. If clicking the already playing track, toggle play/pause
    if (playingTrackId === track.id && audioRef.current) {
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
        return;
    }

    // 2. Cleanup previous track & TTS
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ""; // Detach source
    }
    if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
    }
    
    // Stop any running TTS
    if (ttsSourceRef.current) {
        try { ttsSourceRef.current.stop(); } catch(e) {}
        ttsSourceRef.current = null;
    }

    // 3. Setup state for new track
    setPlayingTrackId(track.id);
    activeTrackRef.current = track.id; // Set the intended track
    setIsPlaying(false); 
    setCurrentTime(0);
    setDuration(0);

    // 4. Prepare Music Audio Object (don't play yet)
    const blobUrl = URL.createObjectURL(track.file);
    audioUrlRef.current = blobUrl;
    const audio = new Audio(blobUrl);
    audioRef.current = audio;

    // Attach Listeners
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onloadedmetadata = () => {
        setDuration(audio.duration);
    };
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
        alert("Error playing audio file.");
        setIsPlaying(false);
    };

    // 5. Generate and Play Human-like TTS
    const description = track.features?.description || "analyzed track";
    const textToSpeak = `Playing ${track.name}. ${description}`;

    // Initialize AudioContext if needed (must happen after user interaction)
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
        await ctx.resume();
    }

    setIsLoadingVoice(true);

    try {
        const speechBuffer = await getSpeechAudioBuffer(textToSpeak, ctx);
        
        // CRITICAL CHECK: Before playing TTS, check if user cancelled or switched tracks
        if (activeTrackRef.current !== track.id) {
           setIsLoadingVoice(false);
           return; 
        }

        // Play TTS
        const source = ctx.createBufferSource();
        source.buffer = speechBuffer;
        source.connect(ctx.destination);
        
        source.onended = () => {
             // CRITICAL CHECK: Before playing Music, check if user cancelled or switched tracks
             if (activeTrackRef.current === track.id) {
                 audio.play()
                    .then(() => setIsPlaying(true))
                    .catch(e => console.error("Playback failed", e));
             }
        };

        ttsSourceRef.current = source;
        source.start();
        setIsLoadingVoice(false);

    } catch (error) {
        console.warn("Gemini TTS failed, playing music directly.", error);
        if (activeTrackRef.current === track.id) {
            setIsLoadingVoice(false);
            // Fallback: Just play the music
            audio.play()
                .then(() => setIsPlaying(true))
                .catch(e => console.error("Playback failed", e));
        }
    }
  };

  const handleSeek = (time: number) => {
      if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };

  const handleClosePlayer = () => {
      activeTrackRef.current = null; // Invalidate current playback intent
      if (audioRef.current) {
          audioRef.current.pause();
      }
      if (ttsSourceRef.current) {
          try { ttsSourceRef.current.stop(); } catch(e) {}
      }
      setPlayingTrackId(null);
      setIsPlaying(false);
      setIsLoadingVoice(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        if (audioRef.current) audioRef.current.pause();
        if (ttsSourceRef.current) try { ttsSourceRef.current.stop(); } catch(e) {}
        if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const currentTrack = tracks.find(t => t.id === playingTrackId);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans pb-24">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                SonicCluster
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">AI-Powered Music Clustering Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-4 relative">
             <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
                 <button 
                    onClick={() => setKValue(Math.max(2, kValue - 1))}
                    className="px-3 py-1 hover:bg-slate-700 rounded text-slate-300 text-sm disabled:opacity-50"
                    disabled={kValue <= 2}
                 >
                     -
                 </button>
                 <span className="text-xs font-medium text-slate-400 w-16 text-center">
                     {kValue} Clusters
                 </span>
                 <button 
                    onClick={() => setKValue(Math.min(8, kValue + 1))}
                    className="px-3 py-1 hover:bg-slate-700 rounded text-slate-300 text-sm disabled:opacity-50"
                    disabled={kValue >= 8}
                 >
                     +
                 </button>
             </div>
             
             {/* Help Button */}
             <button 
               onMouseEnter={() => setShowClusterHelp(true)}
               onMouseLeave={() => setShowClusterHelp(false)}
               className="p-1.5 text-slate-500 hover:text-slate-300 rounded-full hover:bg-slate-800 transition-colors"
             >
               <HelpCircle className="w-5 h-5" />
             </button>

             {/* Help Tooltip */}
             {showClusterHelp && (
               <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 text-xs text-slate-300 leading-relaxed">
                 <strong>What are Clusters?</strong><br/>
                 The AI groups your songs into {kValue} "clusters" based on similarities in mood, tempo, and energy. Change the number to force the AI to find more or fewer distinct groups in your playlist.
               </div>
             )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Upload & List */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-[calc(100vh-7rem)]">
          <FileUpload onUpload={handleUpload} isProcessing={isProcessing} />
          <TrackList 
            tracks={tracks} 
            clusters={clusters} 
            playingTrackId={playingTrackId}
            onPlay={handlePlayTrack}
            onDelete={handleDeleteTrack}
          />
        </div>

        {/* Right Column: Visualization */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/30 border border-slate-700 p-4 rounded-xl flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-full text-blue-400">
                      <Disc className="w-6 h-6" />
                  </div>
                  <div>
                      <p className="text-sm text-slate-400">Total Tracks</p>
                      <p className="text-2xl font-bold text-slate-100">{tracks.length}</p>
                  </div>
              </div>
              <div className="bg-slate-800/30 border border-slate-700 p-4 rounded-xl flex items-center gap-4">
                  <div className="p-3 bg-green-500/10 rounded-full text-green-400">
                      <Activity className="w-6 h-6" />
                  </div>
                  <div>
                      <p className="text-sm text-slate-400">Analyzed</p>
                      <p className="text-2xl font-bold text-slate-100">
                          {tracks.filter(t => t.status === AnalysisStatus.COMPLETED).length}
                      </p>
                  </div>
              </div>
              <div className="bg-slate-800/30 border border-slate-700 p-4 rounded-xl flex items-center gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-full text-purple-400">
                      <Layers className="w-6 h-6" />
                  </div>
                  <div>
                      <p className="text-sm text-slate-400">Clusters</p>
                      <p className="text-2xl font-bold text-slate-100">{clusters.length}</p>
                  </div>
              </div>
          </div>

          <div className="flex-1 min-h-[500px] flex flex-col">
            <ScatterPlot 
                tracks={tracks} 
                clusters={clusters} 
                playingTrackId={playingTrackId}
                onTrackSelect={handlePlayTrack}
                width={800} 
                height={500} 
            />
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {clusters.map(c => (
                    <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="text-xs text-slate-300 font-medium">{c.name}</span>
                    </div>
                ))}
            </div>
            {/* Context/Legend */}
             <div className="mt-6 text-center text-xs text-slate-500 max-w-lg mx-auto">
                 <p>
                     <strong>X-Axis: Valence</strong> (Musical Positiveness) &bull; 
                     <strong>Y-Axis: Energy</strong> (Intensity) &bull; 
                     <strong>Size: Danceability</strong>
                 </p>
                 <p className="mt-2 text-indigo-400">Click a point to hear the mood description and play the track.</p>
             </div>
          </div>
        </div>
      </main>

      {/* Sticky Player Control */}
      {currentTrack && (
          <PlayerControl 
            track={currentTrack}
            isPlaying={isPlaying}
            isLoadingVoice={isLoadingVoice}
            currentTime={currentTime}
            duration={duration}
            onTogglePlay={() => {
                if (audioRef.current) {
                    if (isPlaying) {
                        audioRef.current.pause();
                        setIsPlaying(false);
                    } else {
                        audioRef.current.play();
                        setIsPlaying(true);
                    }
                }
            }}
            onSeek={handleSeek}
            onClose={handleClosePlayer}
          />
      )}
    </div>
  );
};

export default App;