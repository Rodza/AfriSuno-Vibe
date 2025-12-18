
export interface GeneratedContent {
  lyrics: string;
  stylePrompt: string;
  linguisticAnalysis?: string;
}

export interface ClarificationResponse {
  question: string;
  options: string[];
}

export type AppStep = 'initial' | 'clarifying' | 'generating' | 'results';
export type ViewMode = 'generator' | 'enhancer' | 'library' | 'cloner';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface SongContext {
  idea: string;
  clarificationQuestion: string;
  clarificationAnswer: string;
}

export type MasteringPreset = 'balanced' | 'pop' | 'electronic' | 'rock' | 'lofi';

export interface AudioProcessOptions {
  intensity: 'low' | 'medium' | 'high';
  stereoWidth: 'normal' | 'wide';
  enableWarmth: boolean;
  enableFades: boolean;
  enableNaturalizer: boolean;
  exportFormat: 'mp3' | 'wav';
  preset?: MasteringPreset;
  // New Creative FX Control
  creativeFx: {
    chorus: number; // 0.0 to 1.0
    phaser: number; // 0.0 to 1.0
    flanger: number; // 0.0 to 1.0
  };
}

export interface SavedVibe {
  id: string;
  timestamp: number;
  idea: string;
  lyrics: string;
  stylePrompt: string;
  linguisticAnalysis?: string;
}

export interface AudioAnalysis {
  bpm: string;
  key: string;
  genre_signature: string;
  rhythm_profile: string;
  instrument_stack: string[];
  vocal_delivery: string;
  structure_map: string[];
  tone_flow: string;
  suno_style_prompt: string;
}
