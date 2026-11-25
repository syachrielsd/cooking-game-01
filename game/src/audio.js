// All of the game's sound is synthesized with Web Audio — short envelopes on
// oscillators and a burst of filtered noise for the fryer. No audio files,
// so the game loads nothing. The context is created up front and only
// resumed inside a user gesture, the way browsers require.

export class SoundKit {
  constructor() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    this.ctx = AudioCtor ? new AudioCtor() : null;
    this.master = null;
    if (this.ctx) {
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
    }
  }

  unlock() {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  tone(freqFrom, freqTo, seconds, type = 'square', when = 0) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), t0 + seconds);
    gain.gain.setValueAtTime(1, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.02);
  }

  noiseBurst(seconds = 0.18, freq = 1800) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.7;
    source.connect(filter).connect(gain).connect(this.master);
    source.start(t0);
  }

  pickup() { this.tone(520, 760, 0.07, 'triangle'); }
  place() { this.tone(340, 240, 0.06, 'triangle'); }
  chop() { this.noiseBurst(0.06, 900); this.tone(190, 120, 0.05, 'square'); }
  sizzle() { this.noiseBurst(0.28, 2400); }
  ready() { this.tone(880, 880, 0.09, 'sine'); this.tone(1318, 1318, 0.14, 'sine', 0.09); }
  serve() { this.tone(660, 660, 0.08, 'triangle'); this.tone(880, 880, 0.08, 'triangle', 0.08); this.tone(1320, 1320, 0.16, 'triangle', 0.16); }
  mistake() { this.tone(220, 110, 0.22, 'sawtooth'); }
  strike() { this.tone(160, 70, 0.4, 'sawtooth'); this.noiseBurst(0.3, 300); }
}
