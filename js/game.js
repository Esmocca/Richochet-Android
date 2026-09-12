// Port from C++ SFML to HTML5 Canvas
// Game By: Esmoocca
// Beta Test Version enchanted ui and stages

const GameState = { Menu: 0, Options: 1, Playing: 2, StageClear: 3, GameOver: 4, Paused: 5 };

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

class Ball {
    constructor(x, y, vx, vy, radius) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.alive = true;
        this.trails = [];
    }
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
        this.pauseSelectedIndex = 0;

        // Paddle Colors
        this.paddleColors = [
            { label: 'BLUE', color: [0, 180, 255] },
            { label: 'ORANGE', color: [255, 110, 0] },
            { label: 'RED', color: [255, 60, 60] },
            { label: 'PURPLE', color: [200, 60, 255] },
            { label: 'WHITE', color: [255, 255, 255] },
        ];
        this.selectedColorIndex = 0;

        // Settings
        this.volume = 50;
        this.difficulty = 1; // set on normal difficulty
        this.difficulties = ['EASY', 'NORMAL', 'HARD'];
        this.highScore = 0;

        // Physics
        this.baseSpeed = 130;
        this.currentSpeed = 130;
        this.maxSpeed = 350;
        this.speedMultiplier = 1.0;

        // Paddle
        this.paddleWidth = 36;
        this.basePaddleWidth = 36;
        this.paddleHeight = 6;
        this.paddleX = PLAY_AREA_WIDTH / 2;
        this.paddleY = 223;
        this.paddleBounceTimer = 0.3;

        // Multi-ball system
        this.balls = [];

        // Bricks
        this.bricks = [];
        this.brickSpawnTimer = 0;

        // Score & Time
        this.score = 0;
        this.elapsedTime = 0;
        this.lives = 3;
        this.currentLevel = 0;

        // Decorative menu bricks
        this.menuDecorBricks = [];
        this.menuAnimTimer = 0;

        // Rain
        this.rainDrops = [];

        // Particles
        this.particles = [];

        // Confetti
        this.confetti = [];

        // Floating text
        this.floatingTexts = [];

        // Powerups
        this.powerups = [];
        this.powerupActive = { wide: 0, slow: 0 };

        // Juice
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.hitLagTimer = 0;

        // Transitions
        this.fadeAlpha = 0;
        this.fadeTarget = 0;
        this.nextState = null;

        // Combo
        this.combo = 0;
        this.comboTimer = 0;

        // Level Start
        this.levelStartTimer = 0;
        this.levelStartPhase = 0; 

        // Starfield (parallax layers)
        this.starLayers = [];
        this.initStars();

        // Score breakdown for end screens
        this.scoreBreakdown = { base: 0, combo: 0, time: 0, stage: 0, total: 0 };
        this.scoreCountTimer = 0;
        this.isNewHighScore = false;

        // Overlay anim timer
        this.overlayTimer = 0;

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
        this.loadSettings();
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

        // Animate loading progress
        const progressBar = document.getElementById('progressBar');
        const loadingMessages = document.getElementById('loadingMessages');
        const messages = [
            'INITIALIZING QUANTUM CORE...',
            'LOADING BRICK MATRICES...',
            'CALIBRATING PADDLE SYSTEMS...',
            'SYNCING PARTICLE ENGINE...',
            'ESTABLISHING NEURAL LINK...',
            'READY TO LAUNCH!'
        ];
        let progress = 0;
        let msgIdx = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(() => {
                    const el = document.getElementById('loading');
                    if (el) el.style.opacity = '0';
                    setTimeout(() => {
                        if (el) el.style.display = 'none';
                    }, 600);
                }, 400);
            }
            if (progressBar) progressBar.style.width = progress + '%';

            // Update loading message
            const newIdx = Math.min(Math.floor(progress / 100 * messages.length), messages.length - 1);
            if (newIdx !== msgIdx && loadingMessages) {
                msgIdx = newIdx;
                loadingMessages.textContent = messages[msgIdx];
            }
        }, 100);
    }

    resizeCanvas() {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const cw = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 320);
        const ch = Math.max(240, window.innerHeight || document.documentElement.clientHeight || 240);

        this.canvas.width = Math.max(320, Math.floor(cw * dpr));
        this.canvas.height = Math.max(240, Math.floor(ch * dpr));
        this.canvas.style.width = cw + 'px';
        this.canvas.style.height = ch + 'px';

        const targetAspect = 854 / 480;
        const screenAspect = (ch > 0) ? (cw / ch) : targetAspect;

        if (screenAspect > targetAspect) {
            this.h = 480;
            this.w = 480 * screenAspect;
        } else {
            this.w = 854;
            this.h = 854 / (screenAspect || 1);
        }

        this.scaleX = (this.w > 0) ? ((cw * dpr) / this.w) : 1;
        this.scaleY = (this.h > 0) ? ((ch * dpr) / this.h) : 1;

        if (!isFinite(this.scaleX) || this.scaleX <= 0) this.scaleX = 1;
        if (!isFinite(this.scaleY) || this.scaleY <= 0) this.scaleY = 1;

        const vAspect = V_WIDTH / V_HEIGHT;
        const wAspect = (this.h > 0) ? (this.w / this.h) : vAspect;

        let gvW, gvH, gvX, gvY;
        if (wAspect > vAspect) {
            gvH = this.h;
            gvW = this.h * vAspect;
            gvX = (this.w - gvW) / 2;
            gvY = 0;
        } else {
            gvW = this.w;
            gvH = this.w / (vAspect || 1);
            gvX = 0;
            gvY = (this.h - gvH) / 2;
        }
        this.gameViewport = { x: gvX, y: gvY, w: gvW, h: gvH };
        this.gameScaleX = gvW / V_WIDTH;
        this.gameScaleY = gvH / V_HEIGHT;

        if (!isFinite(this.gameScaleX) || this.gameScaleX <= 0) this.gameScaleX = 1;
        if (!isFinite(this.gameScaleY) || this.gameScaleY <= 0) this.gameScaleY = 1;
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
        const patterns = [
            // Level 1: Heart (Stage 01)
            {
                data: [
                    [0, 1, 1, 0, 0, 0, 1, 1, 0],
                    [1, 2, 2, 1, 0, 1, 2, 2, 1],
                    [1, 2, 2, 2, 1, 2, 2, 2, 1],
                    [1, 2, 2, 2, 2, 2, 2, 2, 1],
                    [0, 1, 2, 2, 2, 2, 2, 1, 0],
                    [0, 0, 1, 2, 2, 2, 1, 0, 0],
                    [0, 0, 0, 1, 2, 1, 0, 0, 0],
                    [0, 0, 0, 0, 1, 0, 0, 0, 0]
                ],
                colors: [
                    [255, 40, 90],
                    [255, 120, 180]
                ]
            },
            // Level 2: Diamond (Stage 02 - Electric Cyber Blue Diamond)
            {
                data: [
                    [0, 0, 0, 0, 1, 0, 0, 0, 0],
                    [0, 0, 0, 1, 2, 1, 0, 0, 0],
                    [0, 0, 1, 2, 3, 2, 1, 0, 0],
                    [0, 1, 2, 3, 4, 3, 2, 1, 0],
                    [1, 2, 3, 4, 4, 4, 3, 2, 1],
                    [0, 1, 2, 3, 4, 3, 2, 1, 0],
                    [0, 0, 1, 2, 3, 2, 1, 0, 0],
                    [0, 0, 0, 1, 2, 1, 0, 0, 0],
                    [0, 0, 0, 0, 1, 0, 0, 0, 0]
                ],
                colors: [
                    [0, 230, 255],  // 1: Electric Cyan border
                    [0, 160, 255],  // 2: Vibrant Blue
                    [30, 90, 245],  // 3: Royal Blue
                    [180, 240, 255] // 4: Ice White Core
                ]
            },
            // Level 3: Space Invader (Stage 03 - Multi-Color Row Neon Gradation)
            {
                data: [
                    [0, 0, 1, 0, 0, 0, 1, 0, 0], // Row 0: Antennae (Cyber Green)
                    [0, 0, 0, 2, 0, 2, 0, 0, 0], // Row 1: Stems (Cyan)
                    [0, 0, 3, 3, 3, 3, 3, 0, 0], // Row 2: Crown (Electric Blue)
                    [0, 4, 4, 5, 4, 5, 4, 4, 0], // Row 3: Visor & Glowing Eyes (Neon Pink/Yellow)
                    [6, 6, 6, 6, 6, 6, 6, 6, 6], // Row 4: Shoulders (Purple)
                    [7, 0, 7, 7, 7, 7, 7, 0, 7], // Row 5: Ribs (Deep Magenta)
                    [8, 0, 8, 0, 0, 0, 8, 0, 8], // Row 6: Legs (Hot Pink)
                    [0, 0, 0, 9, 0, 9, 0, 0, 0]  // Row 7: Feet (Bright Orange)
                ],
                colors: [
                    [0, 255, 180],   // 1: Cyber Green
                    [0, 220, 255],   // 2: Cyan
                    [0, 140, 255],   // 3: Electric Blue
                    [255, 50, 180],  // 4: Neon Pink
                    [255, 230, 0],   // 5: Yellow Eyes
                    [170, 40, 255],  // 6: Purple
                    [220, 30, 200],  // 7: Deep Magenta
                    [255, 60, 120],  // 8: Hot Pink
                    [255, 120, 0]    // 9: Bright Orange
                ]
            },
            // Level 4: Pyramid (Stage 04 - Emerald/Gold Gradient)
            {
                data: [
                    [0, 0, 0, 0, 1, 0, 0, 0, 0],
                    [0, 0, 0, 2, 2, 2, 0, 0, 0],
                    [0, 0, 3, 3, 3, 3, 3, 0, 0],
                    [0, 4, 4, 4, 4, 4, 4, 4, 0],
                    [5, 5, 5, 5, 5, 5, 5, 5, 5]
                ],
                colors: [
                    [255, 220, 0],   // 1: Gold Capstone
                    [255, 170, 0],   // 2: Amber
                    [0, 230, 140],   // 3: Emerald
                    [0, 200, 200],   // 4: Cyan
                    [0, 150, 255]    // 5: Deep Blue
                ]
            },
            // Level 5: Fortress (Stage 05 - Steel Blue & Ruby Contrast)
            {
                data: [
                    [1, 1, 1, 1, 1, 1, 1, 1, 1],
                    [2, 2, 2, 2, 2, 2, 2, 2, 2],
                    [2, 3, 0, 0, 3, 0, 0, 3, 2],
                    [2, 3, 3, 3, 3, 3, 3, 3, 2],
                    [2, 3, 0, 0, 0, 0, 0, 3, 2],
                    [2, 3, 3, 3, 3, 3, 3, 3, 2],
                    [0, 1, 3, 3, 3, 3, 3, 1, 0],
                    [0, 0, 1, 1, 1, 1, 1, 0, 0]
                ],
                colors: [
                    [0, 120, 255],
                    [0, 200, 255],
                    [255, 60, 100]
                ]
            }
        ];

        const patternObj = patterns[this.currentLevel % patterns.length];
        const pattern = patternObj.data;
        const colors = patternObj.colors;
        const rows = pattern.length;
        const cols = pattern[0].length;

        const bw = 22, bh = 8, sx = 2, sy = 2;
        const totalW = cols * (bw + sx) - sx;
        const startX = (PLAY_AREA_WIDTH - totalW) / 2;
        const startY = 20;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cell = pattern[row][col];
                if (cell > 0) {
                    const cIdx = Math.min(cell - 1, colors.length - 1);
                    this.bricks.push({
                        x: startX + col * (bw + sx) + bw / 2,
                        y: startY + row * (bh + sy) + bh / 2,
                        targetX: startX + col * (bw + sx) + bw / 2,
                        targetY: startY + row * (bh + sy) + bh / 2,
                        w: bw, h: bh,
                        color: colors[cIdx] || colors[0],
                        points: cell === 1 ? 150 : 100,
                        destroyed: false,
                        scale: 1
                    });
                }
            }
        }
    }

    resetBallAndPaddle(fullReset = false) {
        this.paddleX = PLAY_AREA_WIDTH / 2;
        this.paddleY = 223;

        // Increase base speed per level
        const levelSpeedBoost = this.currentLevel * 10;
        // Difficulty modifier
        const diffMod = [0.85, 1.0, 1.2][this.difficulty];
        this.currentSpeed = (this.baseSpeed + levelSpeedBoost) * diffMod;
        this.speedMultiplier = this.currentSpeed / this.baseSpeed;

        // Reset ball array — single ball
        this.balls = [
            new Ball(
                PLAY_AREA_WIDTH / 2 - 3.5,
                208,
                80 * diffMod,
                -this.currentSpeed,
                3.5
            )
        ];

        if (fullReset) {
            this.score = 0;
            this.elapsedTime = 0;
            this.lives = 3;
            this.currentLevel = 0;
            this.combo = 0;
            this.confetti = [];
            this.floatingTexts = [];
            this.powerups = [];
            this.powerupActive = { wide: 0, slow: 0 };
        }

        this.levelStartTimer = 3.0;
        this.levelStartPhase = 0;
        this.brickSpawnTimer = 0;
        this.paddleBounceTimer = 0.3;
        this.particles = [];
    }

    initStars() {
        this.starLayers = [];
        // 3 parallax layers: far, mid, near
        const configs = [
            { count: 50, speed: 3, sizeMax: 0.8, alphaMax: 0.3 },   // Far
            { count: 35, speed: 8, sizeMax: 1.2, alphaMax: 0.5 },   // Mid
            { count: 20, speed: 15, sizeMax: 2.0, alphaMax: 0.8 },  // Near
        ];
        for (const cfg of configs) {
            const layer = [];
            for (let i = 0; i < cfg.count; i++) {
                layer.push({
                    x: Math.random() * V_WIDTH,
                    y: Math.random() * V_HEIGHT,
                    size: 0.3 + Math.random() * cfg.sizeMax,
                    speed: cfg.speed + Math.random() * cfg.speed * 0.5,
                    alpha: 0.1 + Math.random() * cfg.alphaMax,
                    twinkle: Math.random() * Math.PI * 2
                });
            }
            this.starLayers.push(layer);
        }
    }

    updateStars(dt) {
        const parallaxOffsets = [0.02, 0.05, 0.1]; // How much paddle movement affects each layer
        const paddleCenter = this.paddleX / PLAY_AREA_WIDTH; // 0-1

        for (let l = 0; l < this.starLayers.length; l++) {
            for (const s of this.starLayers[l]) {
                s.y += s.speed * dt;
                s.twinkle += dt * (2 + l);
                if (s.y > V_HEIGHT) {
                    s.y = 0;
                    s.x = Math.random() * V_WIDTH;
                }
            }
        }
    }

    drawStars(ctx) {
        const paddleOffset = (this.paddleX / PLAY_AREA_WIDTH - 0.5) * 2; // -1 to 1

        for (let l = 0; l < this.starLayers.length; l++) {
            const parallax = [2, 5, 10][l];
            for (const s of this.starLayers[l]) {
                const twinkleAlpha = s.alpha * (0.5 + 0.5 * Math.sin(s.twinkle));
                const px = s.x - paddleOffset * parallax;
                ctx.fillStyle = `rgba(255, 255, 255, ${twinkleAlpha})`;
                ctx.fillRect(px, s.y, s.size, s.size);
            }
        }
    }

    saveSettings() {
        try {
            const settings = {
                volume: this.volume,
                difficulty: this.difficulty,
                selectedColorIndex: this.selectedColorIndex,
                highScore: this.highScore
            };
            localStorage.setItem('ricochet_settings', JSON.stringify(settings));
        } catch (e) {
            console.warn('localStorage save warning:', e);
        }
        if (this.audio) this.audio.setVolume(this.volume);
    }

    loadSettings() {
        try {
            const data = localStorage.getItem('ricochet_settings');
            if (data) {
                const settings = JSON.parse(data);
                this.volume = settings.volume ?? 50;
                this.difficulty = settings.difficulty ?? 1;
                this.selectedColorIndex = settings.selectedColorIndex ?? 0;
                this.highScore = settings.highScore ?? 0;
            }
        } catch (e) {
            console.warn('localStorage load warning:', e);
        }
        if (this.audio) this.audio.setVolume(this.volume);
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

        // Touch - Canvas (for menus & options volume dragging)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.audio.tryResumeBGM();
            const touch = e.touches[0];
            this.handleTap(touch.clientX, touch.clientY);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            if (this.state === GameState.Options && e.touches.length > 0) {
                e.preventDefault();
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                const nx = (touch.clientX - rect.left) / rect.width;
                const ny = (touch.clientY - rect.top) / rect.height;
                const vx = nx * this.w;
                const vy = ny * this.h;
                this.handleOptionsDrag(vx, vy);
            }
        }, { passive: false });

        let isMouseDown = false;
        this.canvas.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            this.audio.tryResumeBGM();
            this.handleTap(e.clientX, e.clientY);
        });
        this.canvas.addEventListener('mousemove', (e) => {
            if (isMouseDown && this.state === GameState.Options) {
                const rect = this.canvas.getBoundingClientRect();
                const nx = (e.clientX - rect.left) / rect.width;
                const ny = (e.clientY - rect.top) / rect.height;
                const vx = nx * this.w;
                const vy = ny * this.h;
                this.handleOptionsDrag(vx, vy);
            }
        });
        window.addEventListener('mouseup', () => { isMouseDown = false; });
    }

    handleTap(clientX, clientY) {
        if (this.fadeAlpha > 0.1) return; // Prevent input during transitions
        // Convert client coordinates to virtual window coordinates
        const rect = this.canvas.getBoundingClientRect();
        const nx = (clientX - rect.left) / rect.width;
        const ny = (clientY - rect.top) / rect.height;
        const vx = nx * this.w;
        const vy = ny * this.h;

        // Top-left Pause button tap check during Playing or Paused
        if (this.state === GameState.Playing || this.state === GameState.Paused) {
            const pBtnX = 10 * (this.w / 854);
            const pBtnY = 8 * (this.h / 480);
            const pBtnW = 80 * (this.w / 854);
            const pBtnH = 38 * (this.h / 480);
            if (vx >= pBtnX - 5 && vx <= pBtnX + pBtnW + 10 &&
                vy >= pBtnY - 5 && vy <= pBtnY + pBtnH + 10) {
                this.audio.init();
                this.audio.playPauseSound();
                if (this.state === GameState.Playing) {
                    this.state = GameState.Paused;
                    this.pauseSelectedIndex = 0;
                } else {
                    this.state = GameState.Playing;
                }
                return;
            }
        }

        if (this.state === GameState.Menu) {
            this.handleMenuTap(vx, vy);
        } else if (this.state === GameState.Options) {
            this.handleOptionsTap(vx, vy);
        } else if (this.state === GameState.Paused) {
            this.handlePauseTap(vx, vy);
        } else if (this.state === GameState.StageClear || this.state === GameState.GameOver) {
            this.audio.init();
            this.audio.playBrickSound(0.9);
            this.triggerStateTransition(GameState.Menu);
        }
    }

    handleMenuTap(vx, vy) {
        const w = this.w, h = this.h;

        // Menu button areas — Neon Glass Panels
        const btnW = w * 0.28;
        const btnH = h * 0.08;
        const btnX = (w - btnW) / 2;
        const positions = [0.42, 0.54, 0.66];

        for (let i = 0; i < 3; i++) {
            const btnY = h * positions[i] - btnH * 0.3;
            if (vx >= btnX && vx <= btnX + btnW && vy >= btnY && vy <= btnY + btnH) {
                this.menuSelectedIndex = i;
                this.audio.init(); this.audio.playBrickSound(0.9);
                if (i === 0) {
                    this.resetBallAndPaddle(true);
                    this.initBricks();
                    this.triggerStateTransition(GameState.Playing);
                } else if (i === 1) {
                    this.triggerStateTransition(GameState.Options);
                } else if (i === 2) {
                    this.exitGame();
                }
                return;
            }
        }
    }

    handlePauseTap(vx, vy) {
        const w = this.w, h = this.h;
        const panelW = w * 0.38;
        const btnW = panelW * 0.82;
        const btnH = h * 0.07;
        const btnX = (w - btnW) / 2;
        const positions = [0.36, 0.47, 0.58];

        for (let i = 0; i < 3; i++) {
            const btnY = h * positions[i];
            if (vx >= btnX && vx <= btnX + btnW && vy >= btnY && vy <= btnY + btnH) {
                this.pauseSelectedIndex = i;
                this.audio.init(); this.audio.playPauseSound();
                if (i === 0) {
                    // Resume
                    this.state = GameState.Playing;
                } else if (i === 1) {
                    // Restart
                    this.lives = 3;
                    this.score = 0;
                    this.resetBallAndPaddle(true);
                    this.initBricks();
                    this.state = GameState.Playing;
                } else if (i === 2) {
                    // Exit to menu
                    this.triggerStateTransition(GameState.Menu);
                }
                return;
            }
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
            try { window.close(); } catch (err) { }
        }
    }

    handleOptionsTap(vx, vy) {
        const w = this.w, h = this.h;
        const boxX = (w - w * 0.65) / 2;
        const boxY = h * 0.18;
        const boxW = w * 0.65;
        const boxH = h * 0.68;

        // Paddle color area
        if (vy >= boxY + h * 0.05 && vy <= boxY + h * 0.15) {
            this.optionSelectedIndex = 0;
            if (vx < w / 2) this.selectedColorIndex = (this.selectedColorIndex - 1 + this.paddleColors.length) % this.paddleColors.length;
            else this.selectedColorIndex = (this.selectedColorIndex + 1) % this.paddleColors.length;
            this.audio.init(); this.audio.playBrickSound(1.1);
            this.saveSettings();
        }
        // Volume area (Tap anywhere on row or drag slider)
        else if (vy >= boxY + h * 0.15 && vy <= boxY + h * 0.25) {
            this.optionSelectedIndex = 1;
            const barX = boxX + boxW * 0.50;
            const barW = boxW * 0.40;
            this.updateVolumeFromPos(vx, barX, barW);
        }
        // Difficulty area
        else if (vy >= boxY + h * 0.26 && vy <= boxY + h * 0.35) {
            this.optionSelectedIndex = 2;
            if (vx < w / 2) this.difficulty = (this.difficulty - 1 + 3) % 3;
            else this.difficulty = (this.difficulty + 1) % 3;
            this.audio.init(); this.audio.playBrickSound(1.1);
            this.saveSettings();
        }
        // BACK button area
        else if (vy >= boxY + boxH * 0.78) {
            this.optionSelectedIndex = 3;
            this.audio.init();
            this.audio.playBrickSound(0.6);
            this.triggerStateTransition(GameState.Menu);
        }
    }

    handleOptionsDrag(vx, vy) {
        const w = this.w, h = this.h;
        const boxX = (w - w * 0.65) / 2;
        const boxY = h * 0.18;
        const boxW = w * 0.65;

        // Volume row Y region
        if (vy >= boxY + h * 0.14 && vy <= boxY + h * 0.26) {
            this.optionSelectedIndex = 1;
            const barX = boxX + boxW * 0.50;
            const barW = boxW * 0.40;
            this.updateVolumeFromPos(vx, barX, barW);
        }
    }

    updateVolumeFromPos(vx, barX, barW) {
        let pct = (vx - barX) / barW;
        if (pct < 0.05) pct = 0;
        else if (pct > 0.95) pct = 1;

        let newVol = Math.round(pct * 20) * 5; // rounded to 0, 5, 10, ... 100%
        if (newVol !== this.volume) {
            this.volume = newVol;
            if (this.audio) {
                this.audio.init();
                this.audio.setVolume(this.volume / 100);
                this.audio.playBrickSound(1.1);
            }
            this.saveSettings();
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
                    this.resetBallAndPaddle(true);
                    this.initBricks();
                    this.triggerStateTransition(GameState.Playing);
                } else if (this.menuSelectedIndex === 1) {
                    this.triggerStateTransition(GameState.Options);
                } else if (this.menuSelectedIndex === 2) {
                    this.exitGame();
                }
            }
        } else if (this.state === GameState.Options) {
            if (code === 'ArrowUp') {
                this.optionSelectedIndex = (this.optionSelectedIndex - 1 + 4) % 4;
                this.audio.init(); this.audio.playBrickSound(1.3);
            }
            if (code === 'ArrowDown') {
                this.optionSelectedIndex = (this.optionSelectedIndex + 1) % 4;
                this.audio.init(); this.audio.playBrickSound(1.3);
            }
            if (code === 'ArrowLeft') {
                if (this.optionSelectedIndex === 0) {
                    this.selectedColorIndex = (this.selectedColorIndex - 1 + this.paddleColors.length) % this.paddleColors.length;
                    this.audio.init(); this.audio.playBrickSound(1.1);
                } else if (this.optionSelectedIndex === 1) {
                    this.volume = Math.max(0, this.volume - 10);
                    this.audio.init(); this.audio.playBrickSound(1.1);
                    this.saveSettings();
                } else if (this.optionSelectedIndex === 2) {
                    this.difficulty = (this.difficulty - 1 + 3) % 3;
                    this.audio.init(); this.audio.playBrickSound(1.1);
                    this.saveSettings();
                }
            }
            if (code === 'ArrowRight') {
                if (this.optionSelectedIndex === 0) {
                    this.selectedColorIndex = (this.selectedColorIndex + 1) % this.paddleColors.length;
                    this.audio.init(); this.audio.playBrickSound(1.1);
                    this.saveSettings();
                } else if (this.optionSelectedIndex === 1) {
                    this.volume = Math.min(100, this.volume + 10);
                    this.audio.init(); this.audio.playBrickSound(1.1);
                    this.saveSettings();
                } else if (this.optionSelectedIndex === 2) {
                    this.difficulty = (this.difficulty + 1) % 3;
                    this.audio.init(); this.audio.playBrickSound(1.1);
                    this.saveSettings();
                }
            }
            if (code === 'Enter' || code === 'Space') {
                if (this.optionSelectedIndex === 3) {
                    this.audio.init(); this.audio.playBrickSound(0.6);
                    this.triggerStateTransition(GameState.Menu);
                }
            }
            if (code === 'Escape') {
                this.audio.init(); this.audio.playBrickSound(0.6);
                this.triggerStateTransition(GameState.Menu);
            }
        } else if (this.state === GameState.Playing) {
            if (code === 'Escape') {
                this.audio.init(); this.audio.playPauseSound();
                this.state = GameState.Paused;
                this.pauseSelectedIndex = 0;
            }
        } else if (this.state === GameState.Paused) {
            if (code === 'Escape') {
                this.audio.init(); this.audio.playPauseSound();
                this.state = GameState.Playing;
            }
            if (code === 'ArrowUp') {
                this.pauseSelectedIndex = (this.pauseSelectedIndex - 1 + 3) % 3;
                this.audio.init(); this.audio.playBrickSound(1.3);
            }
            if (code === 'ArrowDown') {
                this.pauseSelectedIndex = (this.pauseSelectedIndex + 1) % 3;
                this.audio.init(); this.audio.playBrickSound(1.3);
            }
            if (code === 'Enter' || code === 'Space') {
                this.audio.init(); this.audio.playPauseSound();
                if (this.pauseSelectedIndex === 0) {
                    this.state = GameState.Playing;
                } else if (this.pauseSelectedIndex === 1) {
                    this.resetBallAndPaddle(true);
                    this.initBricks();
                    this.state = GameState.Playing;
                } else if (this.pauseSelectedIndex === 2) {
                    this.triggerStateTransition(GameState.Menu);
                }
            }
        } else if (this.state === GameState.StageClear || this.state === GameState.GameOver) {
            if (code === 'Enter' || code === 'Space' || code === 'Escape') {
                this.audio.init(); this.audio.playBrickSound(0.9);
                this.triggerStateTransition(GameState.Menu);
            }
        }
    }

    // ─── Update ───────────────────────────────────────

    triggerStateTransition(nextState) {
        this.fadeTarget = 1;
        this.nextState = nextState;
    }

    update(dt) {
        if (this.isExiting) return;

        // Fade transition logic
        if (this.fadeAlpha !== this.fadeTarget) {
            const speed = 2.5;
            if (this.fadeAlpha < this.fadeTarget) {
                this.fadeAlpha = Math.min(1, this.fadeAlpha + speed * dt);
                if (this.fadeAlpha >= 1 && this.nextState !== null) {
                    this.state = this.nextState;
                    this.nextState = null;
                    this.fadeTarget = 0;
                    if (this.state === GameState.Playing) {
                        this.resetBallAndPaddle();
                        this.initBricks();
                    }
                    if (this.state === GameState.StageClear || this.state === GameState.GameOver) {
                        this.overlayTimer = 0;
                        this.calculateScoreBreakdown();
                        this.scoreCountTimer = 0;
                        if (this.state === GameState.StageClear) {
                            this.spawnConfetti();
                        }
                    }
                }
            } else {
                this.fadeAlpha = Math.max(0, this.fadeAlpha - speed * dt);
            }
        }

        // Hitlag (Time Freeze)
        if (this.hitLagTimer > 0) {
            this.hitLagTimer -= dt;
            return;
        }

        // Screen Shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
        }

        this.menuAnimTimer += dt;
        this.updateRain(dt);
        this.updateParticles(dt);
        this.updatePowerups(dt);
        this.updateStars(dt);
        this.updateFloatingTexts(dt);
        this.updateConfetti(dt);

        if (this.levelStartTimer > 0) {
            this.levelStartTimer -= dt;
            // Phase transitions
            if (this.levelStartTimer < 1.0) this.levelStartPhase = 2;      // GO!
            else if (this.levelStartTimer < 2.0) this.levelStartPhase = 1;  // READY
            else this.levelStartPhase = 0;                                   // STAGE X
        }

        // Show/hide virtual buttons
        const ctrlEl = document.getElementById('controls');
        if (ctrlEl) {
            ctrlEl.style.display = (this.state === GameState.Playing || this.state === GameState.Paused) ? 'block' : 'none';
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

        if (this.state === GameState.StageClear || this.state === GameState.GameOver) {
            this.overlayTimer += dt;
            if (this.scoreCountTimer < 2.0) this.scoreCountTimer += dt;
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

        // Combo system
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
        } else {
            this.combo = 0;
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
            // Lock balls on paddle
            for (const ball of this.balls) {
                ball.x = this.paddleX - ball.radius;
                ball.y = 208;
            }
        } else {
            // Ensure bricks are in final position
            for (const brick of this.bricks) {
                brick.scale = 1;
                brick.x = brick.targetX;
                brick.y = brick.targetY;
            }

            // Update all balls
            for (const ball of this.balls) {
                if (!ball.alive) continue;
                this.updateBall(ball, dt);
            }

            // Remove dead balls
            this.balls = this.balls.filter(b => b.alive);

            // If all balls lost
            if (this.balls.length === 0) {
                this.lives--;
                this.shakeTimer = 0.3;
                this.shakeIntensity = 8.0;
                this.audio.init(); this.audio.playLifeLost();

                if (this.lives <= 0) {
                    this.isNewHighScore = this.score > this.highScore;
                    if (this.isNewHighScore) {
                        this.highScore = this.score;
                        this.saveSettings();
                    }
                    this.audio.init(); this.audio.playGameOver();
                    this.triggerStateTransition(GameState.GameOver);
                } else {
                    this.resetBallAndPaddle(false);
                }
            }
        }
    }

    updateBall(ball, dt) {
        let moveDt = dt;
        if (this.powerupActive.slow > 0) moveDt *= 0.6;

        ball.x += ball.vx * moveDt;
        ball.y += ball.vy * moveDt;

        // Ball trail
        ball.trails.push({
            x: ball.x + ball.radius,
            y: ball.y + ball.radius,
            lifetime: 0,
            maxLifetime: 0.22,
            alpha: 180
        });

        // Update ball trails
        ball.trails = ball.trails.filter(t => {
            t.lifetime += dt;
            if (t.lifetime >= t.maxLifetime) return false;
            t.alpha = 180 * (1 - t.lifetime / t.maxLifetime);
            return true;
        });

        // Wall bounces
        if (ball.x <= 0 || ball.x >= PLAY_AREA_WIDTH - ball.radius * 2) {
            ball.vx = -ball.vx;
            if (ball.x <= 0) ball.x = 0;
            if (ball.x >= PLAY_AREA_WIDTH - ball.radius * 2) ball.x = PLAY_AREA_WIDTH - ball.radius * 2;
            this.audio.init(); this.audio.playWallBounce();
        }
        if (ball.y <= 0) {
            ball.vy = -ball.vy;
            ball.y = 0;
            this.audio.init(); this.audio.playWallBounce();
        }

        // Ball lost (below screen)
        if (ball.y >= V_HEIGHT) {
            ball.alive = false;
            return;
        }

        // Speed increase helper
        const increaseSpeed = () => {
            if (this.currentSpeed < this.maxSpeed) {
                this.currentSpeed *= 1.025;
                this.speedMultiplier = this.currentSpeed / this.baseSpeed;
                const mag = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
                if (mag > 0) {
                    ball.vx = (ball.vx / mag) * this.currentSpeed;
                    ball.vy = (ball.vy / mag) * this.currentSpeed;
                }
            }
        };

        // Paddle collision
        const ballCX = ball.x + ball.radius;
        const ballCY = ball.y + ball.radius;
        const pLeft = this.paddleX - this.paddleWidth / 2;
        const pRight = this.paddleX + this.paddleWidth / 2;
        const pTop = this.paddleY - this.paddleHeight / 2;
        const pBottom = this.paddleY + this.paddleHeight / 2;

        if (ballCX + ball.radius > pLeft && ballCX - ball.radius < pRight &&
            ballCY + ball.radius > pTop && ballCY - ball.radius < pBottom) {

            // Zone-based reflection
            const hitPos = (ballCX - this.paddleX) / (this.paddleWidth / 2); // -1 to 1
            const angle = hitPos * (Math.PI / 3); // max 60 degrees

            const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
            ball.vx = Math.sin(angle) * speed;
            ball.vy = -Math.cos(angle) * speed;

            increaseSpeed();
            this.paddleBounceTimer = 0;
            this.combo = 0; // Reset combo on paddle hit
            this.audio.init(); this.audio.playPaddleBounce();
        }

        // Brick collision
        for (const brick of this.bricks) {
            if (brick.destroyed) continue;
            const bLeft = brick.x - brick.w / 2;
            const bRight = brick.x + brick.w / 2;
            const bTop = brick.y - brick.h / 2;
            const bBottom = brick.y + brick.h / 2;

            if (ballCX + ball.radius > bLeft && ballCX - ball.radius < bRight &&
                ballCY + ball.radius > bTop && ballCY - ball.radius < bBottom) {

                brick.destroyed = true;

                // Proper collision detection
                const overlapLeft = (ballCX + ball.radius) - bLeft;
                const overlapRight = bRight - (ballCX - ball.radius);
                const overlapTop = (ballCY + ball.radius) - bTop;
                const overlapBottom = bBottom - (ballCY - ball.radius);

                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                    ball.vx = -ball.vx;
                } else {
                    ball.vy = -ball.vy;
                }

                // Score with combo
                this.combo++;
                this.comboTimer = 2.0;
                const comboMultiplier = Math.min(this.combo, 5);
                const points = brick.points * comboMultiplier;
                this.score += points;

                // Floating text for combo
                if (this.combo >= 2) {
                    this.spawnFloatingText(
                        brick.x, brick.y - 10,
                        `x${this.combo}`,
                        this.combo >= 5 ? [255, 50, 255] : this.combo >= 3 ? [255, 200, 0] : [0, 255, 200]
                    );
                }

                // Juice
                this.shakeTimer = 0.15;
                this.shakeIntensity = 3.5;
                this.hitLagTimer = 0.04;

                // Audio variant based on combo
                if (this.combo >= 3) {
                    this.audio.init(); this.audio.playComboSound(this.combo);
                } else {
                    this.audio.init(); this.audio.playBrickSound(1.0 + this.combo * 0.05);
                }
                this.spawnParticles(brick.x, brick.y, brick.color);

                // Powerup spawn chance
                if (Math.random() < 0.15) {
                    this.spawnPowerup(brick.x, brick.y);
                }

                increaseSpeed();

                if (this.bricks.every(b => b.destroyed)) {
                    this.currentLevel++;
                    if (this.currentLevel >= 5) {
                        this.isNewHighScore = this.score > this.highScore;
                        if (this.isNewHighScore) {
                            this.highScore = this.score;
                            this.saveSettings();
                        }
                        this.audio.init(); this.audio.playLevelClear();
                        this.triggerStateTransition(GameState.StageClear);
                    } else {
                        this.audio.init(); this.audio.playLevelClear();
                        this.resetBallAndPaddle(false);
                        this.initBricks();
                    }
                }
                break;
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
        // Enhanced particles — more, bigger, with glow and sparks
        for (let i = 0; i < 22; i++) {
            const angle = (Math.random() * 360) * Math.PI / 180;
            const speed = 40 + Math.random() * 100;
            const size = 2.0 + Math.random() * 3.5;
            const isSpark = Math.random() > 0.55;
            const isGlow = !isSpark && Math.random() > 0.6;

            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 20,
                color: isSpark ? [255, 255, 255] : [
                    Math.min(255, color[0] + Math.random() * 60 - 30),
                    Math.min(255, color[1] + Math.random() * 60 - 30),
                    Math.min(255, color[2] + Math.random() * 60 - 30)
                ],
                alpha: 255,
                size: isSpark ? 1.5 : size,
                lifetime: 0,
                maxLifetime: 0.3 + Math.random() * 0.5,
                spark: isSpark,
                glow: isGlow,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 10
            });
        }
    }

    updateParticles(dt) {
        this.particles = this.particles.filter(p => {
            p.lifetime += dt;
            if (p.lifetime >= p.maxLifetime) return false;
            p.vy += 120 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rotation += p.rotSpeed * dt;
            p.alpha = 255 * (1 - p.lifetime / p.maxLifetime);
            return true;
        });
    }

    drawParticles(ctx) {
        for (const p of this.particles) {
            const a = p.alpha / 255;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);

            if (p.glow) {
                // Glow particle
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2);
                grad.addColorStop(0, `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${a})`);
                grad.addColorStop(1, `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 0)`);
                ctx.fillStyle = grad;
                ctx.fillRect(-p.size * 2, -p.size * 2, p.size * 4, p.size * 4);
            } else if (p.spark) {
                // Spark particle — bright white line
                ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
                ctx.fillRect(-0.5, -1.5, 1.5, 3);
            } else {
                // Debris particle
                ctx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${a})`;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            }
            ctx.restore();
        }
    }

    // ─── Floating Texts ──────────────────────────────

    spawnFloatingText(x, y, text, color) {
        this.floatingTexts.push({
            x, y,
            text,
            color,
            lifetime: 0,
            maxLifetime: 1.2,
            scale: 0.5,
            alpha: 255
        });
    }

    updateFloatingTexts(dt) {
        this.floatingTexts = this.floatingTexts.filter(ft => {
            ft.lifetime += dt;
            if (ft.lifetime >= ft.maxLifetime) return false;
            ft.y -= 25 * dt;
            const progress = ft.lifetime / ft.maxLifetime;
            ft.alpha = 255 * (1 - progress);
            // Scale up then down
            if (progress < 0.2) {
                ft.scale = 0.5 + (progress / 0.2) * 1.0;
            } else {
                ft.scale = 1.5 - (progress - 0.2) * 0.6;
            }
            return true;
        });
    }

    drawFloatingTexts(ctx) {
        for (const ft of this.floatingTexts) {
            ctx.save();
            ctx.translate(ft.x, ft.y);
            ctx.scale(ft.scale, ft.scale);
            const a = ft.alpha / 255;
            // Shadow
            ctx.font = '8px PixelFont, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = `rgba(0, 0, 0, ${a * 0.8})`;
            ctx.fillText(ft.text, 1, 1);
            ctx.fillStyle = `rgba(${ft.color[0]}, ${ft.color[1]}, ${ft.color[2]}, ${a})`;
            ctx.fillText(ft.text, 0, 0);
            ctx.restore();
        }
    }

    // ─── Confetti ─────────────────────────────────────

    spawnConfetti() {
        this.confetti = [];
        const colors = [
            [255, 50, 80], [0, 255, 200], [255, 215, 0], [0, 180, 255],
            [255, 100, 255], [127, 255, 0], [255, 140, 0]
        ];
        for (let i = 0; i < 80; i++) {
            this.confetti.push({
                x: Math.random() * V_WIDTH,
                y: -Math.random() * V_HEIGHT * 0.5,
                vx: (Math.random() - 0.5) * 60,
                vy: 30 + Math.random() * 50,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 2 + Math.random() * 3,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 8,
                lifetime: 0,
                maxLifetime: 4 + Math.random() * 3
            });
        }
    }

    updateConfetti(dt) {
        this.confetti = this.confetti.filter(c => {
            c.lifetime += dt;
            if (c.lifetime >= c.maxLifetime) return false;
            c.x += c.vx * dt;
            c.vy += 15 * dt;
            c.y += c.vy * dt;
            c.rotation += c.rotSpeed * dt;
            c.vx += Math.sin(c.lifetime * 3) * 10 * dt; // Flutter
            return c.y < V_HEIGHT + 20;
        });
    }

    drawConfetti(ctx) {
        for (const c of this.confetti) {
            const a = Math.min(1, 1 - (c.lifetime / c.maxLifetime) * 0.5);
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rotation);
            ctx.fillStyle = `rgba(${c.color[0]}, ${c.color[1]}, ${c.color[2]}, ${a})`;
            ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
            ctx.restore();
        }
    }

    // ─── Powerups ─────────────────────────────────────

    spawnPowerup(x, y) {
        const types = ['WIDE', 'SLOW', 'MULTI'];
        const type = types[Math.floor(Math.random() * types.length)];
        const colors = { 'WIDE': [0, 255, 100], 'SLOW': [255, 200, 0], 'MULTI': [255, 50, 50] };

        this.powerups.push({
            x, y,
            type,
            color: colors[type],
            vy: 80,
            w: 12, h: 12,
            lifetime: 8.0,
            pulse: 0
        });
    }

    updatePowerups(dt) {
        if (this.state !== GameState.Playing) return;

        this.powerups = this.powerups.filter(p => {
            p.y += p.vy * dt;
            p.pulse += dt * 5;

            // Paddle collision
            const pLeft = this.paddleX - this.paddleWidth / 2;
            const pRight = this.paddleX + this.paddleWidth / 2;
            const pTop = this.paddleY - this.paddleHeight / 2;

            if (p.y + p.h > pTop && p.y < pTop + 10 && p.x + p.w > pLeft && p.x < pRight) {
                this.applyPowerup(p.type);
                this.audio.init(); this.audio.playPowerupSound();
                this.spawnFloatingText(p.x, p.y - 15, p.type, p.color);
                return false;
            }

            return p.y < V_HEIGHT;
        });

        // Active powerup timers
        if (this.powerupActive.wide > 0) {
            this.powerupActive.wide -= dt;
            this.paddleWidth = 56;
        } else {
            this.paddleWidth = this.basePaddleWidth;
        }

        if (this.powerupActive.slow > 0) {
            this.powerupActive.slow -= dt;
        }
    }

    applyPowerup(type) {
        if (type === 'WIDE') {
            this.powerupActive.wide = 10;
        } else if (type === 'SLOW') {
            this.powerupActive.slow = 8;
        } else if (type === 'MULTI') {
            // Multi-ball: spawn 2 extra balls from each existing ball
            const newBalls = [];
            for (const ball of this.balls) {
                if (!ball.alive) continue;
                const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);

                // Ball going 30 degrees left
                const angle1 = Math.atan2(ball.vx, -ball.vy) - Math.PI / 6;
                newBalls.push(new Ball(
                    ball.x, ball.y,
                    Math.sin(angle1) * speed,
                    -Math.cos(angle1) * speed,
                    ball.radius
                ));

                // Ball going 30 degrees right
                const angle2 = Math.atan2(ball.vx, -ball.vy) + Math.PI / 6;
                newBalls.push(new Ball(
                    ball.x, ball.y,
                    Math.sin(angle2) * speed,
                    -Math.cos(angle2) * speed,
                    ball.radius
                ));
            }
            this.balls.push(...newBalls);
        }
    }

    drawPowerups(ctx) {
        for (const p of this.powerups) {
            ctx.save();
            ctx.translate(p.x, p.y);

            // Glow effect
            const glowAlpha = 0.3 + Math.sin(p.pulse) * 0.2;
            const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.w);
            glowGrad.addColorStop(0, `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${glowAlpha})`);
            glowGrad.addColorStop(1, `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 0)`);
            ctx.fillStyle = glowGrad;
            ctx.fillRect(-p.w, -p.h, p.w * 2, p.h * 2);

            // Icon box
            const pulseScale = 1 + Math.sin(p.pulse) * 0.1;
            ctx.scale(pulseScale, pulseScale);
            fillRoundedRect(ctx, -p.w / 2, -p.h / 2, p.w, p.h, 2, rgba(p.color[0], p.color[1], p.color[2], 200));
            ctx.strokeStyle = rgba(255, 255, 255, 200);
            ctx.lineWidth = 1;
            ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);

            // Letter
            const letter = p.type[0];
            ctx.font = '8px PixelFont, monospace';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(letter, 0, 0);

            ctx.restore();
        }
    }

    // ─── Score Breakdown ──────────────────────────────

    calculateScoreBreakdown() {
        const baseScore = this.score;
        const timeBonus = Math.max(0, Math.floor((300 - this.elapsedTime) * 10));
        const stageBonus = this.currentLevel * 500;
        const comboBonus = this.combo * 200;
        this.scoreBreakdown = {
            base: baseScore,
            combo: comboBonus,
            time: timeBonus,
            stage: stageBonus,
            total: baseScore + timeBonus + stageBonus + comboBonus
        };
        this.score = this.scoreBreakdown.total;

        // Update high score with final total
        if (this.score > this.highScore) {
            this.isNewHighScore = true;
            this.highScore = this.score;
            this.saveSettings();
        }
    }

    // ─── Render ───────────────────────────────────────

    render() {
        if (this.isExiting) return;
        const ctx = this.ctx;
        const w = this.w || 854;
        const h = this.h || 480;

        const scaleX = (isFinite(this.scaleX) && this.scaleX > 0) ? this.scaleX : 1;
        const scaleY = (isFinite(this.scaleY) && this.scaleY > 0) ? this.scaleY : 1;
        const gameScaleX = (isFinite(this.gameScaleX) && this.gameScaleX > 0) ? this.gameScaleX : 1;
        const gameScaleY = (isFinite(this.gameScaleY) && this.gameScaleY > 0) ? this.gameScaleY : 1;

        // Apply screen shake
        let sx = 0, sy = 0;
        if (this.shakeTimer > 0) {
            sx = (Math.random() - 0.5) * this.shakeIntensity;
            sy = (Math.random() - 0.5) * this.shakeIntensity;
        }

        ctx.save();
        ctx.translate(sx * scaleX, sy * scaleY);
        ctx.scale(scaleX, scaleY);

        // Clear
        ctx.fillStyle = rgba(12, 14, 24);
        ctx.fillRect(-sx, -sy, w, h);

        // ── GAME VIEW (320×240 virtual) ──
        ctx.save();
        const gv = this.gameViewport || { x: 0, y: 0, w: w, h: h };
        ctx.translate(gv.x || 0, gv.y || 0);
        ctx.scale(gameScaleX, gameScaleY);

        // Scrolling cyber grid
        this.drawCyberGrid(ctx);

        // Starfield (parallax)
        this.drawStars(ctx);

        // Menu decorative bricks
        if (this.state === GameState.Menu) {
            for (const b of this.menuDecorBricks) {
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.scale(b.scale, b.scale);
                // Glow
                const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, b.w);
                glowGrad.addColorStop(0, rgba(b.color[0], b.color[1], b.color[2], 60));
                glowGrad.addColorStop(1, rgba(b.color[0], b.color[1], b.color[2], 0));
                ctx.fillStyle = glowGrad;
                ctx.fillRect(-b.w, -b.h, b.w * 2, b.h * 2);

                fillRoundedRect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, b.r,
                    rgba(b.color[0], b.color[1], b.color[2]));
                ctx.restore();
            }
        }

        // Rain
        this.drawRain(ctx);

        // Game objects
        if (this.state === GameState.Playing || this.state === GameState.Paused ||
            this.state === GameState.StageClear || this.state === GameState.GameOver) {
            this.drawGameObjects(ctx);
        }

        // Confetti (drawn in game viewport)
        this.drawConfetti(ctx);

        ctx.restore();

        // ── UI VIEW (virtual window size) ──
        this.drawUI(ctx, w, h);

        ctx.restore();

        // Global Overlay (Fade)
        if (this.fadeAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
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

        // Paddle Gradient Stroke
        const grad = ctx.createLinearGradient(
            this.paddleX - this.paddleWidth / 2, 0,
            this.paddleX + this.paddleWidth / 2, 0
        );
        grad.addColorStop(0, rgba(0, 50, 255));   // Dark Blue
        grad.addColorStop(0.5, rgba(0, 255, 255)); // Light Blue
        grad.addColorStop(1, rgba(0, 50, 255));   // Dark Blue

        // Paddle glow
        const paddleGlow = ctx.createRadialGradient(
            this.paddleX, this.paddleY + visualYOffset, 0,
            this.paddleX, this.paddleY + visualYOffset, this.paddleWidth * 0.8
        );
        paddleGlow.addColorStop(0, rgba(pc[0], pc[1], pc[2], 40));
        paddleGlow.addColorStop(1, rgba(pc[0], pc[1], pc[2], 0));
        ctx.fillStyle = paddleGlow;
        ctx.fillRect(this.paddleX - this.paddleWidth, this.paddleY - 15, this.paddleWidth * 2, 30);

        // Paddle
        fillRoundedRect(ctx,
            this.paddleX - this.paddleWidth / 2,
            this.paddleY - this.paddleHeight / 2 + visualYOffset,
            this.paddleWidth, this.paddleHeight, 2,
            rgba(pc[0], pc[1], pc[2]),
            grad, 1.5);

        // Paddle highlight
        fillRoundedRect(ctx,
            this.paddleX - this.paddleWidth * 0.39,
            this.paddleY - this.paddleHeight * 0.21 + visualYOffset - 1,
            this.paddleWidth * 0.78, this.paddleHeight * 0.42, 1,
            rgba(255, 255, 255, 100));

        // Draw all balls
        for (const ball of this.balls) {
            if (!ball.alive) continue;

            // Ball trails
            for (const t of ball.trails) {
                ctx.beginPath();
                ctx.arc(t.x, t.y, 2.2, 0, Math.PI * 2);
                ctx.fillStyle = rgba(0, 220, 255, t.alpha);
                ctx.fill();
            }

            // Ball glow effect
            const ballGrad = ctx.createRadialGradient(
                ball.x + ball.radius, ball.y + ball.radius, 0,
                ball.x + ball.radius, ball.y + ball.radius, ball.radius * 4
            );
            ballGrad.addColorStop(0, rgba(0, 255, 255, 120));
            ballGrad.addColorStop(0.5, rgba(0, 200, 255, 40));
            ballGrad.addColorStop(1, rgba(0, 255, 255, 0));
            ctx.fillStyle = ballGrad;
            ctx.fillRect(ball.x - ball.radius * 3, ball.y - ball.radius * 3, ball.radius * 8, ball.radius * 8);

            // Ball body
            ctx.beginPath();
            ctx.arc(ball.x + ball.radius, ball.y + ball.radius, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = rgba(255, 255, 200);
            ctx.fill();
            ctx.strokeStyle = rgba(0, 220, 255, 200);
            ctx.lineWidth = 1;
            ctx.stroke();

            // Ball inner highlight
            ctx.beginPath();
            ctx.arc(ball.x + ball.radius - 1, ball.y + ball.radius - 1, ball.radius * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = rgba(255, 255, 255, 180);
            ctx.fill();
        }

        // Bricks
        for (const brick of this.bricks) {
            if (brick.destroyed) continue;
            ctx.save();
            ctx.translate(brick.x, brick.y);
            ctx.scale(brick.scale, brick.scale);

            // Brick glow
            const brickGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, brick.w * 0.6);
            brickGlow.addColorStop(0, rgba(brick.color[0], brick.color[1], brick.color[2], 30));
            brickGlow.addColorStop(1, rgba(brick.color[0], brick.color[1], brick.color[2], 0));
            ctx.fillStyle = brickGlow;
            ctx.fillRect(-brick.w * 0.6, -brick.h * 0.6, brick.w * 1.2, brick.h * 1.2);

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

        // Powerups
        this.drawPowerups(ctx);

        // Particles
        this.drawParticles(ctx);

        // Floating texts
        this.drawFloatingTexts(ctx);

        // Level Start Text
        if (this.levelStartTimer > 0) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (this.levelStartPhase === 0) {
                // Stage name with slide-in
                const slideProgress = Math.min(1, (3.0 - this.levelStartTimer) / 0.3);
                const slideX = PLAY_AREA_WIDTH / 2 + (1 - slideProgress) * 100;
                const alpha = Math.min(1, slideProgress * 2);

                // Background dim
                ctx.fillStyle = rgba(0, 0, 0, alpha * 100);
                ctx.fillRect(0, V_HEIGHT / 2 - 30, PLAY_AREA_WIDTH, 60);

                ctx.font = '16px PixelFont, monospace';
                ctx.fillStyle = rgba(255, 215, 0, alpha * 255);
                ctx.fillText(`STAGE ${this.currentLevel + 1}`, slideX, V_HEIGHT / 2 - 10);

                const stageNames = ['HEART', 'DIAMOND', 'INVADER', 'PYRAMID', 'FORTRESS'];
                const stName = stageNames[this.currentLevel % 5];
                ctx.font = '9px PixelFont, monospace';
                ctx.fillStyle = rgba(0, 220, 255, alpha * 200);
                ctx.fillText(stName, slideX, V_HEIGHT / 2 + 10);


            } else if (this.levelStartPhase === 1) {
                // READY
                const pulse = Math.sin(this.menuAnimTimer * 8) * 0.3 + 1;
                ctx.font = '20px PixelFont, monospace';
                ctx.fillStyle = rgba(255, 255, 0, 200);
                ctx.save();
                ctx.translate(PLAY_AREA_WIDTH / 2, V_HEIGHT / 2);
                ctx.scale(pulse, pulse);
                ctx.fillText('READY', 0, 0);
                ctx.restore();
            } else if (this.levelStartPhase === 2) {
                // GO!
                const scale = 1 + (1.0 - this.levelStartTimer) * 2;
                const alpha = Math.max(0, this.levelStartTimer) * 255;
                ctx.font = '24px PixelFont, monospace';
                ctx.save();
                ctx.translate(PLAY_AREA_WIDTH / 2, V_HEIGHT / 2);
                ctx.scale(scale, scale);
                ctx.fillStyle = rgba(0, 255, 100, alpha);
                ctx.fillText('GO!', 0, 0);
                ctx.restore();
            }
            ctx.restore();
        }
    }

    drawUI(ctx, w, h) {
        if (this.state === GameState.Playing || this.state === GameState.Paused ||
            this.state === GameState.StageClear || this.state === GameState.GameOver) {
            this.drawHUD(ctx, w, h);
        }

        // ── Top-Left Pause Button ──
        if (this.state === GameState.Playing || this.state === GameState.Paused) {
            const pBtnX = 10 * (w / 854);
            const pBtnY = 8 * (h / 480);
            const pBtnW = 75 * (w / 854);
            const pBtnH = 32 * (h / 480);

            const isPaused = this.state === GameState.Paused;
            fillRoundedRect(ctx, pBtnX, pBtnY, pBtnW, pBtnH, 4,
                rgba(0, 180, 255, isPaused ? 50 : 25));
            drawRoundedRect(ctx, pBtnX, pBtnY, pBtnW, pBtnH, 4);
            ctx.strokeStyle = rgba(0, 220, 255, isPaused ? 220 : 120);
            ctx.lineWidth = isPaused ? 2 : 1;
            ctx.stroke();

            const pBtnText = '❚❚ PAUSE';
            const pBtnFontSize = h * 0.024;
            const pbW = textWidth(ctx, pBtnText, pBtnFontSize);
            drawText(ctx, pBtnText, pBtnX + (pBtnW - pbW) / 2, pBtnY + (pBtnH - pBtnFontSize) / 2, pBtnFontSize,
                rgba(0, 240, 255, 230));
        }

        if (this.state === GameState.Menu) {
            this.drawMenu(ctx, w, h);
        } else if (this.state === GameState.Options) {
            this.drawOptions(ctx, w, h);
        } else if (this.state === GameState.Paused) {
            this.drawPauseMenu(ctx, w, h);
        }

        if (this.state === GameState.StageClear || this.state === GameState.GameOver) {
            this.drawOverlay(ctx, w, h);
        }
    }

    // ─── Menu ─────────────────────────────────────────

    drawMenu(ctx, w, h) {
        // Title with bloom/glow effect
        const titleSize = h * 0.085;
        const titleText = 'RICOCHET';
        const titleW = textWidth(ctx, titleText, titleSize);
        const titleX = (w - titleW) / 2;
        const titleY = h * 0.12;

        // Multi-layer bloom
        const bloomPulse = (Math.sin(this.menuAnimTimer * 2) + 1) * 0.5;
        const bloomLayers = [
            { offset: 4, alpha: 30 + bloomPulse * 20, color: [0, 100, 255] },
            { offset: 3, alpha: 50 + bloomPulse * 30, color: [0, 160, 255] },
            { offset: 2, alpha: 80 + bloomPulse * 40, color: [0, 200, 255] },
            { offset: 1, alpha: 120 + bloomPulse * 60, color: [100, 220, 255] },
        ];

        for (const layer of bloomLayers) {
            drawText(ctx, titleText, titleX + layer.offset, titleY + layer.offset, titleSize,
                rgba(layer.color[0], layer.color[1], layer.color[2], layer.alpha));
            drawText(ctx, titleText, titleX - layer.offset * 0.5, titleY + layer.offset * 0.5, titleSize,
                rgba(layer.color[0], layer.color[1], layer.color[2], layer.alpha * 0.5));
        }

        // Color cycling title
        const hueShift = this.menuAnimTimer * 0.3;
        const r = Math.floor(255 * (0.5 + 0.5 * Math.sin(hueShift)));
        const g = Math.floor(215 + 40 * Math.sin(hueShift + 2));
        drawText(ctx, titleText, titleX, titleY, titleSize, rgba(255, g, r > 200 ? 0 : r));

        // Subtitle
        const subText = 'ARCADE BLOCK SIMULATOR';
        const subSize = h * 0.024;
        const subW = textWidth(ctx, subText, subSize);
        drawText(ctx, subText, (w - subW) / 2, h * 0.23, subSize, rgba(0, 255, 180, 200));

        // High Score
        const hsText = `HIGH SCORE: ${String(this.highScore).padStart(6, '0')}`;
        const hsSize = h * 0.022;
        const hsw = textWidth(ctx, hsText, hsSize);
        drawText(ctx, hsText, (w - hsw) / 2, h * 0.30, hsSize, rgba(255, 255, 255, 150));

        // ── Cyberpunk Neon Glass Panel Menu Buttons ──
        const menuSize = h * 0.038;
        const items = ['PLAY', 'OPTIONS', 'EXIT'];
        const positions = [0.42, 0.54, 0.66];
        const btnW = w * 0.28;
        const btnH = h * 0.085;
        const btnColors = [
            [0, 255, 180],   // Cyan-green for PLAY
            [0, 180, 255],   // Blue for OPTIONS
            [255, 80, 100],  // Red for EXIT
        ];

        for (let i = 0; i < items.length; i++) {
            const selected = this.menuSelectedIndex === i;
            const btnX = (w - btnW) / 2;
            const btnY = h * positions[i] - btnH * 0.35;
            const bc = btnColors[i];

            ctx.save();

            // Glass panel background
            const glassAlpha = selected ? 50 : 25;
            fillRoundedRect(ctx, btnX, btnY, btnW, btnH, 4,
                rgba(bc[0], bc[1], bc[2], glassAlpha));

            // Border glow
            const borderAlpha = selected ? 220 : 80;
            const pulseAlpha = selected ? borderAlpha + Math.sin(this.menuAnimTimer * 5) * 40 : borderAlpha;
            drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 4);
            ctx.strokeStyle = rgba(bc[0], bc[1], bc[2], pulseAlpha);
            ctx.lineWidth = selected ? 2 : 1;
            ctx.stroke();

            // Outer glow for selected
            if (selected) {
                drawRoundedRect(ctx, btnX - 2, btnY - 2, btnW + 4, btnH + 4, 6);
                ctx.strokeStyle = rgba(bc[0], bc[1], bc[2], 40 + Math.sin(this.menuAnimTimer * 4) * 20);
                ctx.lineWidth = 3;
                ctx.stroke();
            }

            // Scanline effect inside button
            ctx.save();
            drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 4);
            ctx.clip();
            const scanlineOffset = (this.menuAnimTimer * 30) % 6;
            ctx.strokeStyle = rgba(255, 255, 255, 8);
            ctx.lineWidth = 0.5;
            for (let sy = scanlineOffset; sy < btnH; sy += 3) {
                ctx.beginPath();
                ctx.moveTo(btnX, btnY + sy);
                ctx.lineTo(btnX + btnW, btnY + sy);
                ctx.stroke();
            }
            ctx.restore();

            // Glass highlight (top reflection)
            const highlightGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH * 0.4);
            highlightGrad.addColorStop(0, rgba(255, 255, 255, selected ? 30 : 15));
            highlightGrad.addColorStop(1, rgba(255, 255, 255, 0));
            fillRoundedRect(ctx, btnX + 1, btnY + 1, btnW - 2, btnH * 0.4, 3, highlightGrad);

            // Text
            const label = items[i];
            const itemSize = menuSize;
            const lw = textWidth(ctx, label, itemSize);
            const color = selected ? rgba(255, 255, 255) : rgba(bc[0], bc[1], bc[2], 200);
            drawText(ctx, label, (w - lw) / 2, btnY + (btnH - itemSize) / 2, itemSize, color);

            if (selected) {
                const arrowPulse = Math.sin(this.menuAnimTimer * 6) * 4;
                drawText(ctx, '▶', btnX + 15 + arrowPulse, btnY + (btnH - itemSize) / 2, itemSize, rgba(bc[0], bc[1], bc[2]));
                drawText(ctx, '◀', btnX + btnW - 15 - itemSize - arrowPulse, btnY + (btnH - itemSize) / 2, itemSize, rgba(bc[0], bc[1], bc[2]));
            }

            ctx.restore();
        }

        // Help text
        const helpText = '[ Use Up/Down & Enter / Tap to Select ]';
        const helpSize = h * 0.024;
        const hw = textWidth(ctx, helpText, helpSize);
        drawText(ctx, helpText, (w - hw) / 2, h * 0.90, helpSize, rgba(180, 180, 180));
    }

    // ─── Pause Menu ──────────────────────────────────

    drawPauseMenu(ctx, w, h) {
        // Dim background
        ctx.fillStyle = rgba(4, 6, 14, 195);
        ctx.fillRect(0, 0, w, h);

        const panelW = w * 0.38;
        const panelH = h * 0.54;
        const panelX = (w - panelW) / 2;
        const panelY = h * 0.20;

        // Glass panel
        fillRoundedRect(ctx, panelX, panelY, panelW, panelH, 8,
            rgba(10, 15, 30, 230));

        // Border glow
        drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 8);
        ctx.strokeStyle = rgba(0, 200, 255, 160);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Outer glow
        drawRoundedRect(ctx, panelX - 3, panelY - 3, panelW + 6, panelH + 6, 10);
        ctx.strokeStyle = rgba(0, 200, 255, 35);
        ctx.lineWidth = 4;
        ctx.stroke();

        // Scanlines
        ctx.save();
        drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 8);
        ctx.clip();
        ctx.strokeStyle = rgba(255, 255, 255, 6);
        ctx.lineWidth = 0.5;
        for (let sy = 0; sy < panelH; sy += 2.5) {
            ctx.beginPath();
            ctx.moveTo(panelX, panelY + sy);
            ctx.lineTo(panelX + panelW, panelY + sy);
            ctx.stroke();
        }
        ctx.restore();

        // Title
        const titleText = '❚❚ PAUSE MENU';
        const titleSize = h * 0.046;
        const tw = textWidth(ctx, titleText, titleSize);
        drawText(ctx, titleText, (w - tw) / 2, panelY + h * 0.04, titleSize, rgba(0, 240, 255));

        // Divider
        ctx.strokeStyle = rgba(0, 200, 255, 80);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(panelX + 20, panelY + h * 0.10);
        ctx.lineTo(panelX + panelW - 20, panelY + h * 0.10);
        ctx.stroke();

        // Menu items
        const items = ['RESUME', 'RESTART', 'EXIT'];
        const itemSize = h * 0.034;
        const positions = [0.36, 0.47, 0.58];
        const btnW = panelW * 0.82;
        const btnH = h * 0.07;
        const btnX = (w - btnW) / 2;

        const btnColors = [
            [0, 255, 180],   // Cyan-green for RESUME
            [255, 200, 0],   // Yellow for RESTART
            [255, 80, 100],  // Red for EXIT
        ];

        for (let i = 0; i < items.length; i++) {
            const selected = this.pauseSelectedIndex === i;
            const btnY = h * positions[i];
            const bc = btnColors[i];

            // Glass button background
            fillRoundedRect(ctx, btnX, btnY, btnW, btnH, 4,
                rgba(bc[0], bc[1], bc[2], selected ? 45 : 18));

            // Button border
            drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 4);
            ctx.strokeStyle = rgba(bc[0], bc[1], bc[2], selected ? 220 : 70);
            ctx.lineWidth = selected ? 2 : 1;
            ctx.stroke();

            if (selected) {
                drawRoundedRect(ctx, btnX - 2, btnY - 2, btnW + 4, btnH + 4, 6);
                ctx.strokeStyle = rgba(bc[0], bc[1], bc[2], 40);
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            const label = items[i];
            const lw = textWidth(ctx, label, itemSize);
            const color = selected ? rgba(255, 255, 255) : rgba(bc[0], bc[1], bc[2], 180);
            drawText(ctx, label, (w - lw) / 2, btnY + (btnH - itemSize) / 2, itemSize, color);

            if (selected) {
                const arrowPulse = Math.sin(this.menuAnimTimer * 6) * 3;
                drawText(ctx, '▶', btnX + 12 + arrowPulse, btnY + (btnH - itemSize) / 2, itemSize, rgba(bc[0], bc[1], bc[2]));
            }
        }

        // Help text
        const helpSize = h * 0.022;
        const helpText = '[ Tap button or press ESC to resume ]';
        const hw = textWidth(ctx, helpText, helpSize);
        drawText(ctx, helpText, (w - hw) / 2, panelY + panelH - h * 0.05, helpSize, rgba(140, 140, 140));
    }

    // ─── Options ──────────────────────────────────────

    drawOptions(ctx, w, h) {
        // Title
        const titleText = '- OPTIONS -';
        const titleSize = h * 0.055;
        const titleW = textWidth(ctx, titleText, titleSize);
        drawText(ctx, titleText, (w - titleW) / 2, h * 0.08, titleSize, rgba(0, 220, 255));

        // Options box — glass panel style
        const boxW = w * 0.65;
        const boxH = h * 0.68;
        const boxX = (w - boxW) / 2;
        const boxY = h * 0.18;

        // Glass background
        fillRoundedRect(ctx, boxX, boxY, boxW, boxH, 6, rgba(12, 14, 24, 240));

        // Border glow
        drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 6);
        ctx.strokeStyle = rgba(0, 200, 255, 120);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Scanlines
        ctx.save();
        drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 6);
        ctx.clip();
        ctx.strokeStyle = rgba(255, 255, 255, 5);
        ctx.lineWidth = 0.5;
        for (let sy = 0; sy < boxH; sy += 2.5) {
            ctx.beginPath();
            ctx.moveTo(boxX, boxY + sy);
            ctx.lineTo(boxX + boxW, boxY + sy);
            ctx.stroke();
        }
        ctx.restore();

        const optFontSize = h * 0.032;
        const activeColor = rgba(255, 255, 0);
        const normColor = rgba(200, 200, 200);

        // 1. Paddle Color
        const selected0 = this.optionSelectedIndex === 0;
        drawText(ctx, 'Paddle Color:', boxX + boxW * 0.08, boxY + h * 0.08, optFontSize,
            selected0 ? activeColor : normColor);
        const colorLabel = (selected0 ? '< ' : '  ') + this.paddleColors[this.selectedColorIndex].label + (selected0 ? ' >' : '  ');
        drawText(ctx, colorLabel, boxX + boxW * 0.55, boxY + h * 0.08, optFontSize,
            selected0 ? activeColor : normColor);

        // 2. Volume
        const selected1 = this.optionSelectedIndex === 1;
        drawText(ctx, 'Volume:', boxX + boxW * 0.08, boxY + h * 0.18, optFontSize,
            selected1 ? activeColor : normColor);

        // Volume text
        const volText = `${this.volume}%`;
        const volTextW = textWidth(ctx, volText, optFontSize);
        drawText(ctx, volText, boxX + boxW * 0.50 - volTextW - 10, boxY + h * 0.18, optFontSize,
            selected1 ? activeColor : normColor);

        // Interactive volume bar track
        const barX = boxX + boxW * 0.50;
        const barY = boxY + h * 0.185;
        const barW = boxW * 0.40;
        const barH = 14;

        fillRoundedRect(ctx, barX, barY, barW, barH, 4, rgba(20, 25, 45, 230));

        // Fill track
        const fillW = Math.max(0, barW * (this.volume / 100));
        if (fillW > 0) {
            fillRoundedRect(ctx, barX, barY, fillW, barH, 4, rgba(0, 220, 255, 230));
        }

        // Border
        drawRoundedRect(ctx, barX, barY, barW, barH, 4);
        ctx.strokeStyle = rgba(0, 200, 255, selected1 ? 220 : 100);
        ctx.lineWidth = selected1 ? 2 : 1;
        ctx.stroke();

        // Glowing Slider Handle Knob
        const knobX = barX + fillW;
        ctx.beginPath();
        ctx.arc(knobX, barY + barH / 2, 9, 0, Math.PI * 2);
        ctx.fillStyle = selected1 ? rgba(255, 255, 0) : rgba(0, 240, 255);
        ctx.fill();
        ctx.strokeStyle = rgba(255, 255, 255, 230);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 3. Difficulty
        const selected2 = this.optionSelectedIndex === 2;
        drawText(ctx, 'Difficulty:', boxX + boxW * 0.08, boxY + h * 0.28, optFontSize,
            selected2 ? activeColor : normColor);
        const diffText = (selected2 ? '< ' : '  ') + this.difficulties[this.difficulty] + (selected2 ? ' >' : '  ');
        const diffColors = [rgba(0, 255, 100), rgba(255, 200, 0), rgba(255, 60, 60)];
        drawText(ctx, diffText, boxX + boxW * 0.55, boxY + h * 0.28, optFontSize,
            selected2 ? diffColors[this.difficulty] : normColor);

        // Back button — neon glass style
        const selectedBack = this.optionSelectedIndex === 3;
        const backBtnW = w * 0.22;
        const backBtnH = h * 0.065;
        const backBtnX = (w - backBtnW) / 2;
        const backBtnY = boxY + boxH * 0.83;

        fillRoundedRect(ctx, backBtnX, backBtnY, backBtnW, backBtnH, 4,
            rgba(0, 180, 255, selectedBack ? 40 : 15));
        drawRoundedRect(ctx, backBtnX, backBtnY, backBtnW, backBtnH, 4);
        ctx.strokeStyle = rgba(0, 180, 255, selectedBack ? 200 : 60);
        ctx.lineWidth = selectedBack ? 2 : 1;
        ctx.stroke();

        const backText = 'BACK TO MENU';
        const backFontSize = h * 0.032;
        const bw2 = textWidth(ctx, backText, backFontSize);
        drawText(ctx, backText, (w - bw2) / 2, backBtnY + (backBtnH - backFontSize) / 2, backFontSize,
            selectedBack ? rgba(255, 255, 255) : rgba(150, 150, 150));

        // Help text
        const helpText = '[Use Arrows to navigate and change options]';
        const helpSize = h * 0.024;
        const helpW = textWidth(ctx, helpText, helpSize);
        drawText(ctx, helpText, (w - helpW) / 2, h * 0.90, helpSize, rgba(180, 180, 180));
    }

    // ─── Stage Clear & Game Over Overlay ─────────────────

    drawOverlay(ctx, w, h) {
        ctx.save();

        // Dark dim backdrop over canvas
        ctx.fillStyle = rgba(8, 10, 20, 210);
        ctx.fillRect(0, 0, w, h);

        const isClear = this.state === GameState.StageClear;
        const mainTitle = isClear ? 'STAGE CLEAR!' : 'GAME OVER';
        const titleColor = isClear ? [0, 255, 180] : [255, 60, 80];

        // Animated neon glass modal box
        const boxW = w * 0.52;
        const boxH = h * 0.62;
        const boxX = (w - boxW) / 2;
        const boxY = (h - boxH) / 2;

        // Dark neon glass background
        fillRoundedRect(ctx, boxX, boxY, boxW, boxH, 8, rgba(12, 16, 30, 240));

        // Border glow pulse
        const borderGlowPulse = 180 + Math.sin(this.menuAnimTimer * 4) * 50;
        drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 8);
        ctx.strokeStyle = rgba(titleColor[0], titleColor[1], titleColor[2], borderGlowPulse);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Outer glow accent
        drawRoundedRect(ctx, boxX - 3, boxY - 3, boxW + 6, boxH + 6, 10);
        ctx.strokeStyle = rgba(titleColor[0], titleColor[1], titleColor[2], 40);
        ctx.lineWidth = 3;
        ctx.stroke();

        // Header Title
        const titleSize = h * 0.055;
        const tw = textWidth(ctx, mainTitle, titleSize);
        drawText(ctx, mainTitle, (w - tw) / 2 + 2, boxY + h * 0.05 + 2, titleSize, rgba(titleColor[0], titleColor[1], titleColor[2], 80));
        drawText(ctx, mainTitle, (w - tw) / 2, boxY + h * 0.05, titleSize, rgba(titleColor[0], titleColor[1], titleColor[2], 255));

        // Divider Line
        ctx.strokeStyle = rgba(titleColor[0], titleColor[1], titleColor[2], 100);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(boxX + 25, boxY + h * 0.13);
        ctx.lineTo(boxX + boxW - 25, boxY + h * 0.13);
        ctx.stroke();

        // Score Breakdown
        const b = this.scoreBreakdown || { base: this.score, combo: 0, time: 0, stage: 0, total: this.score };
        const labelSize = h * 0.026;
        const valueSize = h * 0.026;
        const startY = boxY + h * 0.17;
        const lineSpacing = h * 0.048;

        const rows = [
            { label: 'BASE SCORE', val: b.base, highlight: false },
            { label: 'COMBO BONUS', val: b.combo, highlight: false },
            { label: 'TIME BONUS', val: b.time, highlight: false },
            { label: 'STAGE BONUS', val: b.stage, highlight: false },
            { label: 'TOTAL SCORE', val: b.total, highlight: true }
        ];

        rows.forEach((r, idx) => {
            const ry = startY + idx * lineSpacing;
            const lblColor = r.highlight ? rgba(255, 220, 0, 240) : rgba(180, 200, 220, 200);
            const valColor = r.highlight ? rgba(0, 255, 200, 255) : rgba(255, 255, 255, 240);

            drawText(ctx, r.label, boxX + 35, ry, labelSize, lblColor);
            const valStr = String(r.val).padStart(6, '0');
            const vw = textWidth(ctx, valStr, valueSize);
            drawText(ctx, valStr, boxX + boxW - 35 - vw, ry, valueSize, valColor);
        });

        // High score badge
        if (this.isNewHighScore) {
            const hsText = '★ NEW HIGH SCORE! ★';
            const hsSize = h * 0.024;
            const hsw = textWidth(ctx, hsText, hsSize);
            const hsPulse = (Math.sin(this.menuAnimTimer * 6) + 1) * 0.5;
            drawText(ctx, hsText, (w - hsw) / 2, boxY + boxH - h * 0.11, hsSize, rgba(255, 215, 0, 180 + hsPulse * 75));
        }

        // Tap hint
        const hintText = '[ TAP ANYWHERE TO CONTINUE ]';
        const hintSize = h * 0.022;
        const hw = textWidth(ctx, hintText, hintSize);
        const hintPulse = (Math.sin(this.menuAnimTimer * 3) + 1) * 0.5;
        drawText(ctx, hintText, (w - hw) / 2, boxY + boxH - h * 0.05, hintSize, rgba(255, 255, 255, 120 + hintPulse * 120));

        ctx.restore();
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
        ctx.fillRect(sbX, 0, frameThick, h);
        ctx.fillRect(w - frameThick, 0, frameThick, h);
        ctx.fillRect(sbX, 0, sbW, frameThick);
        ctx.fillRect(sbX, h - frameThick, sbW, frameThick);
        ctx.fillRect(sbX, h * 0.25 - frameThick / 2, sbW, frameThick);
        ctx.fillRect(sbX, h * 0.75 - frameThick / 2, sbW, frameThick);

        // ── Chrome reflections & shadows ──
        const reflColor = rgba(220, 225, 235, 140);
        const shadColor = rgba(35, 38, 45, 180);

        ctx.fillStyle = reflColor;
        ctx.fillRect(sbX + frameThick / 2 - 0.75, 0, 1.5, h);
        ctx.fillStyle = shadColor;
        ctx.fillRect(sbX + frameThick / 2 + 1.25, 0, 1.5, h);

        ctx.fillStyle = reflColor;
        ctx.fillRect(w - frameThick / 2 - 0.75, 0, 1.5, h);
        ctx.fillStyle = shadColor;
        ctx.fillRect(w - frameThick / 2 + 1.25, 0, 1.5, h);

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

        // ── Title text (Centered inside Top Panel - RICOCHET ONLY) ──
        const hudTitleSize = h * 0.040;
        const hudTitle = 'RICOCHET';
        const htW = textWidth(ctx, hudTitle, hudTitleSize);
        const htX = sbX + (sbW - htW) / 2;
        const titleY = (h * 0.25 - hudTitleSize) / 2;
        drawText(ctx, hudTitle, htX + 1.5, titleY + 1.5, hudTitleSize, rgba(0, 120, 255, 180));
        drawText(ctx, hudTitle, htX, titleY, hudTitleSize, rgba(255, 220, 0));

        // ── Stats Panel (Mathematically Symmetrical Layout inside Middle Grid) ──
        const headerSize = h * 0.022;
        const valueSize = h * 0.030;
        const bpW = sbW - frameThick * 2 - 14 * (w / 854);
        const bpH = valueSize * 1.30;
        const bpX = sbX + (sbW - bpW) / 2;
        const statX = bpX;
        const txOff = 8 * (w / 854);
        const tyOff = 2.5 * (h / 480);

        const dimLED = rgba(10, 50, 70, 70);
        const brightLED = rgba(0, 240, 255);
        const goldLabel = rgba(255, 220, 0);
        const bpFill = rgba(8, 12, 24);
        const bpOutline = rgba(0, 180, 255, 100);

        // 1. LIVES (Symmetrical margin from top frame)
        const livesLabY = h * 0.2815;
        const livesBoxY = h * 0.3075;
        drawText(ctx, 'LIVES', statX, livesLabY, headerSize, goldLabel);
        ctx.fillStyle = bpFill;
        ctx.fillRect(bpX, livesBoxY, bpW, bpH);
        ctx.strokeStyle = bpOutline;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bpX, livesBoxY, bpW, bpH);

        drawText(ctx, '00', bpX + txOff, livesBoxY + tyOff, valueSize, dimLED);
        drawText(ctx, String(Math.max(0, this.lives)).padStart(2, '0'), bpX + txOff, livesBoxY + tyOff, valueSize, brightLED);

        // 2. TIME
        const timeLabY = h * 0.3745;
        const timeBoxY = h * 0.4005;
        drawText(ctx, 'TIME', statX, timeLabY, headerSize, goldLabel);
        ctx.fillStyle = bpFill;
        ctx.fillRect(bpX, timeBoxY, bpW, bpH);
        ctx.strokeStyle = bpOutline;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bpX, timeBoxY, bpW, bpH);
        drawText(ctx, '88:88', bpX + txOff, timeBoxY + tyOff, valueSize, dimLED);
        const mins = String(Math.floor(this.elapsedTime / 60)).padStart(2, '0');
        const secs = String(Math.floor(this.elapsedTime) % 60).padStart(2, '0');
        drawText(ctx, `${mins}:${secs}`, bpX + txOff, timeBoxY + tyOff, valueSize, brightLED);

        // 3. SCORE
        const scoreLabY = h * 0.4675;
        const scoreBoxY = h * 0.4935;
        drawText(ctx, 'SCORE', statX, scoreLabY, headerSize, goldLabel);
        ctx.fillStyle = bpFill;
        ctx.fillRect(bpX, scoreBoxY, bpW, bpH);
        ctx.strokeStyle = bpOutline;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bpX, scoreBoxY, bpW, bpH);
        drawText(ctx, '888888', bpX + txOff, scoreBoxY + tyOff, valueSize, dimLED);
        drawText(ctx, String(this.score).padStart(6, '0'), bpX + txOff, scoreBoxY + tyOff, valueSize, brightLED);

        // 4. STAGE
        const stageLabY = h * 0.5605;
        const stageBoxY = h * 0.5865;
        drawText(ctx, 'STAGE', statX, stageLabY, headerSize, goldLabel);
        ctx.fillStyle = bpFill;
        ctx.fillRect(bpX, stageBoxY, bpW, bpH);
        ctx.strokeStyle = bpOutline;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bpX, stageBoxY, bpW, bpH);
        drawText(ctx, '00', bpX + txOff, stageBoxY + tyOff, valueSize, dimLED);
        drawText(ctx, String(this.currentLevel + 1).padStart(2, '0'), bpX + txOff, stageBoxY + tyOff, valueSize, brightLED);

        // 5. COMBO (Symmetrical margin to bottom frame)
        const comboLabY = h * 0.6535;
        const comboBoxY = h * 0.6795;
        drawText(ctx, 'COMBO', statX, comboLabY, headerSize, goldLabel);
        ctx.fillStyle = bpFill;
        ctx.fillRect(bpX, comboBoxY, bpW, bpH);
        ctx.strokeStyle = bpOutline;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bpX, comboBoxY, bpW, bpH);
        drawText(ctx, '88', bpX + txOff, comboBoxY + tyOff, valueSize, dimLED);

        const comboColor = this.combo >= 5 ? rgba(255, 50, 255) :
            this.combo >= 3 ? rgba(255, 200, 0) :
                this.combo >= 1 ? rgba(0, 255, 200) : brightLED;
        drawText(ctx, String(this.combo).padStart(2, '0'), bpX + txOff, comboBoxY + tyOff, valueSize, comboColor);

        // ── Bottom panel ──
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
        const rSize = Math.max(2, h * 0.006);
        ctx.save();

        // Rivet body (dark circle)
        ctx.beginPath();
        ctx.arc(rx, ry, rSize, 0, Math.PI * 2);
        ctx.fillStyle = rgba(50, 55, 65);
        ctx.fill();

        // Highlight (top-left)
        ctx.beginPath();
        ctx.arc(rx - rSize * 0.25, ry - rSize * 0.25, rSize * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = rgba(140, 145, 155, 180);
        ctx.fill();

        // Shadow (bottom-right)
        ctx.beginPath();
        ctx.arc(rx + rSize * 0.2, ry + rSize * 0.2, rSize * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = rgba(20, 22, 28, 150);
        ctx.fill();

        // Outer ring
        ctx.beginPath();
        ctx.arc(rx, ry, rSize, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(90, 95, 105);
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.restore();
    }

    drawHeart(ctx, x, y, size, empty = false) {
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        const topCurveHeight = size * 0.3;
        ctx.moveTo(0, topCurveHeight);
        ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
        ctx.bezierCurveTo(-size / 2, size * 0.7, 0, size, 0, size);
        ctx.bezierCurveTo(0, size, size / 2, size * 0.7, size / 2, topCurveHeight);
        ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
        ctx.closePath();

        if (empty) {
            ctx.fillStyle = rgba(40, 20, 30);
            ctx.fill();
            ctx.strokeStyle = rgba(100, 40, 60, 120);
            ctx.lineWidth = 1;
            ctx.stroke();
        } else {
            ctx.fillStyle = rgba(255, 40, 80);
            ctx.fill();
            ctx.strokeStyle = rgba(255, 255, 255, 180);
            ctx.lineWidth = 1;
            ctx.stroke();

            // Reflection
            ctx.beginPath();
            ctx.arc(-size * 0.2, topCurveHeight + 1, size * 0.1, 0, Math.PI * 2);
            ctx.fillStyle = rgba(255, 255, 255, 100);
            ctx.fill();
        }

        ctx.restore();
    }

    drawDiamond(ctx, x, y, size, alpha = 1.0) {
        ctx.save();
        ctx.translate(x, y);

        const halfW = size * 0.6;
        const topH = size * 0.35;
        const bottomH = size * 0.65;
        const tableW = size * 0.35;

        // Glow behind diamond
        const glowRad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.2);
        glowRad.addColorStop(0, rgba(0, 240, 255, 120 * alpha));
        glowRad.addColorStop(1, rgba(0, 120, 255, 0));
        ctx.fillStyle = glowRad;
        ctx.fillRect(-size * 1.2, -size * 1.2, size * 2.4, size * 2.4);

        // Top table facet fill
        ctx.fillStyle = rgba(180, 245, 255, 240 * alpha);
        ctx.beginPath();
        ctx.moveTo(0, -topH);
        ctx.lineTo(-tableW, -topH);
        ctx.lineTo(-halfW * 0.6, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = rgba(220, 255, 255, 255 * alpha);
        ctx.beginPath();
        ctx.moveTo(0, -topH);
        ctx.lineTo(tableW, -topH);
        ctx.lineTo(halfW * 0.6, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();

        // Upper side facets
        ctx.fillStyle = rgba(0, 200, 255, 220 * alpha);
        ctx.beginPath();
        ctx.moveTo(-tableW, -topH);
        ctx.lineTo(-halfW, 0);
        ctx.lineTo(-halfW * 0.6, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = rgba(0, 170, 240, 220 * alpha);
        ctx.beginPath();
        ctx.moveTo(tableW, -topH);
        ctx.lineTo(halfW, 0);
        ctx.lineTo(halfW * 0.6, 0);
        ctx.closePath();
        ctx.fill();

        // Pavilion facets (Bottom triangle facets)
        ctx.fillStyle = rgba(0, 140, 220, 240 * alpha);
        ctx.beginPath();
        ctx.moveTo(-halfW, 0);
        ctx.lineTo(0, bottomH);
        ctx.lineTo(-halfW * 0.6, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = rgba(0, 180, 255, 240 * alpha);
        ctx.beginPath();
        ctx.moveTo(-halfW * 0.6, 0);
        ctx.lineTo(0, bottomH);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = rgba(0, 220, 255, 240 * alpha);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, bottomH);
        ctx.lineTo(halfW * 0.6, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = rgba(0, 120, 200, 240 * alpha);
        ctx.beginPath();
        ctx.moveTo(halfW * 0.6, 0);
        ctx.lineTo(0, bottomH);
        ctx.lineTo(halfW, 0);
        ctx.closePath();
        ctx.fill();

        // Outer crisp outline
        ctx.beginPath();
        ctx.moveTo(-tableW, -topH);
        ctx.lineTo(tableW, -topH);
        ctx.lineTo(halfW, 0);
        ctx.lineTo(0, bottomH);
        ctx.lineTo(-halfW, 0);
        ctx.closePath();
        ctx.strokeStyle = rgba(255, 255, 255, 220 * alpha);
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();
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

        // Clamp delta time to prevent spiral of death or negative time jumps
        if (isNaN(dt) || dt <= 0 || dt > 0.1) dt = 0.016;

        try {
            this.update(dt);
            this.render();
        } catch (e) {
            console.error('[GameLoop Error]', e);
        }

        requestAnimationFrame((t) => this.gameLoop(t));
    }
}

        // ─── Start Game ───────────────────────────────────────

        function initAndStartGame() {
            if (window.__ricochetStarted) return;
            window.__ricochetStarted = true;

            try {
                if (screen.orientation && screen.orientation.lock) {
                    screen.orientation.lock('landscape').catch(() => { });
                }
            } catch (e) { }

            const canvas = document.getElementById('gameCanvas');
            if (canvas) {
                const game = new Game(canvas);
                game.start();
            }
        }

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(initAndStartGame, 10);
        } else {
            window.addEventListener('load', initAndStartGame);
            document.addEventListener('DOMContentLoaded', initAndStartGame);
        }
