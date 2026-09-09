// =====================================================
// Ricochet Arcade HD — Audio System (Web Audio API)
// Port from C++ SFML procedural audio
// =====================================================

class AudioManager {
    constructor() {
        this.ctx = null;
        this.bgmElement = null;
        this.initialized = false;
        this.bgmPlaying = false;
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

    // Procedural brick/hit sound — port from C++ createBrickSoundBuffer
    // Retro arcade sweep: high pitch to low pitch (pew!)
    playBrickSound(pitch = 1.0) {
        if (!this.ctx) return;
        this.resume();

        const sampleRate = this.ctx.sampleRate;
        const duration = 0.08; // 80ms retro burst
        const sampleCount = Math.floor(sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, sampleCount, sampleRate);
        const data = buffer.getChannelData(0);

        let phase = 0;
        for (let i = 0; i < sampleCount; i++) {
            const progress = i / sampleCount;
            // Retro arcade sweep: high pitch to low pitch
            const freq = (1000 - progress * 700) * pitch;
            // Linear fade-out envelope
            const envelope = 1 - progress;
            phase += 2 * Math.PI * freq / sampleRate;
            if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
            // Square wave chiptune sound
            const value = Math.sin(phase) > 0 ? 1 : -1;
            data[i] = value * 0.15 * envelope;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gainNode = this.ctx.createGain();
        gainNode.gain.value = 0.4;
        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        source.start();
    }

    // Play BGM from file
    playBGM(url) {
        if (this.bgmPlaying && this.bgmElement) return;
        try {
            if (!this.bgmElement) {
                this.bgmElement = new Audio(url);
                this.bgmElement.loop = true;
                this.bgmElement.volume = 0.5;
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
            } catch (e) {}
            this.bgmPlaying = false;
        }
        if (this.ctx) {
            try {
                this.ctx.close();
            } catch (e) {}
        }
    }

    tryResumeBGM() {
        if (this.bgmElement && !this.bgmPlaying) {
            const playPromise = this.bgmElement.play();
            if (playPromise) {
                playPromise.then(() => {
                    this.bgmPlaying = true;
                }).catch(() => {});
            }
        } else if (!this.bgmElement) {
            this.playBGM('assets/audio/bgm.ogg');
        }
        this.resume();
    }
}
