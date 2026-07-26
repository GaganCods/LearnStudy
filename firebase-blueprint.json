export type SoundType = "soft_bell" | "school_bell" | "digital_beep" | "piano" | "nature" | "chime" | "rain" | "forest" | "notification_tone" | "bell" | "harp" | "digital" | "alarm";

let bgAudioContext: AudioContext | null = null;
let bgSourceNodes: (AudioBufferSourceNode | OscillatorNode | ScriptProcessorNode | AudioWorkletNode | any)[] = [];

export function playPomodoroSound(type: string, volumePercent: number = 50) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const volume = volumePercent / 100;
    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(volume, ctx.currentTime);
    mainGain.connect(ctx.destination);

    // Simplistic synthesized sounds
    const playOsc = (freq: number, type: OscillatorType, delay: number, duration: number, vol: number = 1, decay: boolean = true) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      const startTime = ctx.currentTime + delay;
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.setValueAtTime(vol * 0.25, startTime);
      if (decay) {
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      } else {
        gainNode.gain.setValueAtTime(0, startTime + duration);
      }
      osc.connect(gainNode);
      gainNode.connect(mainGain);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    switch (type) {
      case "soft_bell":
      case "bell":
        [880, 1200, 1500].forEach((f, i) => playOsc(f, "sine", 0, 2.0 / (i + 1)));
        break;
      case "school_bell":
      case "alarm":
        for (let i = 0; i < 10; i++) playOsc(600, "triangle", i * 0.1, 0.08, 1, false);
        break;
      case "digital_beep":
      case "digital":
        playOsc(987.77, "square", 0, 0.1);
        playOsc(987.77, "square", 0.2, 0.1);
        break;
      case "piano":
      case "harp":
        [261.63, 329.63, 392.00, 523.25].forEach((f, i) => playOsc(f, "sine", i * 0.15, 1.5));
        break;
      case "chime":
        playOsc(1046.5, "sine", 0, 1);
        playOsc(1318.5, "sine", 0.1, 1);
        playOsc(1567.9, "sine", 0.2, 2);
        break;
      case "notification_tone":
        playOsc(523.25, "sine", 0, 0.2);
        playOsc(659.25, "sine", 0.15, 0.4);
        break;
      case "nature":
      case "rain":
      case "forest":
      default:
        // Generic chime fallback
        playOsc(800, "sine", 0, 1);
        break;
    }
  } catch (error) {
    console.warn("Failed to play Web Audio sound", error);
  }
}

export function startBackgroundSound(type: string, volumePercent: number = 50) {
  stopBackgroundSound();
  if (type === "none" || volumePercent === 0) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    bgAudioContext = new AudioContextClass();
    const volume = volumePercent / 100;
    const mainGain = bgAudioContext.createGain();
    mainGain.gain.setValueAtTime(volume * 0.2, bgAudioContext.currentTime); // keep bg sounds a bit quieter
    mainGain.connect(bgAudioContext.destination);

    // Simple noise generator for white_noise, rain, ocean
    const bufferSize = bgAudioContext.sampleRate * 2; 
    const noiseBuffer = bgAudioContext.createBuffer(1, bufferSize, bgAudioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      if (type === "white_noise") {
        output[i] = Math.random() * 2 - 1;
      } else if (type === "rain") {
        // pinkish noise
        let white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; 
      } else { // ocean / forest / cafe mock
        let white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
      }
    }

    const noiseSource = bgAudioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Filter based on type
    const filter = bgAudioContext.createBiquadFilter();
    if (type === "white_noise") {
      filter.type = "lowpass";
      filter.frequency.value = 10000;
    } else if (type === "rain") {
      filter.type = "lowpass";
      filter.frequency.value = 1000;
    } else if (type === "ocean") {
      filter.type = "lowpass";
      filter.frequency.value = 400;
      // Add a slow LFO to volume for waves
      const lfo = bgAudioContext.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.1; // 10s period
      const lfoGain = bgAudioContext.createGain();
      lfoGain.gain.value = 0.5;
      lfo.connect(lfoGain);
      lfoGain.connect(mainGain.gain);
      lfo.start();
      bgSourceNodes.push(lfo);
    } else {
      filter.type = "lowpass";
      filter.frequency.value = 2000;
    }

    noiseSource.connect(filter);
    filter.connect(mainGain);
    noiseSource.start();
    bgSourceNodes.push(noiseSource);

  } catch (err) {
    console.warn("Background sound failed", err);
  }
}
let lastOut = 0;

export function stopBackgroundSound() {
  if (bgSourceNodes.length > 0) {
    bgSourceNodes.forEach(node => {
      try { node.stop(); } catch(e) {}
      try { node.disconnect(); } catch(e) {}
    });
    bgSourceNodes = [];
  }
  if (bgAudioContext) {
    try { bgAudioContext.close(); } catch(e) {}
    bgAudioContext = null;
  }
}

export function speakVoiceReminder(text: string) {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
}
