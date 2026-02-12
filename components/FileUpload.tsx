import React, { useCallback } from 'react';
import { UploadCloud } from 'lucide-react';

interface FileUploadProps {
  onUpload: (files: File[]) => void;
  isProcessing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUpload, isProcessing }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (isProcessing) return;
      
      const droppedFiles = (Array.from(e.dataTransfer.files) as File[]).filter(file => 
        file.type.startsWith('audio/')
      );
      if (droppedFiles.length > 0) {
        onUpload(droppedFiles);
      }
    },
    [onUpload, isProcessing]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && !isProcessing) {
      const selectedFiles = (Array.from(e.target.files) as File[]).filter(file => 
        file.type.startsWith('audio/')
      );
      onUpload(selectedFiles);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300
        ${isProcessing 
          ? 'border-slate-700 bg-slate-800/50 cursor-not-allowed opacity-50' 
          : 'border-indigo-500/50 bg-slate-800/30 hover:bg-slate-800/80 hover:border-indigo-400 cursor-pointer'
        }`}
    >
      <input
        type="file"
        multiple
        accept="audio/*"
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        disabled={isProcessing}
      />
      <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
        <div className="p-4 bg-indigo-500/10 rounded-full">
          <UploadCloud className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-slate-200">
            {isProcessing ? 'Processing files...' : 'Drop audio files here'}
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Support MP3, WAV (Max 10MB each)
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;