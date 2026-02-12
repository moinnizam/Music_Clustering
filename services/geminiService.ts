import { GoogleGenAI, Type } from "@google/genai";
import { AudioFeatures } from '../types';
import { GEMINI_MODEL, SYSTEM_INSTRUCTION } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:audio/mp3;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

export const analyzeAudio = async (file: File): Promise<AudioFeatures> => {
  try {
    const base64Data = await fileToBase64(file);
    
    // Determine mimeType. Default to audio/mp3 if unknown, but browser usually detects it.
    const mimeType = file.type || 'audio/mp3';

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: "Analyze this audio track and return its musical features in JSON format.",
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            energy: { type: Type.NUMBER, description: "Energy level from 0.0 to 1.0" },
            valence: { type: Type.NUMBER, description: "Valence level from 0.0 to 1.0" },
            danceability: { type: Type.NUMBER, description: "Danceability level from 0.0 to 1.0" },
            acousticness: { type: Type.NUMBER, description: "Acousticness level from 0.0 to 1.0" },
            tempo: { type: Type.NUMBER, description: "Estimated BPM" },
            description: { type: Type.STRING, description: "A 5-word description" },
          },
          required: ["energy", "valence", "danceability", "acousticness", "tempo", "description"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as AudioFeatures;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
