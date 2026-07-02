// Sound synthesizer using Web Audio API for Pomodoro notifications

export type SoundType = "bell" | "harp" | "digital" | "alarm";

export function playPomodoroSound(type: string, volumePercent: number = 50) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const volume = volumePercent / 100;

    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(volume, ctx.currentTime);
    mainGain.connect(ctx.destination);

    switch (type) {
      case "bell": {
        // High-frequency ringing bell chime
        const frequencies = [880, 1200, 1500, 1800];
        frequencies.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(f, ctx.currentTime);

          // Staggered decay
          const duration = 2.0 / (i + 1);
          gainNode.gain.setValueAtTime(0.3 / frequencies.length, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

          osc.connect(gainNode);
          gainNode.connect(mainGain);

          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + duration);
        });
        break;
      }

      case "harp": {
        // A series of arpeggiated melodic sine waves representing a zen harp
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C major chord arpeggio
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.12);

          const startTime = ctx.currentTime + index * 0.12;
          const duration = 1.2;

          gainNode.gain.setValueAtTime(0, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.25, startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

          osc.connect(gainNode);
          gainNode.connect(mainGain);

          osc.start(startTime);
          osc.stop(startTime + duration);
        });
        break;
      }

      case "digital": {
        // Double electronic beeps
        const beeps = [0, 0.2];
        beeps.forEach((delay) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = "square";
          osc.frequency.setValueAtTime(987.77, ctx.currentTime + delay); // B5 note

          const startTime = ctx.currentTime + delay;
          const duration = 0.08;

          gainNode.gain.setValueAtTime(0, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.15, startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

          osc.connect(gainNode);
          gainNode.connect(mainGain);

          osc.start(startTime);
          osc.stop(startTime + duration);
        });
        break;
      }

      case "alarm":
      default: {
        // Traditional loud retro alarm ringing
        for (let i = 0; i < 4; i++) {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(600, ctx.currentTime + i * 0.35);

          const startTime = ctx.currentTime + i * 0.35;
          const duration = 0.2;

          gainNode.gain.setValueAtTime(0, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.2, startTime);
          gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

          // Add a fast vibrato
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.setValueAtTime(12, ctx.currentTime);
          lfoGain.gain.setValueAtTime(15, ctx.currentTime);
          
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);

          osc.connect(gainNode);
          gainNode.connect(mainGain);

          lfo.start(startTime);
          osc.start(startTime);
          
          lfo.stop(startTime + duration);
          osc.stop(startTime + duration);
        }
        break;
      }
    }
  } catch (error) {
    console.warn("Failed to play Web Audio sound", error);
  }
}
