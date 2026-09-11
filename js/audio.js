// =====================================================
// Ricochet Arcade HD — Audio System (Web Audio API)
// Port from C++ SFML procedural audio
// Enhanced with multiple sound variants
// =====================================================

class AudioManager {
    constructor() {
        this.ctx = null;
        this.bgmElement = null;
        this.initialized = false;
        this.bgmPlaying = false;
        this.volume = 0.5;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('[AudioManager] Web Audio API not available:', e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(val) {
        this.volume = val / 100;
        if (this.bgmElement) {
            this.bgmElement.volume = this.volume * 0.5;
        }
    }

    // Helper: create a gain node with volume
    _createGain(vol = 1.0) {
        if (!this.ctx) return null;
        const gainNode = this.ctx.createGain();
        gainNode.gain.value = this.volume * vol;
        gainNode.connect(this.ctx.destination);
        return gainNode;
    }

    // Helper: play a buffer through gain
    _playBuffer(buffer, vol = 1.0) {
        if (!this.ctx) return;
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gainNode = this._createGain(vol);
        source.connect(gainNode);
        source.start();
    }

    // Procedural brick/hit sound — port from C++ createBrickSoundBuffer
    playBrickSound(pitch = 1.0) {
        if (!this.ctx) return;
        this.resume();

        const sampleRate = this.ctx.sampleRate;
        const duration = 0.08;
        const sampleCount = Math.floor(sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, sampleCount, sampleRate);
        const data = buffer.getChannelData(0);

        let phase = 0;
        for (let i = 0; i < sampleCount; i++) {
            const progress = i / sampleCount;
            const freq = (1000 - progress * 700) * pitch;
            const envelope = 1 - progress;
            phase += 2 * Math.PI * freq / sampleRate;
            if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
            const value = Math.sin(phase) > 0 ? 1 : -1;
            data[i] = value * 0.15 * envelope;
        }

        this._playBuffer(buffer);
    }

    // Wall bounce — lower pitch, shorter, thuddy
    playWallBounce() {
        if (!this.ctx) return;
        this.resume();

        const sampleRate = this.ctx.sampleRate;
        const duration = 0.05;
        const sampleCount = Math.floor(sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, sampleCount, sampleRate);
        const data = buffer.getChannelData(0);

        let phase = 0;
        for (let i = 0; i < sampleCount; i++) {
            const progress = i / sampleCount;
            const freq = 400 - progress * 200;
            const envelope = (1 - progress) * (1 - progress);
            phase += 2 * Math.PI * freq / sampleRate;
            if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
            data[i] = Math.sin(phase) * 0.12 * envelope;
        }

        this._playBuffer(buffer);
    }

    // Powerup collected — ascending chirp with harmonics
    playPowerupSound() {
        if (!this.ctx) return;
        this.resume();

        const sampleRate = this.ctx.sampleRate;
        const duration = 0.25;
        const sampleCount = Math.floor(sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, sampleCount, sampleRate);
        const data = buffer.getChannelData(0);

        let phase1 = 0, phase2 = 0;
        for (let i = 0; i < sampleCount; i++) {
            const progress = i / sampleCount;
            const freq1 = 600 + progress * 1200;
            const freq2 = freq1 * 1.5;
            const envelope = progress < 0.1 ? progress / 0.1 : (1 - (progress - 0.1) / 0.9);

            phase1 += 2 * Math.PI * freq1 / sampleRate;
            phase2 += 2 * Math.PI * freq2 / sampleRate;
            if (phase1 > 2 * Math.PI) phase1 -= 2 * Math.PI;
            if (phase2 > 2 * Math.PI) phase2 -= 2 * Math.PI;

            data[i] = (Math.sin(phase1) * 0.12 + Math.sin(phase2) * 0.06) * envelope;
        }

        this._playBuffer(buffer);
    }

    // Combo sound — pitch increases with combo level, sparkly
    playComboSound(comboLevel = 1) {
        if (!this.ctx) return;
        this.resume();

        const sampleRate = this.ctx.sampleRate;
        const duration = 0.12;
        const sampleCount = Math.floor(sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, sampleCount, sampleRate);
        const data = buffer.getChannelData(0);

        const basePitch = 800 + Math.min(comboLevel, 10) * 120;
        let phase1 = 0, phase2 = 0;
        for (let i = 0; i < sampleCount; i++) {
            const progress = i / sampleCount;
            const freq1 = basePitch + progress * 400;
            const freq2 = basePitch * 2;
            const envelope = (1 - progress);

            phase1 += 2 * Math.PI * freq1 / sampleRate;
            phase2 += 2 * Math.PI * freq2 / sampleRate;
            if (phase1 > 2 * Math.PI) phase1 -= 2 * Math.PI;
            if (phase2 > 2 * Math.PI) phase2 -= 2 * Math.PI;

            data[i] = (Math.sin(phase1) * 0.1 + Math.sin(phase2) * 0.05) * envelope;
        }

        this._playBuffer(buffer);
    }

    // Level clear — multi-tone triumph fanfare
    playLevelClear() {
        if (!this.ctx) return;
        this.resume();

        const sampleRate = this.ctx.sampleRate;
        const duration = 0.6;
        const sampleCount = Math.floor(sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, sampleCount, sampleRate);
        const data = buffer.getChannelData(0);

        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        const noteLen = sampleCount / notes.length;

        for (let i = 0; i < sampleCount; i++) {
            const noteIdx = Math.min(Math.floor(i / noteLen), notes.length - 1);
            const noteProgress = (i - noteIdx * noteLen) / noteLen;
            const freq = notes[noteIdx];
            const envelope = noteProgress < 0.05 ? noteProgress / 0.05 : Math.max(0, 1 - (noteProgress - 0.05) * 1.1);

            const t = i / sampleRate;
            const val = Math.sin(2 * Math.PI * freq * t) * 0.1
                + Math.sin(2 * Math.PI * freq * 2 * t) * 0.04
                + Math.sin(2 * Math.PI * freq * 3 * t) * 0.02;
            data[i] = val * envelope;
        }

        this._playBuffer(buffer);
    }

    // Game over — descending tones, somber
    playGameOver() {
        if (!this.ctx) return;
        this.resume();

        const sampleRate = this.ctx.sampleRate;
        const duration = 0.8;
        const sampleCount = Math.floor(sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, sampleCount, sampleRate);
        const data = buffer.getChannelData(0);

        const notes = [440, 370, 311, 220]; // A4, F#4, Eb4, A3
        const noteLen = sampleCount / notes.length;

        for (let i = 0; i < sampleCount; i++) {
            const noteIdx = Math.min(Math.floor(i / noteLen), notes.length - 1);
            const noteProgress = (i - noteIdx * noteLen) / noteLen;
            const freq = notes[noteIdx];
            const globalEnv = 1 - (i / sampleCount) * 0.5;
            const noteEnv = noteProgress < 0.05 ? noteProgress / 0.05 : Math.max(0, 1 - (noteProgress - 0.05) * 0.8);

            const t = i / sampleRate;
            const val = Math.sin(2 * Math.PI * freq * t) * 0.12
                + Math.sin(2 * Math.PI * freq * 0.5 * t) * 0.06;
            data[i] = val * noteEnv * globalEnv;
        }

        this._playBuffer(buffer);
    }

    // Pause — soft click/toggle
    playPauseSound() {
        if (!this.ctx) return;
        this.resume();

        const sampleRate = this.ctx.sampleRate;
        const duration = 0.06;
        const sampleCount = Math.floor(sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, sampleCount, sampleRate);
        const data = buffer.getChannelData(0);

        let phase = 0;
        for (let i = 0; i < sampleCount; i++) {
            const progress = i / sampleCount;
            const freq = 1200 - progress * 600;
            const envelope = (1 - progress) * (1 - progress);
            phase += 2 * Math.PI * freq / sampleRate;
            if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
            data[i] = Math.sin(phase) * 0.08 * envelope;
        }

        this._playBuffer(buffer);
    }

    // Life lost — deep rumble with impact
    playLifeLost() {
        if (!this.ctx) return;
        this.resume();

        const sampleRate = this.ctx.sampleRate;
        const duration = 0.35;
        const sampleCount = Math.floor(sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, sampleCount, sampleRate);
        const data = buffer.getChannelData(0);

        let phase1 = 0, phase2 = 0;
        for (let i = 0; i < sampleCount; i++) {
            const progress = i / sampleCount;
            const freq1 = 120 - progress * 60;
            const freq2 = 80 - progress * 40;
            const envelope = (1 - progress);
            const noise = (Math.random() - 0.5) * 0.04 * (1 - progress);

            phase1 += 2 * Math.PI * freq1 / sampleRate;
            phase2 += 2 * Math.PI * freq2 / sampleRate;
            if (phase1 > 2 * Math.PI) phase1 -= 2 * Math.PI;
            if (phase2 > 2 * Math.PI) phase2 -= 2 * Math.PI;

            data[i] = (Math.sin(phase1) * 0.15 + Math.sin(phase2) * 0.1 + noise) * envelope;
        }

        this._playBuffer(buffer);
    }

    // Paddle bounce — mid-tone ping
    playPaddleBounce() {
        if (!this.ctx) return;
        this.resume();

        const sampleRate = this.ctx.sampleRate;
        const duration = 0.06;
        const sampleCount = Math.floor(sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, sampleCount, sampleRate);
        const data = buffer.getChannelData(0);

        let phase = 0;
        for (let i = 0; i < sampleCount; i++) {
            const progress = i / sampleCount;
            const freq = 700 - progress * 300;
            const envelope = (1 - progress);
            phase += 2 * Math.PI * freq / sampleRate;
            if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
            data[i] = Math.sin(phase) * 0.12 * envelope;
        }

        this._playBuffer(buffer);
    }

    playBGM(url) {
        if (this.bgmPlaying && this.bgmElement) return;
        try {
            if (!this.bgmElement) {
                this.bgmElement = new Audio(url);
                this.bgmElement.loop = true;
                this.bgmElement.volume = this.volume * 0.5;
            }
            const playPromise = this.bgmElement.play();
            if (playPromise) {
                playPromise.then(() => {
                    this.bgmPlaying = true;
                }).catch(e => {
                    console.warn('[AudioManager] BGM autoplay blocked, will retry on interaction:', e);
                });
            }
        } catch (e) {
            console.warn('[AudioManager] Could not load BGM:', e);
        }
    }

    stopBGM() {
        if (this.bgmElement) {
            try {
                this.bgmElement.pause();
                this.bgmElement.currentTime = 0;
                this.bgmElement.remove();
                this.bgmElement = null;
            } catch (e) { }
            this.bgmPlaying = false;
        }
        if (this.ctx) {
            try {
                this.ctx.close();
            } catch (e) { }
        }
    }

    tryResumeBGM() {
        if (this.bgmElement && !this.bgmPlaying) {
            const playPromise = this.bgmElement.play();
            if (playPromise) {
                playPromise.then(() => {
                    this.bgmPlaying = true;
                }).catch(() => { });
            }
        } else if (!this.bgmElement) {
            this.playBGM('assets/audio/bgm.ogg');
        }
        this.resume();
    }
}
