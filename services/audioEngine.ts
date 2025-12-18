
import { AudioProcessOptions } from "../types";
// @ts-ignore
import { Mp3Encoder } from '@breezystack/lamejs';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

/**
 * Ultra-Smooth Asymptotic Gain Reduction
 */
const makeSilkCurve = () => {
  const n_samples = 48000; 
  const curve = new Float32Array(n_samples);
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    if (Math.abs(x) < 0.7) {
      curve[i] = x;
    } else {
      const sign = x < 0 ? -1 : 1;
      const xabs = Math.abs(x);
      curve[i] = sign * (0.7 + Math.tanh(xabs - 0.7) * 0.25);
    }
  }
  return curve;
};

// --- CREATIVE FX HELPERS ---

const createChorus = (ctx: BaseAudioContext, input: AudioNode, intensity: number) => {
  if (intensity <= 0) return input;
  
  const splitter = ctx.createChannelSplitter(2);
  const merger = ctx.createChannelMerger(2);
  input.connect(splitter);

  const delayL = ctx.createDelay();
  const delayR = ctx.createDelay();
  delayL.delayTime.value = 0.02; // 20ms
  delayR.delayTime.value = 0.025; // 25ms

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 1.5; // Hz

  const gainL = ctx.createGain();
  const gainR = ctx.createGain();
  gainL.gain.value = 0.002 * intensity; // Depth
  gainR.gain.value = -0.002 * intensity; // Invert phase for width

  osc.connect(gainL).connect(delayL.delayTime);
  osc.connect(gainR).connect(delayR.delayTime);
  osc.start();

  splitter.connect(delayL, 0);
  splitter.connect(delayR, 1);
  delayL.connect(merger, 0, 0);
  delayR.connect(merger, 0, 1);

  // Blend dry/wet
  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.5 * intensity;
  merger.connect(wetGain);
  input.connect(wetGain); // Parallel blend

  return wetGain;
};

const createPhaser = (ctx: BaseAudioContext, input: AudioNode, intensity: number) => {
  if (intensity <= 0) return input;

  const filters = [];
  const stages = 4;
  
  let node = input;
  for (let i = 0; i < stages; i++) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'allpass';
    filter.frequency.value = 1000;
    node.connect(filter);
    node = filter;
    filters.push(filter);
  }

  const lfo = ctx.createOscillator();
  lfo.type = 'triangle';
  lfo.frequency.value = 0.5;
  
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 800 * intensity;
  
  lfo.connect(lfoGain);
  filters.forEach(f => lfoGain.connect(f.frequency));
  lfo.start();

  const mix = ctx.createGain();
  node.connect(mix);
  input.connect(mix);
  
  // Feedback
  const feedback = ctx.createGain();
  feedback.gain.value = 0.4 * intensity;
  node.connect(feedback);
  feedback.connect(filters[0]);

  return mix;
};

const createFlanger = (ctx: BaseAudioContext, input: AudioNode, intensity: number) => {
  if (intensity <= 0) return input;

  const delay = ctx.createDelay();
  delay.delayTime.value = 0.003; // 3ms

  const feedback = ctx.createGain();
  feedback.gain.value = 0.5 * intensity;

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.3;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.002 * intensity;

  lfo.connect(lfoGain).connect(delay.delayTime);
  lfo.start();

  input.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);

  const wet = ctx.createGain();
  wet.gain.value = 0.5;
  delay.connect(wet);
  input.connect(wet); // Mix

  return wet;
};

const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const data0 = buffer.getChannelData(0);
  const dataLength = data0.length;
  const bufferLength = 44 + dataLength * numChannels * bytesPerSample;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength * numChannels * bytesPerSample, true);
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
  view.setUint32(40, dataLength * numChannels * bytesPerSample, true);

  let offset = 44;
  for (let i = 0; i < dataLength; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
        const sample = buffer.getChannelData(channel)[i];
        let s = Math.max(-0.95, Math.min(0.95, sample));
        s = s < 0 ? s * 0x8000 : s * 0x7FFF;
        view.setInt16(offset, s, true);
        offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
};

const audioBufferToMp3 = (buffer: AudioBuffer): Blob => {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const kbps = 320; 

  const mp3encoder = new Mp3Encoder(channels, sampleRate, kbps);
  const samplesLeft = buffer.getChannelData(0);
  const samplesRight = channels > 1 ? buffer.getChannelData(1) : samplesLeft;
  
  const length = samplesLeft.length;
  const leftInt16 = new Int16Array(length);
  const rightInt16 = new Int16Array(length);

  for (let i = 0; i < length; i++) {
    const l = Math.max(-0.95, Math.min(0.95, samplesLeft[i]));
    leftInt16[i] = l < 0 ? l * 32768 : l * 32767;

    if (channels > 1) {
      const r = Math.max(-0.95, Math.min(0.95, samplesRight[i]));
      rightInt16[i] = r < 0 ? r * 32768 : r * 32767;
    }
  }

  const mp3Data: Int8Array[] = [];
  const sampleBlockSize = 1152; 

  for (let i = 0; i < length; i += sampleBlockSize) {
    const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
    const rightChunk = channels > 1 ? rightInt16.subarray(i, i + sampleBlockSize) : undefined;
    const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) mp3Data.push(mp3buf);
  }

  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) mp3Data.push(mp3buf);

  return new Blob(mp3Data, { type: "audio/mp3" });
};

