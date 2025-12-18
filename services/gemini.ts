
import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedContent, SongContext, ClarificationResponse, AudioAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = "gemini-3-pro-preview";
// Switched to 2.0 Flash Experimental as it currently has the best audio analysis capabilities
// and is more stable than the preview 2.5 endpoints for this specific task.
const AUDIO_MODEL_NAME = "gemini-2.0-flash-exp";

const SYSTEM_INSTRUCTION = `
You are the "Vibe V5 Lyric Architect," a world-class senior music producer and Suno V5 prompting expert specializing in contemporary Afrikaans music.
Your mission is to generate authentic Afrikaans lyrics and high-precision Suno V5 style prompts in ENGLISH.

*** LYRICAL PROTOCOL: DEEP CULTURAL POETICS ***
1. CULTURAL NUANCE: Draw inspiration from contemporary South African poetry (e.g., Antjie Krog, Breyten Breytenbach) and modern songwriters (Spoegwolf, Fokofpolisiekar).
2. LOCAL IMAGERY: Root the metaphors in the landscape—the dust of the Karoo, the grey mist of Table Mountain, the electric hum of Joburg nights, the silence of the Vrystaat. 
3. AVOID LITERALISM: Use sensory metaphors. Instead of "I miss you," use "Die huis is 'n stilte wat aan my ribbes klop" (The house is a silence knocking on my ribs).
4. ADVANCED STRUCTURE: Use descriptive section markers. 
   Examples: [Atmospheric Intro: Fynbos Wind Sounds], [Verse 1: Intimate Whispered Delivery], [Pre-Chorus: Building Tension], [Chorus: Anthemic, Wide Stereo Field], [Bridge: Melancholic Breakdown].

*** STYLE PROMPT PROTOCOL: THE ARCHITECT MASTER LIST ***
1. DYNAMIC TRANSITIONS: You MUST include dynamic shifts if the vibe calls for it. 
   - [Tempo Change: 110 BPM -> 130 BPM]
   - [Key Shift: E Major -> C# Minor]
   - [Rhythmic Shift: Half-time -> Double-time]
2. COMPLEX GENRE ALCHEMY: Create unique 3-4 genre blends. E.g., "Indie-folk meets Cyberpunk-pop with Trap influences", "Baroque Pop mixed with Industrial Techno and Jazz Fusion".
3. VOCAL MODELING & ENVELOPE: Specify the physics of the voice.
   - [Vocal Attack: Sharp/Soft]
   - [Transient Emphasis: High]
   - [Decay: Long/Short]
   - [Sustain: Breathless/Power]
   - Delivery: "Dialogue-like delivery", "Shouted vocals", "Whispered storytelling", "Melismatic runs", "Spoken word passages".
4. VOCAL FX CHAIN: Detail vocal processing. E.g., "Heavy Autotune", "Vocoder layers", "Phaser on vocals", "Ring modulation", "Harmonic doubling", "Telephone EQ".
5. EXPANDED INSTRUMENTATION: Use specific and eclectic instruments. E.g., "Harpsichord", "Theremin", "Steel drums", "Bagpipes", "808 bass drops", "Duduk", "Fuzz bass", "Glass armonica".

*** OUTPUT REQUIREMENTS ***
- Lyrics: Modern, authentic, metaphorical AFRIKAANS with descriptive structural tags.
- Style Prompt: Highly technical and descriptive ENGLISH only (max 200 characters). Prioritize the blend of specific instruments, vocal styles, vocal effects, and dynamic shifts.
- Linguistic Analysis: Explain the choice of metaphors, the cultural references used, and how the structure supports the vibe.
`;

const clarificationSchema = {
  type: Type.OBJECT,
  properties: {
    question: {
      type: Type.STRING,
      description: "A structured, insightful question to help define the musical path."
    },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3-4 concise, distinct musical paths or subgenre options."
    }
  },
  required: ["question", "options"]
};

const contentSchema = {
  type: Type.OBJECT,
  properties: {
    lyrics: {
      type: Type.STRING,
      description: "Metaphorical modern Afrikaans lyrics with descriptive Suno V5 section tags."
    },
    stylePrompt: {
      type: Type.STRING,
      description: "Detailed Suno V5 prompt in ENGLISH including Key, BPM, and technical production descriptors."
    },
    linguisticAnalysis: {
        type: Type.STRING,
        description: "Notes on the metaphorical choices and the prosody of the lyrics."
    }
  },
  required: ["lyrics", "stylePrompt", "linguisticAnalysis"]
};

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    bpm: { type: Type.STRING, description: "Estimated BPM" },
    key: { type: Type.STRING, description: "Musical Key and Scale" },
    genre_signature: { type: Type.STRING, description: "Precise genre blend description" },
    rhythm_profile: { type: Type.STRING, description: "Groove, swing, syncopation details" },
    instrument_stack: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of key instruments" },
    vocal_delivery: { type: Type.STRING, description: "Flow, cadence, and vocal style" },
    structure_map: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Timeline of song sections" },
    tone_flow: { type: Type.STRING, description: "Description of the emotional progression/trajectory of the song (e.g. Melancholic -> Explosive -> Resigned)" },
    suno_style_prompt: { type: Type.STRING, description: "Optimized Suno V5 Style Prompt to replicate this vibe" }
  },
  required: ["bpm", "key", "genre_signature", "rhythm_profile", "instrument_stack", "vocal_delivery", "structure_map", "tone_flow", "suno_style_prompt"]
};

