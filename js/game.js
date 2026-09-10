// Ricochet Arcade
// Port from C++ SFML to HTML5 Canvas
// Game By: Esmoocca

const GameState = { Menu: 0, Options: 1, Playing: 2, StageClear: 3, GameOver: 4 };

const V_WIDTH = 320;
const V_HEIGHT = 240;
const PLAY_AREA_WIDTH = 250;

function rgba(r, g, b, a = 255) {
    return `rgba(${r},${g},${b},${a / 255})`;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

function drawBeveledRect(ctx, x, y, w, h, bevel) {
    if (bevel > w / 2) bevel = w / 2;
    if (bevel > h / 2) bevel = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + bevel, y);
    ctx.lineTo(x + w - bevel, y);
    ctx.lineTo(x + w, y + bevel);
    ctx.lineTo(x + w, y + h - bevel);
    ctx.lineTo(x + w - bevel, y + h);
    ctx.lineTo(x + bevel, y + h);
    ctx.lineTo(x, y + h - bevel);
    ctx.lineTo(x, y + bevel);
    ctx.closePath();
}

function fillRoundedRect(ctx, x, y, w, h, r, fillColor, strokeColor, strokeWidth) {
    drawRoundedRect(ctx, x, y, w, h, r);
    ctx.fillStyle = fillColor;
    ctx.fill();
    if (strokeColor && strokeWidth) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
    }
}

function fillBeveledRect(ctx, x, y, w, h, bevel, fillColor, strokeColor, strokeWidth) {
    drawBeveledRect(ctx, x, y, w, h, bevel);
    ctx.fillStyle = fillColor;
    ctx.fill();
    if (strokeColor && strokeWidth) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
    }
}

function measureText(ctx, text, size) {
    ctx.font = `${size}px PixelFont, Consolas, monospace`;
    return ctx.measureText(text);
}

function drawText(ctx, text, x, y, size, color, align = 'left') {
    ctx.font = `${size}px PixelFont, Consolas, monospace`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
}