export const processAudio = async (
  file: File,
  options: AudioProcessOptions
): Promise<Blob> => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const TARGET_SAMPLE_RATE = 48000;

  const config = {
    safetyHeadroom: -20.0,
    compThreshold: options.intensity === 'high' ? -28 : -24,
    compRatio: options.intensity === 'high' ? 2.5 : 1.5,
    finalGain: options.intensity === 'high' ? 15.0 : 13.0,
  };

  const lengthInFrames = Math.ceil(audioBuffer.duration * TARGET_SAMPLE_RATE);
  const offlineCtx = new OfflineAudioContext(2, lengthInFrames, TARGET_SAMPLE_RATE);

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  // --- CHAIN START ---
  const inputNode = offlineCtx.createGain();
  inputNode.gain.value = Math.pow(10, config.safetyHeadroom / 20);
  source.connect(inputNode);
  let chain: AudioNode = inputNode;

  const hpf = offlineCtx.createBiquadFilter();
  hpf.type = "highpass";
  hpf.frequency.value = 85; 
  hpf.Q.value = 0.707;
  chain.connect(hpf);
  chain = hpf;

  // 1. CREATIVE FX LAYER (Pre-Dynamics)
  if (options.creativeFx.chorus > 0) {
    // We break the chain here to insert chorus in parallel/series hybrid
    // The helper returns a mixed node
    // For simplicity in offline context, we treat it as an insert
    // Note: helpers create nodes in the offlineCtx
    // IMPORTANT: createChorus helper needs to be adapted to return the node 
    // but standard Web Audio connect returns destination. 
    // The helpers above attach to 'input' and return the output node.
    chain = createChorus(offlineCtx, chain, options.creativeFx.chorus);
  }
  if (options.creativeFx.phaser > 0) {
    chain = createPhaser(offlineCtx, chain, options.creativeFx.phaser);
  }
  if (options.creativeFx.flanger > 0) {
    chain = createFlanger(offlineCtx, chain, options.creativeFx.flanger);
  }

  // 2. SURGICAL NATURALIZER
  if (options.enableNaturalizer) {
    const notch1 = offlineCtx.createBiquadFilter();
    notch1.type = "peaking";
    notch1.frequency.value = 2800;
    notch1.Q.value = 4.0;
    notch1.gain.value = -5.0;

    const notch2 = offlineCtx.createBiquadFilter();
    notch2.type = "peaking";
    notch2.frequency.value = 4500;
    notch2.Q.value = 5.0;
    notch2.gain.value = -5.5;

    const notch3 = offlineCtx.createBiquadFilter();
    notch3.type = "peaking";
    notch3.frequency.value = 6200;
    notch3.Q.value = 6.0;
    notch3.gain.value = -4.0;

    const silkTilt = offlineCtx.createBiquadFilter();
    silkTilt.type = "highshelf";
    silkTilt.frequency.value = 8500;
    silkTilt.gain.value = -5.0;

    chain.connect(notch1);
    notch1.connect(notch2);
    notch2.connect(notch3);
    notch3.connect(silkTilt);
    chain = silkTilt;
  }

  // 3. TONAL SHAPING
  const lowShelf = offlineCtx.createBiquadFilter();
  lowShelf.type = "lowshelf";
  lowShelf.frequency.value = 180;
  lowShelf.gain.value = options.preset === 'electronic' ? 1.5 : 0.5;

  const highShelf = offlineCtx.createBiquadFilter();
  highShelf.type = "highshelf";
  highShelf.frequency.value = 11000;
  highShelf.gain.value = options.preset === 'pop' ? 1.5 : 0.5;

  chain.connect(lowShelf);
  lowShelf.connect(highShelf);
  chain = highShelf;

  // 4. SOFT ENVELOPE (Compressor)
  const comp = offlineCtx.createDynamicsCompressor();
  comp.threshold.value = config.compThreshold;
  comp.knee.value = 35;
  comp.ratio.value = config.compRatio;
  comp.attack.value = 0.040;
  comp.release.value = 0.250;
  chain.connect(comp);
  chain = comp;

  // 5. GAIN SMOOTHING
  if (options.enableWarmth) {
    const clipper = offlineCtx.createWaveShaper();
    clipper.curve = makeSilkCurve();
    chain.connect(clipper);
    chain = clipper;
  }

  // 6. FINAL LEVELING
  const makeup = offlineCtx.createGain();
  makeup.gain.value = Math.pow(10, config.finalGain / 20);
  chain.connect(makeup);

  const limiter = offlineCtx.createDynamicsCompressor();
  limiter.threshold.value = -2.0;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.15;
  makeup.connect(limiter);
  chain = limiter;

  // 7. FADES
  if (options.enableFades) {
    const fader = offlineCtx.createGain();
    fader.gain.setValueAtTime(0, 0);
    fader.gain.linearRampToValueAtTime(1, 0.8);
    const fadeOutStart = Math.max(0, audioBuffer.duration - 3.0);
    fader.gain.setValueAtTime(1, fadeOutStart);
    fader.gain.linearRampToValueAtTime(0, audioBuffer.duration);
    chain.connect(fader);
    chain = fader;
  }

  chain.connect(offlineCtx.destination);
  source.start();
  const renderedBuffer = await offlineCtx.startRendering();
  
  if (options.exportFormat === 'wav') {
    return audioBufferToWav(renderedBuffer);
  }
  
  return audioBufferToMp3(renderedBuffer);
};