/**
 * Helper to clean Markdown code fences from JSON strings
 */
const cleanJson = (text: string): string => {
  return text.replace(/```json\s*|\s*```/g, "").trim();
};

export const getClarificationQuestion = async (idea: string): Promise<ClarificationResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\nTask: Ask a structured clarification question focused on the artistic and emotional direction.",
        responseMimeType: "application/json",
        responseSchema: clarificationSchema
      },
      contents: `User Idea: "${idea}"`,
    });
    
    const jsonText = response.text;
    if (!jsonText) throw new Error("No response text");
    return JSON.parse(cleanJson(jsonText)) as ClarificationResponse;
  } catch (error) {
    return {
      question: "What emotional texture should the lyrics explore?",
      options: ["Melancholic Nostalgia", "Gritty Urban Realism", "Uplifting Synth-Wave"]
    };
  }
};

export const generateSong = async (context: SongContext): Promise<GeneratedContent> => {
  const prompt = `
    Idea: ${context.idea}
    Context: The user chose "${context.clarificationAnswer}" in response to "${context.clarificationQuestion}".
    
    Generate the Vibe. Focus on high-level Afrikaans poetics and technical Suno V5 formatting.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: contentSchema,
        thinkingConfig: { thinkingBudget: 4096 },
      },
      contents: prompt,
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Generation failed");
    return JSON.parse(cleanJson(jsonText)) as GeneratedContent;
  } catch (error) {
    console.error("Error generating song:", error);
    throw error;
  }
};

export const refineSong = async (
  currentContent: GeneratedContent,
  feedback: string
): Promise<GeneratedContent> => {
  const prompt = `
    Current Content: ${JSON.stringify(currentContent)}
    Feedback: "${feedback}"
    
    Update the vibe. Prioritize metaphorical depth, lyrical prosody, and structural markers.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: contentSchema,
        thinkingConfig: { thinkingBudget: 4096 },
      },
      contents: prompt,
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Refinement failed");
    return JSON.parse(cleanJson(jsonText)) as GeneratedContent;
  } catch (error) {
    throw error;
  }
};

export const analyzeReferenceAudio = async (base64Audio: string, mimeType: string): Promise<AudioAnalysis> => {
  const prompt = `
    Analyze this audio track musically.
    Deconstruct the "Sonic DNA" to help me recreate this exact vibe in Suno V5 but with different lyrics.
    
    I need:
    1. Precise BPM and Key.
    2. The Rhythm Profile (swing, straight, syncopation level).
    3. The Instrument Stack: Identify specific instruments (e.g., 'Harpsichord', 'Theremin', '808 bass drops') and standard ones.
    4. Vocal Delivery & FX: Analyze the delivery (e.g., 'dialogue-like', 'shouted', 'whispered', 'melismatic') and any effects (e.g., 'vocoder', 'auto-tune', 'phaser').
    5. Genre Alchemy: Identify the specific blend of genres (can be >2, e.g. "Indie-folk meets Cyberpunk-pop").
    6. A Structure Map (Intro, Verse, etc).
    7. TONE FLOW: Analyze the emotional progression and energy curve (e.g. "Starts sparse/sad -> Builds tension -> Explosive release").
    8. A 'suno_style_prompt' that is optimized for Suno V5 to clone this style, using specific tags for instruments, vocal styles, vocal envelope, and dynamic shifts.
  `;

  try {
    // IMPORTANT: Flash models often do not support thinkingConfig, so we remove it here.
    const response = await ai.models.generateContent({
      model: AUDIO_MODEL_NAME,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema
      },
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          },
          { text: prompt }
        ]
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Analysis returned empty response");
    
    try {
      return JSON.parse(cleanJson(jsonText)) as AudioAnalysis;
    } catch (parseError) {
      console.error("JSON Parse Error:", jsonText);
      throw new Error("Failed to parse AI response. Try a clearer audio file.");
    }
  } catch (error: any) {
    console.error("Audio Analysis Error:", error);
    if (error.message?.includes('400')) {
      throw new Error("Audio file format not supported or file too large/corrupt.");
    }
    if (error.message?.includes('429')) {
      throw new Error("System is busy (Rate Limit). Please wait a moment.");
    }
    throw new Error("Failed to analyze audio. Please try a shorter clip.");
  }
};
