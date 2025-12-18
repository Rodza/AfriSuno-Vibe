
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { UploadIcon, DownloadIcon, WaveformIcon, LoaderIcon, CheckIcon, SparklesIcon, MusicIcon, InfoIcon } from './Icons';
import { processAudio } from '../services/audioEngine';
import { AudioProcessOptions, MasteringPreset } from '../types';

const WaveformPreview = ({ file }: { file: File }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!file || !canvasRef.current) return;

    const draw = async () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);

      const width = canvas.width;
      const height = canvas.height;
      const step = Math.ceil(channelData.length / width);
      const amp = height / 2;

      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      ctx.moveTo(0, amp);
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;

      for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
          const datum = channelData[i * step + j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
        ctx.lineTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
      }
      ctx.stroke();
    };

    draw();
  }, [file]);

  return (
    <div className="w-full h-24 bg-black/40 rounded-xl overflow-hidden border border-gray-800/50 mb-4">
      <canvas ref={canvasRef} width={800} height={100} className="w-full h-full opacity-60" />
    </div>
  );
};

export const AudioEnhancer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [options, setOptions] = useState<AudioProcessOptions>({
    intensity: 'medium',
    stereoWidth: 'normal',
    enableWarmth: true,
    enableFades: true,
    enableNaturalizer: true,
    exportFormat: 'mp3',
    preset: 'balanced',
    creativeFx: {
      chorus: 0,
      phaser: 0,
      flanger: 0
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    "Analyzing spectral fingerprint...",
    "Applying modulation FX chain...",
    "De-essing and smoothing sibilance...",
    "Removing metallic AI resonances...",
    "Injecting harmonic tube warmth...",
    "Final brickwall limiting..."
  ];

  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      let i = 0;
      setProcessingStep(steps[0]);
      interval = setInterval(() => {
        i = (i + 1) % steps.length;
        setProcessingStep(steps[i]);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.type.startsWith('audio/')) {
        alert("Please upload a valid audio file.");
        return;
      }
      setFile(selectedFile);
      setProcessedBlob(null);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const blob = await processAudio(file, options);
      setProcessedBlob(blob);
    } catch (error) {
      console.error("Processing failed", error);
      alert("Failed to process audio. Format might be incompatible.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    const url = URL.createObjectURL(processedBlob);
    const a = document.createElement('a');
    a.href = url;
    const ext = options.exportFormat;
    a.download = `AfriSuno_Enhanced_${file?.name.replace(/\.[^/.]+$/, "")}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const applyPreset = (preset: MasteringPreset) => {
    const newOptions: AudioProcessOptions = { ...options, preset };
    // Reset creative FX on preset change for safety
    const resetCreative = { chorus: 0, phaser: 0, flanger: 0 };
    
    if (preset === 'pop') {
      newOptions.intensity = 'high';
      newOptions.stereoWidth = 'wide';
      newOptions.enableWarmth = true;
      newOptions.creativeFx = resetCreative;
    } else if (preset === 'electronic') {
      newOptions.intensity = 'high';
      newOptions.stereoWidth = 'wide';
      newOptions.enableWarmth = true;
      newOptions.creativeFx = { ...resetCreative, chorus: 0.2 }; // Subtle width
    } else if (preset === 'rock') {
      newOptions.intensity = 'medium';
      newOptions.stereoWidth = 'normal';
      newOptions.enableWarmth = true;
      newOptions.creativeFx = resetCreative;
    } else if (preset === 'lofi') {
      newOptions.intensity = 'low';
      newOptions.stereoWidth = 'normal';
      newOptions.enableWarmth = true;
      newOptions.creativeFx = { ...resetCreative, flanger: 0.3 }; // Subtle wobble
    } else {
      newOptions.intensity = 'medium';
      newOptions.stereoWidth = 'normal';
      newOptions.enableWarmth = true;
      newOptions.creativeFx = resetCreative;
    }
    setOptions(newOptions);
  };

  const updateCreativeFx = (type: 'chorus' | 'phaser' | 'flanger', val: number) => {
    setOptions({
      ...options,
      creativeFx: {
        ...options.creativeFx,
        [type]: val
      }
    });
  };

  return (
    <div className="bg-suno-card border border-gray-800 rounded-2xl p-6 shadow-xl animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-900/30 rounded-lg">
           <WaveformIcon className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Vibe Engine Enhancer</h2>
          <p className="text-gray-400 text-sm">Remove AI "Robotic" artifacts and master your tracks.</p>
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
          <p className="text-gray-300 font-medium">Drop your Suno track here</p>
          <p className="text-xs text-gray-500 mt-2">Supports high-res WAV, AIFF, MP3</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-black/30 p-4 rounded-xl border border-gray-800">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-suno-accent/20 rounded-lg flex items-center justify-center">
                   <MusicIcon className="w-5 h-5 text-suno-accent" />
                 </div>
                 <div>
                   <p className="text-white font-medium truncate max-w-[200px] sm:max-w-xs">{file.name}</p>
                   <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB • RAW INPUT</p>
                 </div>
               </div>
               <button onClick={() => { setFile(null); setProcessedBlob(null); }} className="text-xs text-red-400 hover:text-red-300 font-medium">Clear</button>
             </div>
             <WaveformPreview file={file} />
          </div>

          {!processedBlob ? (
            <div className="space-y-6">
               {/* Quick Presets */}
               <div className="space-y-2">
                 <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest">Mastering Target</label>
                 <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                   {(['balanced', 'pop', 'electronic', 'rock', 'lofi'] as MasteringPreset[]).map(p => (
                     <button
                       key={p}
                       onClick={() => applyPreset(p)}
                       className={`py-2 rounded-lg text-xs font-bold border transition-all capitalize ${
                         options.preset === p ? 'bg-suno-accent border-suno-accent text-white' : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-600'
                       }`}
                     >
                       {p}
                     </button>
                   ))}
                 </div>
               </div>

               {/* Creative FX Rack (New) */}
               <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 p-4 rounded-xl border border-gray-700">
                  <h4 className="text-xs font-bold text-gray-300 uppercase mb-4 flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4" /> Creative FX Chain
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase text-gray-500 font-bold flex justify-between">
                         Chorus <span>{Math.round(options.creativeFx.chorus * 100)}%</span>
                       </label>
                       <input 
                          type="range" min="0" max="1" step="0.1" 
                          value={options.creativeFx.chorus} 
                          onChange={(e) => updateCreativeFx('chorus', parseFloat(e.target.value))}
                          className="w-full accent-purple-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase text-gray-500 font-bold flex justify-between">
                         Phaser <span>{Math.round(options.creativeFx.phaser * 100)}%</span>
                       </label>
                       <input 
                          type="range" min="0" max="1" step="0.1" 
                          value={options.creativeFx.phaser} 
                          onChange={(e) => updateCreativeFx('phaser', parseFloat(e.target.value))}
                          className="w-full accent-blue-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase text-gray-500 font-bold flex justify-between">
                         Flanger <span>{Math.round(options.creativeFx.flanger * 100)}%</span>
                       </label>
                       <input 
                          type="range" min="0" max="1" step="0.1" 
                          value={options.creativeFx.flanger} 
                          onChange={(e) => updateCreativeFx('flanger', parseFloat(e.target.value))}
                          className="w-full accent-pink-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                       />
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Voice Naturalizer Toggle */}
                 <div className="bg-gray-900/40 p-3 rounded-xl border border-gray-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Vocal Naturalizer II</p>
                      <p className="text-[10px] text-gray-400">Removes robotic frequencies.</p>
                    </div>
                    <button 
                      onClick={() => setOptions({...options, enableNaturalizer: !options.enableNaturalizer})}
                      className={`w-10 h-5 rounded-full relative transition-colors ${options.enableNaturalizer ? 'bg-green-600' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${options.enableNaturalizer ? 'left-6' : 'left-1'}`} />
                    </button>
                 </div>

                 {/* Export Format Selector */}
                 <div className="bg-gray-900/40 p-3 rounded-xl border border-gray-800 flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-400">Format</label>
                    <div className="flex gap-1">
                      {['mp3', 'wav'].map(f => (
                        <button 
                          key={f} 
                          onClick={() => setOptions({...options, exportFormat: f as any})} 
                          className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${options.exportFormat === f ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                 </div>
               </div>

               <Button 
                 onClick={handleProcess} 
                 isLoading={isProcessing} 
                 className="w-full h-14 text-lg font-bold tracking-tight shadow-2xl bg-gradient-to-r from-suno-accent to-purple-600 hover:from-purple-600 hover:to-suno-accent transition-all"
               >
                 {isProcessing ? (
                   <div className="flex flex-col items-center">
                     <span className="text-sm">DSP Pipeline Active</span>
                     <span className="text-[10px] font-mono opacity-60 mt-1">{processingStep}</span>
                   </div>
                 ) : 'Run Audio Engine'}
               </Button>
            </div>
          ) : (
            <div className="bg-green-900/10 border border-green-900/30 rounded-xl p-8 text-center animate-in zoom-in-95 duration-500">
               <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                 <CheckIcon className="w-8 h-8 text-green-400" />
               </div>
               <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Audio Enhanced</h3>
               <p className="text-gray-400 text-sm mb-6">Dynamics processed. FX applied. Artifacts removed.</p>
               <div className="flex gap-4 justify-center">
                 <Button onClick={handleDownload} className="bg-green-600 hover:bg-green-700 px-8">
                   <DownloadIcon className="w-5 h-5 mr-2" />
                   Download {options.exportFormat.toUpperCase()}
                 </Button>
                 <Button variant="secondary" onClick={() => setProcessedBlob(null)}>Enhance Another</Button>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