function textWidth(ctx, text, size) {
    ctx.font = `${size}px PixelFont, Consolas, monospace`;
    return ctx.measureText(text).width;
}

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audio = new AudioManager();

        // State
        this.state = GameState.Menu;
        this.menuSelectedIndex = 0;
        this.optionSelectedIndex = 0;

        // Paddle Colors
        this.paddleColors = [
            { label: 'BLUE', color: [0, 180, 255] },
            { label: 'ORANGE', color: [255, 110, 0] },
            { label: 'RED', color: [255, 60, 60] },
            { label: 'PURPLE', color: [200, 60, 255] },
            { label: 'WHITE', color: [255, 255, 255] },
        ];
        this.selectedColorIndex = 0;

        // Physics
        this.baseSpeed = 130;
        this.currentSpeed = 130;
        this.maxSpeed = 350;
        this.speedMultiplier = 1.0;
        this.ballVelocity = { x: 80, y: -130 };

        // Paddle
        this.paddleWidth = 36;
        this.paddleHeight = 6;
        this.paddleX = PLAY_AREA_WIDTH / 2;
        this.paddleY = 223;
        this.paddleBounceTimer = 0.3;

        // Ball
        this.ballRadius = 3.5;
        this.ballX = PLAY_AREA_WIDTH / 2 - 3.5;
        this.ballY = 208;

        // Bricks
        this.bricks = [];
        this.brickSpawnTimer = 0;

        // Score & Time
        this.score = 0;
        this.elapsedTime = 0;

        // Decorative menu bricks
        this.menuDecorBricks = [];
        this.menuAnimTimer = 0;

        // Rain
        this.rainDrops = [];

        // Ball trails
        this.ballTrails = [];

        // Particles
        this.particles = [];

        // Input
        this.keys = {};
        this.touchLeft = false;
        this.touchRight = false;

        // Timing
        this.lastTime = 0;
        this.isExiting = false;

        // Canvas sizing
        this.w = 854;
        this.h = 480;

        // Viewport for game world
        this.gameViewport = { x: 0, y: 0, w: 854, h: 480 };

        this.init();
    }

    init() {
        this.initMenuDecorBricks();
        this.initBricks();
        this.resetBallAndPaddle();
        this.initRain();
        this.setupInput();
        this.resizeCanvas();

        // Try playing BGM immediately upon app startup
        this.audio.init();
        this.audio.playBGM('assets/audio/bgm.ogg');

        // Audio init / resume on first interaction / visibility change as fallback for strict autoplay policies
        const initAudio = () => {
            this.audio.init();
            this.audio.tryResumeBGM();
        };
        document.addEventListener('touchstart', initAudio, { once: true });
        document.addEventListener('click', initAudio, { once: true });
        document.addEventListener('keydown', initAudio, { once: true });
        window.addEventListener('pageshow', initAudio);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                initAudio();
            }
        });

        window.addEventListener('resize', () => this.resizeCanvas());

        // Hide loading screen
        setTimeout(() => {
            const el = document.getElementById('loading');
            if (el) el.style.display = 'none';
        }, 500);
    }

    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const cw = window.innerWidth;
        const ch = window.innerHeight;
        this.canvas.width = cw * dpr;
        this.canvas.height = ch * dpr;
        this.canvas.style.width = cw + 'px';
        this.canvas.style.height = ch + 'px';

        // Use a fixed virtual window size and scale to fit
        // The virtual window is 854x480 (16:9) to match original defaults
        const targetAspect = 854 / 480;
        const screenAspect = cw / ch;

        if (screenAspect > targetAspect) {
            // Screen is wider — fit by height
            this.h = 480;
            this.w = 480 * screenAspect;
        } else {
            // Screen is taller — fit by width
            this.w = 854;
            this.h = 854 / screenAspect;
        }

        // Scale factor from virtual to canvas pixels
        this.scaleX = (cw * dpr) / this.w;
        this.scaleY = (ch * dpr) / this.h;

        // Compute game viewport (320x240 mapped with letterbox)
        const vAspect = V_WIDTH / V_HEIGHT;
        const wAspect = this.w / this.h;

        let gvW, gvH, gvX, gvY;
        if (wAspect > vAspect) {
            gvH = this.h;
            gvW = this.h * vAspect;
            gvX = (this.w - gvW) / 2;
            gvY = 0;
        } else {
            gvW = this.w;
            gvH = this.w / vAspect;
            gvX = 0;
            gvY = (this.h - gvH) / 2;
        }
        this.gameViewport = { x: gvX, y: gvY, w: gvW, h: gvH };
        this.gameScaleX = gvW / V_WIDTH;
        this.gameScaleY = gvH / V_HEIGHT;
    }

    // ─── Init Methods ─────────────────────────────────

    initMenuDecorBricks() {
        this.menuDecorBricks = [];
        const cx = V_WIDTH / 2;
        const cy = V_HEIGHT / 2 + 10;
        const rx = 110, ry = 85;
        const count = 18;
        const colors = [
            [0, 220, 255], [255, 120, 0], [255, 215, 0], [200, 50, 255]
        ];
        for (let i = 0; i < count; i++) {
            const angleDeg = 140 + (260 * i / (count - 1));
            const angleRad = angleDeg * Math.PI / 180;
            const bx = cx + rx * Math.cos(angleRad);
            const by = cy - ry * Math.sin(angleRad);
            this.menuDecorBricks.push({
                x: bx, y: by,
                targetX: bx, targetY: by,
                w: 14, h: 5, r: 1.2,
                color: colors[i % 4],
                scale: 1
            });
        }
    }

    initBricks() {
        this.bricks = [];
        const heartPattern = [
            [0,1,1,0,0,0,1,1,0],
            [1,2,2,1,0,1,2,2,1],
            [1,2,2,2,1,2,2,2,1],
            [1,2,2,2,2,2,2,2,1],
            [0,1,2,2,2,2,2,1,0],
            [0,0,1,2,2,2,1,0,0],
            [0,0,0,1,2,1,0,0,0],
            [0,0,0,0,1,0,0,0,0]
        ];
        const bw = 22, bh = 8, sx = 2, sy = 2;
        const totalW = 9 * (bw + sx) - sx;
        const startX = (PLAY_AREA_WIDTH - totalW) / 2;
        const startY = 20;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = heartPattern[row][col];
                if (cell > 0) {
                    this.bricks.push({
                        x: startX + col * (bw + sx) + bw / 2,
                        y: startY + row * (bh + sy) + bh / 2,
                        targetX: startX + col * (bw + sx) + bw / 2,
                        targetY: startY + row * (bh + sy) + bh / 2,
                        w: bw, h: bh,
                        color: cell === 1 ? [255, 40, 80] : [255, 105, 180],
                        points: cell === 1 ? 150 : 100,
                        destroyed: false,
                        scale: 1
                    });
                }
            }
        }
    }

    resetBallAndPaddle() {
        this.paddleX = PLAY_AREA_WIDTH / 2;
        this.paddleY = 223;
        this.ballX = PLAY_AREA_WIDTH / 2 - 3.5;
        this.ballY = 208;
        this.currentSpeed = this.baseSpeed;
        this.speedMultiplier = 1.0;
        this.ballVelocity = { x: 80, y: -this.currentSpeed };
        this.score = 0;
        this.elapsedTime = 0;
        this.brickSpawnTimer = 0;
        this.paddleBounceTimer = 0.3;
        this.particles = [];
        this.ballTrails = [];
    }

    initRain() {
        this.rainDrops = [];
        for (let i = 0; i < 250; i++) {
            this.rainDrops.push({
                x: Math.random() * V_WIDTH,
                y: Math.random() * V_HEIGHT,
                speed: 120 + Math.random() * 80,
                length: 4 + Math.random() * 4,
                alpha: 80 + Math.random() * 60
            });
        }
    }

    // ─── Input ────────────────────────────────────────

    setupInput() {
        // Keyboard
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.handleKeyDown(e.code);
            this.audio.tryResumeBGM();
        });
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Touch - Virtual Buttons
        const btnLeft = document.getElementById('btnLeft');
        const btnRight = document.getElementById('btnRight');

        if (btnLeft) {
            btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); this.touchLeft = true; btnLeft.classList.add('active'); this.audio.tryResumeBGM(); });
            btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); this.touchLeft = false; btnLeft.classList.remove('active'); });
            btnLeft.addEventListener('touchcancel', (e) => { this.touchLeft = false; btnLeft.classList.remove('active'); });
        }
        if (btnRight) {
            btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); this.touchRight = true; btnRight.classList.add('active'); this.audio.tryResumeBGM(); });
            btnRight.addEventListener('touchend', (e) => { e.preventDefault(); this.touchRight = false; btnRight.classList.remove('active'); });
            btnRight.addEventListener('touchcancel', (e) => { this.touchRight = false; btnRight.classList.remove('active'); });
        }

        // Touch - Canvas (for menus)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.audio.tryResumeBGM();
            const touch = e.touches[0];
            this.handleTap(touch.clientX, touch.clientY);
        });
    }

    handleTap(clientX, clientY) {
        // Convert client coordinates to virtual window coordinates
        const rect = this.canvas.getBoundingClientRect();
        const nx = (clientX - rect.left) / rect.width;
        const ny = (clientY - rect.top) / rect.height;
        const vx = nx * this.w;
        const vy = ny * this.h;

        if (this.state === GameState.Menu) {
            this.handleMenuTap(vx, vy);
        } else if (this.state === GameState.Options) {
            this.handleOptionsTap(vx, vy);
        } else if (this.state === GameState.StageClear || this.state === GameState.GameOver) {
            this.audio.init();
            this.audio.playBrickSound(0.9);
            this.state = GameState.Menu;
        }
    }

    handleMenuTap(vx, vy) {
        const w = this.w, h = this.h;
        const boxY = h * 0.32;
        const boxH = h * 0.45;
        const btnH = boxH * 0.27;

        // PLAY button area
        if (vy >= boxY + boxH * 0.1 && vy <= boxY + boxH * 0.35) {
            this.audio.init();
            this.audio.playBrickSound(0.9);
            this.resetBallAndPaddle();
            this.initBricks();
            this.state = GameState.Playing;
        }
        // OPTIONS button area
        else if (vy >= boxY + boxH * 0.37 && vy <= boxY + boxH * 0.62) {
            this.audio.init();
            this.audio.playBrickSound(0.9);
            this.state = GameState.Options;
        }
        // EXIT button area
        else if (vy >= boxY + boxH * 0.64 && vy <= boxY + boxH * 0.92) {
            this.audio.init();
            this.audio.playBrickSound(0.9);
            this.exitGame();
        }
    }

    exitGame() {
        if (this.isExiting) return;
        this.isExiting = true;

        if (this.audio) {
            this.audio.stopBGM();
        }

        try {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App && typeof window.Capacitor.Plugins.App.exitApp === 'function') {
                window.Capacitor.Plugins.App.exitApp();
                return;
            }
            if (typeof navigator !== 'undefined' && navigator.app && typeof navigator.app.exitApp === 'function') {
                navigator.app.exitApp();
                return;
            }
            if (window.Capacitor && typeof window.Capacitor.toNative === 'function') {
                window.Capacitor.toNative('App', 'exitApp', {});
                return;
            }
            if (typeof nw !== 'undefined' && nw.Window) {
                nw.Window.get().close();
                return;
            }
            if (window.chrome && window.chrome.webview) {
                window.chrome.webview.postMessage('exit');
                return;
            }
            window.close();
            window.open('', '_self').close();
        } catch (e) {
            console.error('Exit failed:', e);
            try { window.close(); } catch (err) {}
        }
    }

    handleOptionsTap(vx, vy) {
        const w = this.w, h = this.h;
        const boxX = (w - w * 0.65) / 2;
        const boxY = h * 0.18;
        const boxW = w * 0.65;
        const boxH = h * 0.68;

        // Paddle color - left arrow area
        if (vy >= boxY + h * 0.08 && vy <= boxY + h * 0.16) {
            if (vx < w / 2) {
                this.selectedColorIndex = (this.selectedColorIndex - 1 + this.paddleColors.length) % this.paddleColors.length;
            } else {
                this.selectedColorIndex = (this.selectedColorIndex + 1) % this.paddleColors.length;
            }
            this.audio.init();
            this.audio.playBrickSound(1.1);
        }

        // BACK button area
        if (vy >= boxY + boxH * 0.78) {
            this.audio.init();
            this.audio.playBrickSound(0.6);
            this.state = GameState.Menu;
        }
    }

    handleKeyDown(code) {
        if (this.state === GameState.Menu) {
            if (code === 'ArrowUp') {
                this.menuSelectedIndex = (this.menuSelectedIndex - 1 + 3) % 3;
                this.audio.init(); this.audio.playBrickSound(1.3);
            }
            if (code === 'ArrowDown') {
                this.menuSelectedIndex = (this.menuSelectedIndex + 1) % 3;
                this.audio.init(); this.audio.playBrickSound(1.3);
            }
            if (code === 'Enter' || code === 'Space') {
                this.audio.init(); this.audio.playBrickSound(0.9);
                if (this.menuSelectedIndex === 0) {
                    this.resetBallAndPaddle();
                    this.initBricks();
                    this.state = GameState.Playing;
                } else if (this.menuSelectedIndex === 1) {
                    this.state = GameState.Options;
                } else if (this.menuSelectedIndex === 2) {
                    this.exitGame();
                }
            }
        } else if (this.state === GameState.Options) {
            if (code === 'ArrowUp') {
                this.optionSelectedIndex = (this.optionSelectedIndex - 1 + 2) % 2;
                this.audio.init(); this.audio.playBrickSound(1.3);
            }
            if (code === 'ArrowDown') {
                this.optionSelectedIndex = (this.optionSelectedIndex + 1) % 2;
                this.audio.init(); this.audio.playBrickSound(1.3);
            }
            if (code === 'ArrowLeft') {
                if (this.optionSelectedIndex === 0) {
                    this.selectedColorIndex = (this.selectedColorIndex - 1 + this.paddleColors.length) % this.paddleColors.length;
                    this.audio.init(); this.audio.playBrickSound(1.1);
                }
            }
            if (code === 'ArrowRight') {
                if (this.optionSelectedIndex === 0) {
                    this.selectedColorIndex = (this.selectedColorIndex + 1) % this.paddleColors.length;
                    this.audio.init(); this.audio.playBrickSound(1.1);
                }
            }
            if (code === 'Enter' || code === 'Space') {
                if (this.optionSelectedIndex === 1) {
                    this.audio.init(); this.audio.playBrickSound(0.6);
                    this.state = GameState.Menu;
                }
            }
            if (code === 'Escape') {
                this.audio.init(); this.audio.playBrickSound(0.6);
                this.state = GameState.Menu;
            }
        } else if (this.state === GameState.Playing) {
            if (code === 'Escape') {
                this.audio.init(); this.audio.playBrickSound(0.6);
                this.state = GameState.Menu;
            }
        } else if (this.state === GameState.StageClear || this.state === GameState.GameOver) {
            if (code === 'Enter' || code === 'Space' || code === 'Escape') {
                this.audio.init(); this.audio.playBrickSound(0.9);
                this.state = GameState.Menu;
            }
        }
    }

    // ─── Update ───────────────────────────────────────

    update(dt) {
        if (this.isExiting) return;
        this.menuAnimTimer += dt;
        this.updateRain(dt);
        this.updateParticles(dt);

        // Show/hide virtual buttons
        const ctrlEl = document.getElementById('controls');
        if (ctrlEl) {
            ctrlEl.style.display = this.state === GameState.Playing ? 'block' : 'none';
        }

        if (this.state === GameState.Menu) {
            // Pulse decorative bricks
            for (let i = 0; i < this.menuDecorBricks.length; i++) {
                const b = this.menuDecorBricks[i];
                const pulse = Math.sin(this.menuAnimTimer * 2.5 + i * 0.3);
                b.scale = 0.9 + pulse * 0.15;
                const offset = Math.cos(this.menuAnimTimer * 1.5 + i * 0.4) * 1.5;
                b.y = b.targetY + offset;
            }
        }

        if (this.state !== GameState.Playing) return;

        this.elapsedTime += dt;

        // Paddle movement
        const paddleSpeed = 190;
        const halfPaddle = this.paddleWidth / 2;
        if ((this.keys['KeyA'] || this.keys['ArrowLeft'] || this.touchLeft) && this.paddleX > halfPaddle) {
            this.paddleX -= paddleSpeed * dt;
        }
        if ((this.keys['KeyD'] || this.keys['ArrowRight'] || this.touchRight) && this.paddleX < PLAY_AREA_WIDTH - halfPaddle) {
            this.paddleX += paddleSpeed * dt;
        }

        // Paddle bounce timer
        if (this.paddleBounceTimer < 0.3) {
            this.paddleBounceTimer += dt;
        }

        // Brick spawn animation
        if (this.brickSpawnTimer < 0.7) {
            this.brickSpawnTimer += dt;
            const centerX = PLAY_AREA_WIDTH / 2;
            const centerY = 20 + 4 * (8 + 2);

            for (const brick of this.bricks) {
                const dx = brick.targetX - centerX;
                const dy = brick.targetY - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const delay = (dist / 120) * 0.2;
                let t = this.brickSpawnTimer - delay;

                if (t < 0) {
                    brick.scale = 0;
                    brick.x = centerX;
                    brick.y = centerY;
                } else {
                    const animDur = 0.3;
                    let progress = Math.min(t / animDur, 1);
                    // easeOutBack
                    const x = progress - 1;
                    let ease = 1 + 2.70158 * x * x * x + 1.70158 * x * x;
                    if (ease < 0) ease = 0;
                    brick.scale = ease;
                    brick.x = centerX + (brick.targetX - centerX) * progress;
                    brick.y = centerY + (brick.targetY - centerY) * progress;
                }
            }
            // Lock ball on paddle
            this.ballX = this.paddleX - this.ballRadius;
            this.ballY = 208;
        } else {
            // Ensure bricks are in final position
            for (const brick of this.bricks) {
                brick.scale = 1;
                brick.x = brick.targetX;
                brick.y = brick.targetY;
            }

            // Move ball
            this.ballX += this.ballVelocity.x * dt;
            this.ballY += this.ballVelocity.y * dt;

            // Ball trail
            this.ballTrails.push({
                x: this.ballX + this.ballRadius,
                y: this.ballY + this.ballRadius,
                lifetime: 0,
                maxLifetime: 0.22,
                alpha: 180
            });

            // Update ball trails
            this.ballTrails = this.ballTrails.filter(t => {
                t.lifetime += dt;
                if (t.lifetime >= t.maxLifetime) return false;
                t.alpha = 180 * (1 - t.lifetime / t.maxLifetime);
                return true;
            });

            // Wall bounces
            if (this.ballX <= 0 || this.ballX >= PLAY_AREA_WIDTH - this.ballRadius * 2) {
                this.ballVelocity.x = -this.ballVelocity.x;
                if (this.ballX <= 0) this.ballX = 0;
                if (this.ballX >= PLAY_AREA_WIDTH - this.ballRadius * 2) this.ballX = PLAY_AREA_WIDTH - this.ballRadius * 2;
            }
            if (this.ballY <= 0) {
                this.ballVelocity.y = -this.ballVelocity.y;
                this.ballY = 0;
            }

            // Game over
            if (this.ballY >= V_HEIGHT) {
                this.state = GameState.GameOver;
                this.audio.init(); this.audio.playBrickSound(0.4);
                return;
            }

            // Speed increase helper
            const increaseSpeed = () => {
                if (this.currentSpeed < this.maxSpeed) {
                    this.currentSpeed *= 1.025;
                    this.speedMultiplier = this.currentSpeed / this.baseSpeed;
                    const mag = Math.sqrt(this.ballVelocity.x ** 2 + this.ballVelocity.y ** 2);
                    this.ballVelocity.x = (this.ballVelocity.x / mag) * this.currentSpeed;
                    this.ballVelocity.y = (this.ballVelocity.y / mag) * this.currentSpeed;
                }
            };

            // Paddle collision
            const ballCX = this.ballX + this.ballRadius;
            const ballCY = this.ballY + this.ballRadius;
            const pLeft = this.paddleX - this.paddleWidth / 2;
            const pRight = this.paddleX + this.paddleWidth / 2;
            const pTop = this.paddleY - this.paddleHeight / 2;
            const pBottom = this.paddleY + this.paddleHeight / 2;

            if (ballCX + this.ballRadius > pLeft && ballCX - this.ballRadius < pRight &&
                ballCY + this.ballRadius > pTop && ballCY - this.ballRadius < pBottom) {
                this.ballVelocity.y = -Math.abs(this.ballVelocity.y);
                increaseSpeed();
                this.paddleBounceTimer = 0;
                this.audio.init(); this.audio.playBrickSound(0.7);
            }

            // Brick collision
            for (const brick of this.bricks) {
                if (brick.destroyed) continue;
                const bLeft = brick.x - brick.w / 2;
                const bRight = brick.x + brick.w / 2;
                const bTop = brick.y - brick.h / 2;
                const bBottom = brick.y + brick.h / 2;

                if (ballCX + this.ballRadius > bLeft && ballCX - this.ballRadius < bRight &&
                    ballCY + this.ballRadius > bTop && ballCY - this.ballRadius < bBottom) {
                    brick.destroyed = true;
                    this.ballVelocity.y = -this.ballVelocity.y;
                    this.score += brick.points;
                    this.audio.init(); this.audio.playBrickSound(1.0);
                    this.spawnParticles(brick.x, brick.y, brick.color);
                    increaseSpeed();

                    if (this.bricks.every(b => b.destroyed)) {
                        this.state = GameState.StageClear;
                        this.audio.init(); this.audio.playBrickSound(1.5);
                    }
                    break;
                }
            }
        }
    }

    // ─── Rain ─────────────────────────────────────────

    updateRain(dt) {
        let rainMul = 1.2;
        if (this.state === GameState.Playing) rainMul = this.speedMultiplier;
        else if (this.state === GameState.StageClear || this.state === GameState.GameOver) rainMul = 0.8;

        for (const drop of this.rainDrops) {
            const speedY = drop.speed * (1 + (rainMul - 1) * 0.4);
            drop.y += speedY * dt;
            if (drop.y > V_HEIGHT) {
                drop.y = -10 - Math.random() * 15;
                drop.x = Math.random() * V_WIDTH;
                drop.speed = 120 + Math.random() * 80;
                drop.length = 4 + Math.random() * 4;
                drop.alpha = 80 + Math.random() * 60;
            }
        }
    }

    drawRain(ctx) {
        let activeCount = 20;
        if (this.state === GameState.Playing) {
            let t = (this.speedMultiplier - 1) / 1.7;
            t = Math.max(0, Math.min(1, t));
            activeCount = Math.floor(4 + t * 30);
        } else if (this.state === GameState.StageClear || this.state === GameState.GameOver) {
            activeCount = 10;
        }
        activeCount = Math.min(activeCount, this.rainDrops.length);

        for (let i = 0; i < activeCount; i++) {
            const d = this.rainDrops[i];
            ctx.fillStyle = rgba(170, 200, 255, d.alpha);
            ctx.fillRect(d.x, d.y, 1, d.length);
        }
    }

    // ─── Particles ────────────────────────────────────

    spawnParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            const angle = (Math.random() * 360) * Math.PI / 180;
            const speed = 40 + Math.random() * 60;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: [...color],
                alpha: 255,
                lifetime: 0,
                maxLifetime: 0.35 + Math.random() * 0.2
            });
        }
    }

    updateParticles(dt) {
        this.particles = this.particles.filter(p => {
            p.lifetime += dt;
            if (p.lifetime >= p.maxLifetime) return false;
            p.vy += 80 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.alpha = 255 * (1 - p.lifetime / p.maxLifetime);
            return true;
        });
    }

    drawParticles(ctx) {
        for (const p of this.particles) {
            ctx.fillStyle = rgba(p.color[0], p.color[1], p.color[2], p.alpha);
            ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
        }
    }

    // ─── Render ───────────────────────────────────────

    render() {
        if (this.isExiting) return;
        const ctx = this.ctx;
        const w = this.w;
        const h = this.h;

        ctx.save();
        ctx.scale(this.scaleX, this.scaleY);

        // Clear
        ctx.fillStyle = rgba(12, 14, 24);
        ctx.fillRect(0, 0, w, h);

        // ── GAME VIEW (320×240 virtual) ──
        ctx.save();
        ctx.translate(this.gameViewport.x, this.gameViewport.y);
        ctx.scale(this.gameScaleX, this.gameScaleY);

        // Scrolling cyber grid
        this.drawCyberGrid(ctx);

        // Menu decorative bricks
        if (this.state === GameState.Menu) {
            for (const b of this.menuDecorBricks) {
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.scale(b.scale, b.scale);
                fillRoundedRect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, b.r,
                    rgba(b.color[0], b.color[1], b.color[2]));
                ctx.restore();
            }
        }

        // Rain
        this.drawRain(ctx);

        // Game objects
        if (this.state === GameState.Playing || this.state === GameState.StageClear || this.state === GameState.GameOver) {
            this.drawGameObjects(ctx);
        }

        ctx.restore();

        // ── UI VIEW (virtual window size) ──
        this.drawUI(ctx, w, h);

        ctx.restore();
    }

    drawCyberGrid(ctx) {
        const gridSpeed = 25;
        const gridSpacing = 20;
        const startY = (this.menuAnimTimer * gridSpeed) % gridSpacing;
        const isMenu = this.state === GameState.Menu || this.state === GameState.Options;
        const alpha = isMenu ? 30 : 14;
        const color = rgba(0, 120, 255, alpha);

        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;

        // Horizontal lines
        for (let y = startY; y < V_HEIGHT; y += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(V_WIDTH, y);
            ctx.stroke();
        }
        // Vertical lines
        for (let x = 0; x < V_WIDTH; x += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, V_HEIGHT);
            ctx.stroke();
        }
    }

    drawGameObjects(ctx) {
        // Paddle shadow
        const visualYOffset = this.paddleBounceTimer < 0.3
            ? (2 * (1 - this.paddleBounceTimer / 0.3)) * Math.sin(this.paddleBounceTimer * 40)
            : 0;

        const pc = this.paddleColors[this.selectedColorIndex].color;

        // Shadow
        fillRoundedRect(ctx,
            this.paddleX - this.paddleWidth / 2 + 2,
            this.paddleY - this.paddleHeight / 2 + visualYOffset + 2,
            this.paddleWidth, this.paddleHeight, 2,
            rgba(10, 12, 16, 120));

        // Paddle
        fillRoundedRect(ctx,
            this.paddleX - this.paddleWidth / 2,
            this.paddleY - this.paddleHeight / 2 + visualYOffset,
            this.paddleWidth, this.paddleHeight, 2,
            rgba(pc[0], pc[1], pc[2]),
            rgba(0, 255, 255), 1);

        // Paddle highlight
        fillRoundedRect(ctx,
            this.paddleX - this.paddleWidth * 0.39,
            this.paddleY - this.paddleHeight * 0.21 + visualYOffset - 1,
            this.paddleWidth * 0.78, this.paddleHeight * 0.42, 1,
            rgba(255, 255, 255, 100));

        // Ball trails
        for (const t of this.ballTrails) {
            ctx.beginPath();
            ctx.arc(t.x, t.y, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = rgba(0, 220, 255, t.alpha);
            ctx.fill();
        }

        // Ball
        ctx.beginPath();
        ctx.arc(this.ballX + this.ballRadius, this.ballY + this.ballRadius, this.ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = rgba(255, 255, 200);
        ctx.fill();
        ctx.strokeStyle = rgba(0, 220, 255, 200);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Bricks
        for (const brick of this.bricks) {
            if (brick.destroyed) continue;
            ctx.save();
            ctx.translate(brick.x, brick.y);
            ctx.scale(brick.scale, brick.scale);

            // Main brick body
            fillRoundedRect(ctx, -brick.w / 2, -brick.h / 2, brick.w, brick.h, 2,
                rgba(brick.color[0], brick.color[1], brick.color[2]));

            // Glass highlight
            fillRoundedRect(ctx,
                -brick.w * 0.375, -brick.h * 0.225 - 1,
                brick.w * 0.75, brick.h * 0.45, 1,
                rgba(255, 255, 255, 90));

            ctx.restore();
        }

        // Particles
        this.drawParticles(ctx);
    }

    drawUI(ctx, w, h) {
        if (this.state === GameState.Playing || this.state === GameState.StageClear || this.state === GameState.GameOver) {
            this.drawHUD(ctx, w, h);
        }

        if (this.state === GameState.Menu) {
            this.drawMenu(ctx, w, h);
        } else if (this.state === GameState.Options) {
            this.drawOptions(ctx, w, h);
        }

        if (this.state === GameState.StageClear || this.state === GameState.GameOver) {
            this.drawOverlay(ctx, w, h);
        }
    }

    // ─── Menu ─────────────────────────────────────────

    drawMenu(ctx, w, h) {
        // Title shadow
        const titleSize = h * 0.085;
        const titleText = 'RICOCHET';
        const titleW = textWidth(ctx, titleText, titleSize);

        const shadowPulse = (Math.sin(this.menuAnimTimer * 3) + 1) * 0.5;
        const shadowAlpha = 100 + shadowPulse * 100;
        drawText(ctx, titleText, (w - titleW) / 2 + 2, h * 0.12 + 2, titleSize, rgba(0, 160, 255, shadowAlpha));
        drawText(ctx, titleText, (w - titleW) / 2, h * 0.12, titleSize, rgba(255, 215, 0));

        // Subtitle
        const subText = 'ARCADE BLOCK SIMULATOR';
        const subSize = h * 0.024;
        const subW = textWidth(ctx, subText, subSize);
        drawText(ctx, subText, (w - subW) / 2, h * 0.23, subSize, rgba(0, 255, 180, 200));

        // Menu items
        const menuSize = h * 0.038;
        const items = ['PLAY', 'OPTIONS', 'EXIT'];
        const positions = [0.42, 0.54, 0.66]; // Adjusted positions to match Windows version spacing

        for (let i = 0; i < items.length; i++) {
            const selected = this.menuSelectedIndex === i;
            const color = selected ? rgba(255, 255, 0) : rgba(255, 255, 255);
            const iw = textWidth(ctx, items[i], menuSize);
            const itemY = h * positions[i];
            drawText(ctx, items[i], (w - iw) / 2, itemY, menuSize, color);
        }

        // Tech labels
        const techSize = h * 0.022;
        const techColor = rgba(80, 120, 160, 140);
        drawText(ctx, 'https://trakteer.id/esmoocca', w * 0.02, h - h * 0.045, techSize, techColor);
        const verText = 'GAME VERSION: V1.0.0';
        const verW = textWidth(ctx, verText, techSize);
        drawText(ctx, verText, w - w * 0.02 - verW, h - h * 0.045, techSize, techColor);
    }

    // ─── Options ──────────────────────────────────────

    drawOptions(ctx, w, h) {
        // Title
        const titleText = '- OPTIONS -';
        const titleSize = h * 0.055;
        const titleW = textWidth(ctx, titleText, titleSize);
        drawText(ctx, titleText, (w - titleW) / 2, h * 0.08, titleSize, rgba(0, 220, 255));

        // Options box
        const boxW = w * 0.65;
        const boxH = h * 0.68;
        const boxX = (w - boxW) / 2;
        const boxY = h * 0.18;

        // Solid fill to block background grid/rain
        ctx.fillStyle = rgba(12, 14, 24, 255);
        ctx.fillRect(boxX, boxY, boxW, boxH);

        ctx.strokeStyle = rgba(0, 200, 255);
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        const optFontSize = h * 0.032;
        const activeColor = rgba(255, 255, 0);
        const normColor = rgba(200, 200, 200);

        // Paddle Color
        const selected0 = this.optionSelectedIndex === 0;
        drawText(ctx, 'Paddle Color:', boxX + boxW * 0.08, boxY + h * 0.12, optFontSize,
            selected0 ? activeColor : normColor);
        const colorLabel = (selected0 ? '< ' : '  ') + this.paddleColors[this.selectedColorIndex].label + (selected0 ? ' >' : '  ');
        drawText(ctx, colorLabel, boxX + boxW * 0.55, boxY + h * 0.12, optFontSize,
            selected0 ? activeColor : normColor);

        // Color preview
        const pc = this.paddleColors[this.selectedColorIndex].color;
        fillRoundedRect(ctx, boxX + boxW * 0.3, boxY + h * 0.25, 80, 20, 4,
            rgba(pc[0], pc[1], pc[2]), rgba(0, 255, 255), 1);

        // Back button
        const selected1 = this.optionSelectedIndex === 1;
        const backText = selected1 ? '> BACK TO MENU <' : 'BACK TO MENU';
        const backW = textWidth(ctx, backText, h * 0.036);
        drawText(ctx, backText, (w - backW) / 2, boxY + boxH * 0.85, h * 0.036,
            selected1 ? activeColor : normColor);

        // Help text
        const helpText = '[Tap Paddle Color to change | Tap Back to return]';
        const helpSize = h * 0.024;
        const helpW = textWidth(ctx, helpText, helpSize);
        drawText(ctx, helpText, (w - helpW) / 2, h * 0.90, helpSize, rgba(180, 180, 180));
    }

    // ─── HUD Sidebar ──────────────────────────────────

    drawHUD(ctx, w, h) {
        const sbX = w * 0.78;
        const sbW = w * 0.22;
        const frameThick = 10 * (w / 854);

        // ── Panel backgrounds ──
        // Top panel
        ctx.fillStyle = rgba(0, 0, 0);
        ctx.fillRect(sbX, 0, sbW, h * 0.25);
        // Middle panel
        ctx.fillStyle = rgba(14, 20, 35);
        ctx.fillRect(sbX, h * 0.25, sbW, h * 0.50);
        // Bottom panel
        ctx.fillStyle = rgba(6, 6, 8);
        ctx.fillRect(sbX, h * 0.75, sbW, h * 0.25);

        // ── Metallic frames ──
        const steelColor = rgba(80, 85, 96);
        ctx.fillStyle = steelColor;
        // Left border
        ctx.fillRect(sbX, 0, frameThick, h);
        // Right border
        ctx.fillRect(w - frameThick, 0, frameThick, h);
        // Top border
        ctx.fillRect(sbX, 0, sbW, frameThick);
        // Bottom border
        ctx.fillRect(sbX, h - frameThick, sbW, frameThick);
        // Dividers
        ctx.fillRect(sbX, h * 0.25 - frameThick / 2, sbW, frameThick);
        ctx.fillRect(sbX, h * 0.75 - frameThick / 2, sbW, frameThick);

        // ── Chrome reflections & shadows ──
        const reflColor = rgba(220, 225, 235, 140);
        const shadColor = rgba(35, 38, 45, 180);

        // Vertical reflections
        ctx.fillStyle = reflColor;
        ctx.fillRect(sbX + frameThick / 2 - 0.75, 0, 1.5, h);
        ctx.fillStyle = shadColor;
        ctx.fillRect(sbX + frameThick / 2 + 1.25, 0, 1.5, h);

        ctx.fillStyle = reflColor;
        ctx.fillRect(w - frameThick / 2 - 0.75, 0, 1.5, h);
        ctx.fillStyle = shadColor;
        ctx.fillRect(w - frameThick / 2 + 1.25, 0, 1.5, h);

        // Horizontal reflections for dividers
        const dividerYs = [frameThick / 2, h * 0.25, h * 0.75, h - frameThick / 2];
        for (const dy of dividerYs) {
            ctx.fillStyle = reflColor;
            ctx.fillRect(sbX, dy - 0.75, sbW, 1.5);
            ctx.fillStyle = shadColor;
            ctx.fillRect(sbX, dy + 1.25, sbW, 1.5);
        }

        // ── Bevel highlights ──
        this.drawBevelHighlight(ctx, sbX, 0, frameThick, h);
        this.drawBevelHighlight(ctx, w - frameThick, 0, frameThick, h);
        this.drawBevelHighlight(ctx, sbX, h * 0.25 - frameThick / 2, sbW, frameThick);
        this.drawBevelHighlight(ctx, sbX, h * 0.75 - frameThick / 2, sbW, frameThick);

        // ── Rivets ──
        const rxLeft = sbX + frameThick / 2;
        const rxRight = w - frameThick / 2;
        for (let ry = h * 0.05; ry < h; ry += h * 0.15) {
            this.drawRivet(ctx, rxLeft, ry, h);
            this.drawRivet(ctx, rxRight, ry, h);
        }
        this.drawRivet(ctx, sbX + sbW * 0.3, h * 0.25, h);
        this.drawRivet(ctx, sbX + sbW * 0.7, h * 0.25, h);
        this.drawRivet(ctx, sbX + sbW * 0.3, h * 0.75, h);
        this.drawRivet(ctx, sbX + sbW * 0.7, h * 0.75, h);

        // ── Title text ──
        const hudTitleSize = h * 0.038;
        const hudTitle = 'RICOCHET';
        const htW = textWidth(ctx, hudTitle, hudTitleSize);
        const htX = sbX + (sbW - htW) / 2;
        drawText(ctx, hudTitle, htX + 1.5, h * 0.10 + 1.5, hudTitleSize, rgba(0, 120, 255, 180));
        drawText(ctx, hudTitle, htX, h * 0.10, hudTitleSize, rgba(255, 220, 0));

        // ── Stats ──
        const headerSize = h * 0.028;
        const valueSize = h * 0.035;
        const statX = w * 0.80;
        const bpW = w * 0.18;
        const bpH = valueSize * 1.5;
        const bpX = w * 0.80;
        const txOff = 10 * (w / 854);
        const tyOff = 3 * (h / 480);

        const dimLED = rgba(10, 50, 70, 70);
        const brightLED = rgba(0, 240, 255);
        const goldLabel = rgba(255, 220, 0);
        const bpFill = rgba(8, 12, 24);
        const bpOutline = rgba(0, 180, 255, 100);

        // TIME
        drawText(ctx, 'TIME', statX, h * 0.27, headerSize, goldLabel);
        ctx.fillStyle = bpFill;
        ctx.fillRect(bpX, h * 0.32, bpW, bpH);
        ctx.strokeStyle = bpOutline;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bpX, h * 0.32, bpW, bpH);
        drawText(ctx, '88:88', bpX + txOff, h * 0.32 + tyOff, valueSize, dimLED);
        const mins = String(Math.floor(this.elapsedTime / 60)).padStart(2, '0');
        const secs = String(Math.floor(this.elapsedTime) % 60).padStart(2, '0');
        drawText(ctx, `${mins}:${secs}`, bpX + txOff, h * 0.32 + tyOff, valueSize, brightLED);

        // SCORE
        drawText(ctx, 'SCORE', statX, h * 0.43, headerSize, goldLabel);
        ctx.fillStyle = bpFill;
        ctx.fillRect(bpX, h * 0.48, bpW, bpH);
        ctx.strokeStyle = bpOutline;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bpX, h * 0.48, bpW, bpH);
        drawText(ctx, '888888', bpX + txOff, h * 0.48 + tyOff, valueSize, dimLED);
        drawText(ctx, String(this.score).padStart(6, '0'), bpX + txOff, h * 0.48 + tyOff, valueSize, brightLED);

        // SPEED
        drawText(ctx, 'SPEED', statX, h * 0.59, headerSize, goldLabel);
        ctx.fillStyle = bpFill;
        ctx.fillRect(bpX, h * 0.64, bpW, bpH);
        ctx.strokeStyle = bpOutline;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bpX, h * 0.64, bpW, bpH);
        drawText(ctx, '8.8x', bpX + txOff, h * 0.64 + tyOff, valueSize, dimLED);
        drawText(ctx, this.speedMultiplier.toFixed(1) + 'x', bpX + txOff, h * 0.64 + tyOff, valueSize, brightLED);

        // ── Bottom panel neon tubes ──
        const bottomY = h * 0.75;
        const bottomH = h * 0.25;

        // Neon tubes
        const drawNeonTube = (tx) => {
            ctx.fillStyle = rgba(5, 8, 12);
            ctx.fillRect(tx - 2, bottomY + bottomH * 0.15, 4, bottomH * 0.7);
            ctx.fillStyle = rgba(0, 240, 255, 160);
            ctx.fillRect(tx - 1, bottomY + bottomH * 0.16, 2, bottomH * 0.68);
            ctx.fillStyle = rgba(255, 255, 255, 220);
            ctx.fillRect(tx - 0.4, bottomY + bottomH * 0.16, 0.8, bottomH * 0.68);
        };
        drawNeonTube(sbX + frameThick + 6);
        drawNeonTube(w - frameThick - 6);

        // Version text
        const verLabelSize = h * 0.026;
        const verLabel = 'Game Version';
        const vlW = textWidth(ctx, verLabel, verLabelSize);
        drawText(ctx, verLabel, sbX + (sbW - vlW) / 2, bottomY + bottomH * 0.22, verLabelSize, rgba(255, 220, 0));

        const verNumSize = h * 0.024;
        const verNum = '1.0.0';
        const vnW = textWidth(ctx, verNum, verNumSize);
        drawText(ctx, verNum, sbX + (sbW - vnW) / 2, bottomY + bottomH * 0.42, verNumSize, rgba(0, 220, 255));

        const betaSize = h * 0.03;
        const betaText = 'BETA';
        const btW = textWidth(ctx, betaText, betaSize);
        const flashVal = (Math.sin(this.menuAnimTimer * 5) + 1) * 0.5;
        const beginAlpha = 80 + flashVal * 175;
        drawText(ctx, betaText, sbX + (sbW - btW) / 2, bottomY + bottomH * 0.65, betaSize, rgba(255, 235, 100, beginAlpha));
    }

    drawBevelHighlight(ctx, bx, by, bw, bh) {
        ctx.strokeStyle = rgba(145, 150, 160);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx, by); ctx.lineTo(bx, by + bh);
        ctx.stroke();

        ctx.strokeStyle = rgba(35, 38, 45);
        ctx.beginPath();
        ctx.moveTo(bx, by + bh); ctx.lineTo(bx + bw, by + bh);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + bw, by); ctx.lineTo(bx + bw, by + bh);
        ctx.stroke();
    }

    drawRivet(ctx, rx, ry, h) {
        const r = 3 * (h / 480);

        // Shadow
        ctx.beginPath();
        ctx.arc(rx + 1, ry + 1, r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(10, 12, 16, 160);
        ctx.fill();

        // Body
        ctx.beginPath();
        ctx.arc(rx, ry, r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(135, 140, 150);
        ctx.fill();
        ctx.strokeStyle = rgba(25, 30, 40);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Specular
        ctx.beginPath();
        ctx.arc(rx - r * 0.3, ry - r * 0.3, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = rgba(255, 255, 255, 220);
        ctx.fill();
    }

    // ─── Overlay (Stage Clear / Game Over) ────────────

    drawOverlay(ctx, w, h) {
        // Dim background
        ctx.fillStyle = rgba(4, 6, 14, 185);
        ctx.fillRect(0, 0, w, h);

        const panelW = w * 0.55;
        const panelH = h * 0.40;
        const panelX = (w - panelW) / 2;
        const panelY = h * 0.28;

        if (this.state === GameState.StageClear) {
            fillBeveledRect(ctx, panelX, panelY, panelW, panelH, 15,
                rgba(10, 15, 28, 230), rgba(0, 255, 140), 2);

            const titleText = 'STAGE CLEAR!';
            const titleSize = h * 0.075;
            const tw = textWidth(ctx, titleText, titleSize);
            drawText(ctx, titleText, (w - tw) / 2, h * 0.33, titleSize, rgba(0, 255, 140));

            const subText = 'MISSION ACCOMPLISHED';
            const subSize = h * 0.026;
            const sw = textWidth(ctx, subText, subSize);
            drawText(ctx, subText, (w - sw) / 2, h * 0.44, subSize, rgba(0, 220, 255));
        } else {
            fillBeveledRect(ctx, panelX, panelY, panelW, panelH, 15,
                rgba(10, 15, 28, 230), rgba(255, 50, 60), 2);

            const titleText = 'GAME OVER';
            const titleSize = h * 0.08;
            const tw = textWidth(ctx, titleText, titleSize);
            drawText(ctx, titleText, (w - tw) / 2, h * 0.33, titleSize, rgba(255, 50, 60));

            const subText = 'MISSION FAILED';
            const subSize = h * 0.026;
            const sw = textWidth(ctx, subText, subSize);
            drawText(ctx, subText, (w - sw) / 2, h * 0.44, subSize, rgba(255, 140, 0));
        }

        const contText = 'Tap atau tekan ENTER untuk ke Menu';
        const contSize = h * 0.030;
        const cw2 = textWidth(ctx, contText, contSize);
        drawText(ctx, contText, (w - cw2) / 2, h * 0.56, contSize, rgba(255, 235, 100));
    }

    // ─── Game Loop ────────────────────────────────────

    start() {
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    gameLoop(timestamp) {
        if (this.isExiting) return;
        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Clamp delta time to prevent spiral of death
        if (dt > 0.1) dt = 0.016;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.gameLoop(t));
    }
}

// ─── Start Game ───────────────────────────────────────

window.addEventListener('load', () => {
    // Lock to landscape on mobile
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
    }

    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas);
    game.start();
});
