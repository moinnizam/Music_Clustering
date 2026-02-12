export const CLUSTER_COLORS = [
  '#f43f5e', // Rose 500
  '#3b82f6', // Blue 500
  '#22c55e', // Green 500
  '#eab308', // Yellow 500
  '#a855f7', // Purple 500
  '#f97316', // Orange 500
  '#06b6d4', // Cyan 500
  '#ec4899', // Pink 500
];

export const MAX_FILE_SIZE_MB = 10;

// Gemini Model configuration
// Using gemini-3-flash-preview as the standard multimodal model
export const GEMINI_MODEL = 'gemini-3-flash-preview'; 

export const SYSTEM_INSTRUCTION = `
You are an expert musicologist AI. Your task is to listen to audio files and extract precise audio features for clustering purposes.
Analyze the audio for the following:
1. Energy (0.0 - 1.0): Intensity and activity.
2. Valence (0.0 - 1.0): Musical positiveness (sad/depressed to happy/cheerful).
3. Danceability (0.0 - 1.0): Suitability for dancing.
4. Acousticness (0.0 - 1.0): Likelihood the track is acoustic.
5. Tempo: Estimated Beats Per Minute (BPM).
6. Description: A vivid, 15-20 word description capturing the specific mood, instrumentation, and genre nuances (e.g., "A melancholic lo-fi hip-hop track with dusty piano samples and a laid-back boom-bap beat").
`;