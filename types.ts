export interface AudioFeatures {
  energy: number;      // 0.0 to 1.0
  valence: number;     // 0.0 to 1.0 (Sad to Happy)
  danceability: number;// 0.0 to 1.0
  acousticness: number;// 0.0 to 1.0
  tempo: number;       // BPM
  description: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface Track {
  id: string;
  file: File;
  name: string;
  size: number;
  duration?: number;
  status: AnalysisStatus;
  features?: AudioFeatures;
  clusterId?: number;
  error?: string;
}

export interface Cluster {
  id: number;
  color: string;
  name: string;
  centroid: { x: number; y: number }; // X=Valence, Y=Energy for simplified viz
}

export interface Point {
  x: number;
  y: number;
  trackId: string;
}