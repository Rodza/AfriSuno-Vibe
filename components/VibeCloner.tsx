
import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { UploadIcon, DNAIcon, LoaderIcon } from './Icons';
import { analyzeReferenceAudio } from '../services/gemini';
import { AudioAnalysis } from '../types';
import { CopyBlock } from './CopyBlock';

export const VibeCloner = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.type.startsWith('audio/')) {
        alert("Please upload a valid audio file (MP3/WAV).");
        return;
      }
      // Increased limit to 50MB because we now compress client-side
      if (selectedFile.size > 50 * 1024 * 1024) {
        alert("File too large. Please use a clip under 50MB.");
        return;
      }
      setFile(selectedFile);
      setAnalysis(null);
      setError(null);
    }
  };

  /**
   * Optimizes audio for AI analysis by:
   * 1. Resampling to 16kHz (AI doesn't need 44.1/48kHz for structure/key)
   * 2. Mixing to Mono
   * 3. Trimming to max 3 minutes
   * This drastically reduces payload size (e.g. 50MB -> ~2MB)
   */
  const optimizeAudioForAnalysis = async (originalFile: File): Promise<string> => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await originalFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Analysis Settings
    const TARGET_SAMPLE_RATE = 16000;
    const MAX_DURATION = 180; // 3 minutes max analysis
    const duration = Math.min(audioBuffer.duration, MAX_DURATION);
    const lengthInFrames = Math.floor(duration * TARGET_SAMPLE_RATE);

    // Render low-res version
    const offlineCtx = new OfflineAudioContext(1, lengthInFrames, TARGET_SAMPLE_RATE);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    
    const renderedBuffer = await offlineCtx.startRendering();
    
    // Convert to simplified WAV Blob
    const wavBlob = bufferToWavBlob(renderedBuffer);
    
    // Convert Blob to Base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(wavBlob);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error("Failed to encode optimized audio"));
        }
      };
      reader.onerror = reject;
    });
  };

  // Minimal WAV encoder for mono 16-bit files
  const bufferToWavBlob = (buffer: AudioBuffer): Blob => {
    const numChannels = 1;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const data = buffer.getChannelData(0);
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const wavDataLength = data.length * bytesPerSample;
    const bufferLength = 44 + wavDataLength;
    
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + wavDataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, wavDataLength, true);

    let offset = 44;
    for (let i = 0; i < data.length; i++) {
        const s = Math.max(-1, Math.min(1, data[i]));
        const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
        view.setInt16(offset, val, true);
        offset += 2;
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      setLoadingStage('Compressing & Optimizing (16kHz)...');
      // Yield to UI
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const base64 = await optimizeAudioForAnalysis(file);
      
      setLoadingStage('Extracting Sonic DNA & Tone Flow...');
      const result = await analyzeReferenceAudio(base64, 'audio/wav');
      setAnalysis(result);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to analyze audio. The model might be busy.");
    } finally {
      setIsAnalyzing(false);
      setLoadingStage('');
    }
  };

  return (
    <div className="bg-suno-card border border-gray-800 rounded-2xl p-6 shadow-xl animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-pink-900/30 rounded-lg">
           <DNAIcon className="w-6 h-6 text-pink-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Vibe Cloner</h2>
          <p className="text-gray-400 text-sm">Analyze tracks (up to 50MB) for Sonic DNA & Tone Flow.</p>
        </div>
      </div>

      {!file ? (
        <div 
          className="border-2 border-dashed border-gray-700 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-suno-accent hover:bg-suno-accent/5 transition-all group"
          onClick={() => fileInputRef.current?.click()}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
             <UploadIcon className="w-8 h-8 text-gray-400 group-hover:text-white" />
          </div>
          <p className="text-gray-300 font-medium">Upload Reference Track</p>
          <p className="text-xs text-gray-500 mt-2">Supports MP3/WAV (up to 50MB)</p>
        </div>
      ) : (
        <div className="space-y-6">
           {/* File Preview Header */}
           <div className="bg-black/30 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-white font-medium truncate max-w-[250px]">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              {!analysis && !isAnalyzing && (
                 <button onClick={() => setFile(null)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
              )}
           </div>

           {!analysis ? (
             <Button 
               onClick={handleAnalyze} 
               isLoading={isAnalyzing} 
               disabled={isAnalyzing}
               className="w-full h-14 bg-pink-600 hover:bg-pink-700 shadow-pink-900/20"
             >
               {isAnalyzing ? (
                 <div className="flex flex-col items-center">
                   <span className="text-xs uppercase tracking-widest opacity-70 mb-1">AI Processing</span>
                   <span className="font-bold">{loadingStage}</span>
                 </div>
               ) : "Analyze Vibe & Tone"}
             </Button>
           ) : (
             <div className="animate-in slide-in-from-bottom-8 duration-700 space-y-6">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                   <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 text-center">
                      <span className="block text-[10px] uppercase text-gray-500 font-bold">BPM</span>
                      <span className="text-lg font-mono text-pink-400">{analysis.bpm}</span>
                   </div>
                   <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 text-center">
                      <span className="block text-[10px] uppercase text-gray-500 font-bold">Key</span>
                      <span className="text-lg font-mono text-pink-400">{analysis.key}</span>
                   </div>
                   <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 text-center col-span-2">
                      <span className="block text-[10px] uppercase text-gray-500 font-bold">Signature</span>
                      <span className="text-sm font-medium text-white truncate">{analysis.genre_signature}</span>
                   </div>
                </div>

                {/* Tone Flow Section (New) */}
                <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-4 rounded-xl border border-pink-500/20">
                   <h4 className="text-xs font-bold text-pink-300 uppercase mb-2 flex items-center gap-2">
                     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10z"/><path d="M12 6v6l4 2"/></svg>
                     Tone Flow & Energy Curve
                   </h4>
                   <p className="text-sm text-gray-200 leading-relaxed italic">
                     "{analysis.tone_flow}"
                   </p>
                </div>

                {/* Instrument Stack */}
                <div className="bg-gray-900/30 p-4 rounded-xl border border-gray-800">
                   <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Instrument Stack</h4>
                   <div className="flex flex-wrap gap-2">
                      {analysis.instrument_stack.map((inst, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-800 text-xs text-gray-300 rounded border border-gray-700">
                          {inst}
                        </span>
                      ))}
                   </div>
                </div>

                {/* Structure Map */}
                <div className="bg-gray-900/30 p-4 rounded-xl border border-gray-800">
                   <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Structure Map</h4>
                   <div className="flex flex-wrap gap-2">
                      {analysis.structure_map.map((section, i) => (
                        <div key={i} className="flex items-center gap-2">
                           <span className="text-xs text-pink-400 font-mono">[{i+1}]</span>
                           <span className="text-xs text-white">{section}</span>
                           {i < analysis.structure_map.length - 1 && <span className="text-gray-700">→</span>}
                        </div>
                      ))}
                   </div>
                </div>

                {/* The Golden Prompt */}
                <div className="h-40">
                  <CopyBlock label="Suno V5 Style Clone Prompt" content={analysis.suno_style_prompt} />
                </div>

                <Button variant="secondary" onClick={() => { setFile(null); setAnalysis(null); }} className="w-full">
                   Analyze Another Track
                </Button>
             </div>
           )}

           {error && (
              <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-4 rounded-xl text-sm">
                {error}
              </div>
           )}
        </div>
      )}
    </div>
  );
};
