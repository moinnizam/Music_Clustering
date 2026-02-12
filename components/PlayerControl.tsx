import React from 'react';
import { Play, Pause, X, Volume2, Loader2 } from 'lucide-react';
import { Track } from '../types';

interface PlayerControlProps {
  track: Track;
  isPlaying: boolean;
  isLoadingVoice: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onClose: () => void;
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const PlayerControl: React.FC<PlayerControlProps> = ({
  track,
  isPlaying,
  isLoadingVoice,
  currentTime,
  duration,
  onTogglePlay,
  onSeek,
  onClose
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-700 backdrop-blur-xl p-4 z-50 shadow-2xl">
      <div className="max-w-7xl mx-auto flex items-center gap-6">
        
        {/* Track Info */}
        <div className="flex-1 min-w-0 max-w-xs hidden sm:block">
          <h3 className="text-slate-100 font-medium truncate">{track.name}</h3>
          <p className="text-xs text-slate-400 truncate flex items-center gap-2">
             {isLoadingVoice ? (
               <span className="text-indigo-400 animate-pulse">Generating voice description...</span>
             ) : (
               track.features?.description || 'Analyzing...'
             )}
          </p>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="flex items-center gap-4">
            <button 
              onClick={onTogglePlay}
              disabled={isLoadingVoice}
              className={`p-2 rounded-full text-white transition-all
                ${isLoadingVoice 
                   ? 'bg-slate-700 cursor-wait' 
                   : 'bg-indigo-500 hover:bg-indigo-600'}`}
            >
              {isLoadingVoice ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </button>
          </div>
          
          <div className="w-full flex items-center gap-3 text-xs font-mono text-slate-400">
            <span className="w-10 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
              disabled={isLoadingVoice}
              className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 disabled:opacity-50"
            />
            <span className="w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Close / Volume placeholder */}
        <div className="flex items-center gap-4 min-w-[100px] justify-end">
           <div className="hidden sm:flex items-center gap-2 text-slate-500">
               <Volume2 className="w-4 h-4" />
           </div>
           <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200"
           >
            <X className="w-5 h-5" />
           </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerControl;