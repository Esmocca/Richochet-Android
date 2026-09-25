// Port from C++ SFML to HTML5 Canvas
// Game By: Esmoocca
// Beta Test Version enchanted ui and stages

const GameState = { Menu: 0, Options: 1, Playing: 2, StageClear: 3, GameOver: 4, Paused: 5, Shop: 6 };

const V_WIDTH = 320;
const V_HEIGHT = 240;
const PLAY_AREA_WIDTH = V_WIDTH;

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

        this.state = GameState.Menu;
        this.menuSelectedIndex = 0;
        this.optionSelectedIndex = 0;
        this.pauseSelectedIndex = 0;

        this.paddleColors = [
            { label: 'BLUE', color: [0, 180, 255] },
            { label: 'ORANGE', color: [255, 110, 0] },
            { label: 'RED', color: [255, 60, 60] },
            { label: 'PURPLE', color: [200, 60, 255] },
            { label: 'WHITE', color: [255, 255, 255] },
        ];
        this.selectedColorIndex = 0;

        this.volume = 50;
        this.difficulty = 1; // set on normal difficulty
        this.difficulties = ['EASY', 'NORMAL', 'HARD'];
        this.highScore = 0;

        this.baseSpeed = 130;
        this.currentSpeed = 130;
        this.maxSpeed = 350;
        this.speedMultiplier = 1.0;

        this.paddleWidth = 36;
        this.basePaddleWidth = 36;
        this.paddleHeight = 6;
        this.paddleX = PLAY_AREA_WIDTH / 2;
        this.paddleY = 223;
        this.paddleBounceTimer = 0.3;

        this.balls = [];

        this.bricks = [];
        this.brickSpawnTimer = 0;

        this.score = 0;
        this.elapsedTime = 0;
        this.extraLives = 0;
        this.lives = 3 + this.extraLives;
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

        // Coins (persistent)
        this.coins = 0;
        this.coinDrops = [];

        // Companions
        this.companions = [
            { id: 'linear', name: 'BLITZ', desc: 'Straight projectiles', price: 50, type: 'linear', owned: false, equipped: false, color: [0, 255, 200] },
            { id: 'zigzag', name: 'ZAPPY', desc: 'Zigzag projectiles', price: 75, type: 'zigzag', owned: false, equipped: false, color: [255, 200, 0] },
            { id: 'side', name: 'FLANKER', desc: 'Left & Right shots', price: 100, type: 'side', owned: false, equipped: false, color: [255, 80, 200] }
        ];
        this.equippedCompanion = null;
        this.companionProjectiles = [];
        this.companionFireTimer = 0;
        this.companionFireRate = 1.5;

        // Shop
        this.shopSelectedIndex = 0;
        this.shopFirstVisit = true;
        this.shopAssistantStep = 0;
        this.shopAssistantTimer = 0;
        this.shopCelloAnimTimer = 0;
        this.shopCelloVisible = false;

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
            // Level 2: Diamond (Stage 02)
            {
                data: [
                    [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
                    [0, 1, 2, 2, 1, 2, 1, 2, 2, 1, 0],
                    [1, 2, 2, 2, 1, 2, 1, 2, 2, 2, 1],
                    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                    [0, 1, 2, 2, 1, 2, 1, 2, 2, 1, 0],
                    [0, 0, 1, 2, 1, 2, 1, 2, 1, 0, 0],
                    [0, 0, 0, 1, 1, 2, 1, 1, 0, 0, 0],
                    [0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]
                ],
                colors: [
                    [20, 200, 255],  // 1: Lines/Edges (Cyan)
                    [200, 240, 255]  // 2: Body (Ice White/Light Blue)
                ]
            },
            // Level 3: Flame (Stage 03)
            {
                data: [
                    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0],
                    [0, 0, 0, 1, 2, 2, 2, 1, 0, 0, 0],
                    [0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0],
                    [0, 1, 2, 2, 2, 1, 1, 2, 2, 1, 0],
                    [1, 2, 2, 2, 1, 0, 0, 1, 2, 2, 1],
                    [1, 2, 2, 2, 1, 0, 0, 1, 2, 2, 1],
                    [1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 1],
                    [0, 1, 1, 2, 2, 2, 2, 2, 1, 1, 0],
                    [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0]
                ],
                colors: [
                    [255, 60, 0],   // 1: Outer Red-Orange
                    [255, 160, 0]   // 2: Inner Orange-Yellow
                ]
            },
            // Level 4: Star (Stage 04)
            {
                data: [
                    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0],
                    [0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0],
                    [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
                    [0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0],
                    [0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0],
                    [0, 0, 0, 1, 2, 2, 2, 1, 0, 0, 0],
                    [0, 0, 1, 2, 2, 1, 2, 2, 1, 0, 0],
                    [0, 1, 2, 2, 1, 0, 1, 2, 2, 1, 0],
                    [1, 2, 1, 1, 0, 0, 0, 1, 1, 2, 1],
                    [1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1]
                ],
                colors: [
                    [255, 150, 0],   // 1: Gold/Dark Yellow
                    [255, 230, 0]    // 2: Bright Yellow
                ]
            },
            // Level 5: Skull (Stage 05)
            {
                data: [
                    [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
                    [0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0],
                    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
                    [1, 2, 0, 0, 2, 2, 2, 0, 0, 2, 1],
                    [1, 2, 0, 0, 2, 2, 2, 0, 0, 2, 1],
                    [1, 2, 2, 2, 2, 0, 2, 2, 2, 2, 1],
                    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
                    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
                    [0, 0, 0, 3, 0, 3, 0, 3, 0, 0, 0], // Jaw teeth
                    [0, 0, 0, 3, 3, 3, 3, 3, 0, 0, 0]  // Jaw bottom
                ],
                colors: [
                    [100, 100, 110], // 1: Border
                    [230, 230, 240], // 2: Bone
                    [210, 210, 220]  // 3: Jaw Bone
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
                        scale: 1,
                        isJaw: cell === 3
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
            this.lives = 3 + (this.extraLives || 0);
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
        this.companionProjectiles = [];
        this.companionFireTimer = 0;
        this.coinDrops = [];
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
                highScore: this.highScore,
                coins: this.coins,
                extraLives: this.extraLives || 0,
                ownedCompanions: this.companions.filter(c => c.owned).map(c => c.id),
                equippedCompanion: this.equippedCompanion,
                shopFirstVisit: this.shopFirstVisit,
                btnScale: this.btnScale
            };
            localStorage.setItem('ricochet_settings', JSON.stringify(settings));
            document.getElementById('controls').style.setProperty('--btn-scale', (this.btnScale || 100) / 100);
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
                this.coins = settings.coins ?? 0;
                this.extraLives = settings.extraLives ?? 0;
                this.shopFirstVisit = settings.shopFirstVisit ?? true;
                this.btnScale = settings.btnScale ?? 100;
                if (this.btnScale < 90) this.btnScale = 90;
                if (this.btnScale > 120) this.btnScale = 120;
                this.equippedCompanion = settings.equippedCompanion ?? null;
                document.getElementById('controls').style.setProperty('--btn-scale', this.btnScale / 100);
                if (settings.ownedCompanions) {
                    for (const comp of this.companions) {
                        comp.owned = settings.ownedCompanions.includes(comp.id);
                        comp.equipped = (comp.id === this.equippedCompanion);
                    }
                }
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
        let lastTouchY = 0;
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.audio.tryResumeBGM();
            const touch = e.touches[0];
            lastTouchY = touch.clientY;
            this.handleTap(touch.clientX, touch.clientY);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                e.preventDefault();
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                const nx = (touch.clientX - rect.left) / rect.width;
                const ny = (touch.clientY - rect.top) / rect.height;
                const vx = nx * this.w;
                const vy = ny * this.h;

                if (this.state === GameState.Options) {
                    this.handleOptionsDrag(vx, vy);
                } else if (this.state === GameState.Shop) {
                    const dy = touch.clientY - lastTouchY;
                    const vdy = (dy / rect.height) * this.h;
                    this.shopScrollY = (this.shopScrollY || 0) - vdy;
                    if (this.shopScrollY < 0) this.shopScrollY = 0;
                    const maxScroll = Math.max(0, (this.shopContentH || 0) - (this.h * 0.885));
                    if (this.shopScrollY > maxScroll) this.shopScrollY = maxScroll;
                    lastTouchY = touch.clientY;
                }
            }
        }, { passive: false });

        let isMouseDown = false;
        let lastMouseY = 0;
        this.canvas.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            lastMouseY = e.clientY;
            this.audio.tryResumeBGM();
            this.handleTap(e.clientX, e.clientY);
        });
        this.canvas.addEventListener('mousemove', (e) => {
            if (isMouseDown) {
                const rect = this.canvas.getBoundingClientRect();
                const nx = (e.clientX - rect.left) / rect.width;
                const ny = (e.clientY - rect.top) / rect.height;
                const vx = nx * this.w;
                const vy = ny * this.h;
                if (this.state === GameState.Options) {
                    this.handleOptionsDrag(vx, vy);
                } else if (this.state === GameState.Shop) {
                    const dy = e.clientY - lastMouseY;
                    const vdy = (dy / rect.height) * this.h;
                    this.shopScrollY = (this.shopScrollY || 0) - vdy;
                    if (this.shopScrollY < 0) this.shopScrollY = 0;
                    const maxScroll = Math.max(0, (this.shopContentH || 0) - (this.h * 0.885));
                    if (this.shopScrollY > maxScroll) this.shopScrollY = maxScroll;
                    lastMouseY = e.clientY;
                }
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
            const uiY = this.h * 0.04;
            const iconSize = this.h * 0.055;
            const pBtnX = this.w * 0.03;
            const pBtnY = uiY;
            const pBtnW = iconSize * 1.5;
            const pBtnH = iconSize;
            if (vx >= pBtnX - 10 && vx <= pBtnX + pBtnW + 15 &&
                vy >= pBtnY - 10 && vy <= pBtnY + pBtnH + 15) {
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
        } else if (this.state === GameState.Shop) {
            this.handleShopTap(vx, vy);
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
        const positions = [0.38, 0.49, 0.60, 0.71];

        for (let i = 0; i < 4; i++) {
            const btnY = h * positions[i] - btnH * 0.3;
            if (vx >= btnX && vx <= btnX + btnW && vy >= btnY && vy <= btnY + btnH) {
                this.menuSelectedIndex = i;
                this.audio.init(); this.audio.playBrickSound(0.9);
                if (i === 0) {
                    this.resetBallAndPaddle(true);
                    this.initBricks();
                    this.triggerStateTransition(GameState.Playing);
                } else if (i === 1) {
                    this.shopCelloVisible = true;
                    if (this.shopFirstVisit) {
                        this.shopAssistantStep = 0;
                        this.shopAssistantTimer = 0;
                    } else {
                        this.shopAssistantStep = 4;
                    }
                    this.triggerStateTransition(GameState.Shop);
                } else if (i === 2) {
                    this.triggerStateTransition(GameState.Options);
                } else if (i === 3) {
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
                    this.lives = 3 + (this.extraLives || 0);
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
        // Button Size area
        else if (vy >= boxY + h * 0.37 && vy <= boxY + h * 0.46) {
            this.optionSelectedIndex = 3;
            const barX = boxX + boxW * 0.50;
            const barW = boxW * 0.40;
            this.updateBtnSizeFromPos(vx, barX, barW);
        }
        // BACK button area
        else if (vy >= boxY + boxH * 0.78) {
            this.optionSelectedIndex = 4;
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
        // Button Size row Y region
        else if (vy >= boxY + h * 0.37 && vy <= boxY + h * 0.46) {
            this.optionSelectedIndex = 3;
            const barX = boxX + boxW * 0.50;
            const barW = boxW * 0.40;
            this.updateBtnSizeFromPos(vx, barX, barW);
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

    updateBtnSizeFromPos(vx, barX, barW) {
        let pct = (vx - barX) / barW;
        if (pct < 0) pct = 0;
        if (pct > 1) pct = 1;
        let newSize = 90 + Math.round(pct * 3) * 10;
        if (newSize !== this.btnScale) {
            this.btnScale = newSize;
            if (this.audio) {
                this.audio.init();
                this.audio.playBrickSound(1.1);
            }
            this.saveSettings();
        }
    }

    handleKeyDown(code) {
        this.shopIdleTimer = 0;
        if (this.state === GameState.Menu) {
            if (code === 'ArrowUp') {
                this.menuSelectedIndex = (this.menuSelectedIndex - 1 + 4) % 4;
                this.audio.init(); this.audio.playBrickSound(1.3);
            }
            if (code === 'ArrowDown') {
                this.menuSelectedIndex = (this.menuSelectedIndex + 1) % 4;
                this.audio.init(); this.audio.playBrickSound(1.3);
            }
            if (code === 'Enter' || code === 'Space') {
                this.audio.init(); this.audio.playBrickSound(0.9);
                if (this.menuSelectedIndex === 0) {
                    this.resetBallAndPaddle(true);
                    this.initBricks();
                    this.triggerStateTransition(GameState.Playing);
                } else if (this.menuSelectedIndex === 1) {
                    this.shopCelloVisible = true;
                    if (this.shopFirstVisit) {
                        this.shopAssistantStep = 0;
                        this.shopAssistantTimer = 0;
                    } else {
                        this.shopAssistantStep = 4;
                    }
                    this.triggerStateTransition(GameState.Shop);
                } else if (this.menuSelectedIndex === 2) {
                    this.triggerStateTransition(GameState.Options);
                } else if (this.menuSelectedIndex === 3) {
                    this.exitGame();
                }
            }
        } else if (this.state === GameState.Options) {
            if (code === 'ArrowUp') {
                this.optionSelectedIndex = (this.optionSelectedIndex - 1 + 5) % 5;
                this.audio.init(); this.audio.playBrickSound(1.3);
            }
            if (code === 'ArrowDown') {
                this.optionSelectedIndex = (this.optionSelectedIndex + 1) % 5;
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
                } else if (this.optionSelectedIndex === 3) {
                    this.btnScale = Math.max(90, this.btnScale - 10);
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
                } else if (this.optionSelectedIndex === 3) {
                    this.btnScale = Math.min(120, this.btnScale + 10);
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
        } else if (this.state === GameState.Shop) {
            if (code === 'ArrowLeft') {
                this.shopSelectedIndex = (this.shopSelectedIndex - 1 + this.companions.length) % this.companions.length;
                this.audio.init(); this.audio.playBrickSound(1.3);
            }
            if (code === 'ArrowRight') {
                this.shopSelectedIndex = (this.shopSelectedIndex + 1) % this.companions.length;
                this.audio.init(); this.audio.playBrickSound(1.3);
            }
            if (code === 'Enter' || code === 'Space') {
                if (this.shopCelloVisible) {
                    this.advanceCelloDialog();
                } else {
                    this.handleShopAction();
                }
            }
            if (code === 'Escape') {
                if (this.shopCelloVisible) {
                    this.dismissCello();
                } else {
                    this.audio.init(); this.audio.playBrickSound(0.6);
                    this.triggerStateTransition(GameState.Menu);
                }
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
                    if (this.state === GameState.Shop) {
                        this.shopSelectedIndex = 0;
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
        this.updateCoinDrops(dt);
        this.updateCompanionProjectiles(dt);
        if (this.state === GameState.Shop) {
            this.shopCelloAnimTimer += dt;
            this.shopIdleTimer = (this.shopIdleTimer || 0) + dt;
        }

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
            // Stage movement logic
            let stageOffsetX = 0;
            if (this.currentLevel >= 2 && this.currentLevel <= 4) { // Stages 3, 4, 5
                const speed = (this.currentLevel === 3) ? 3.5 : 2.5; // Star (idx 3) moves slightly faster
                stageOffsetX = Math.sin(this.elapsedTime * speed) * 35; // 35px left and right
            }

            let jawOffsetY = 0;
            if (this.currentLevel === 4) { // Stage 5 (Skull)
                // Jaw opens and closes rapidly
                jawOffsetY = Math.max(0, Math.sin(this.elapsedTime * 8) * 12);
            }

            // Ensure bricks are in final position
            for (const brick of this.bricks) {
                brick.scale = 1;
                brick.x = brick.targetX + stageOffsetX;
                brick.y = brick.targetY + (brick.isJaw ? jawOffsetY : 0);
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
                    }
                    this.extraLives = 0;
                    this.saveSettings();
                    this.audio.init(); this.audio.playGameOver();
                    this.triggerStateTransition(GameState.GameOver);
                } else {
                    this.resetBallAndPaddle(false);
                }
            }

            // Companion fire logic
            if (this.equippedCompanion) {
                this.companionFireTimer += dt;
                if (this.companionFireTimer >= this.companionFireRate) {
                    this.companionFireTimer = 0;
                    this.fireCompanionProjectile();
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

                // Coin drop chance (30%)
                if (Math.random() < 0.30) {
                    this.spawnCoinDrop(brick.x, brick.y);
                }

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
                        this.lives = 3 + (this.extraLives || 0); // Reset lives per stage
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

    // ─── Coin Drops ──────────────────────────────────

    spawnCoinDrop(x, y) {
        this.coinDrops.push({
            x, y,
            vy: 50 + Math.random() * 30,
            vx: (Math.random() - 0.5) * 40,
            rotation: 0,
            rotSpeed: (Math.random() - 0.5) * 8,
            size: 6,
            pulse: Math.random() * Math.PI * 2,
            collected: false,
            lifetime: 0
        });
    }

    updateCoinDrops(dt) {
        if (this.state !== GameState.Playing) return;

        this.coinDrops = this.coinDrops.filter(coin => {
            if (coin.collected) return false;
            coin.lifetime += dt;
            coin.y += coin.vy * dt;
            coin.x += coin.vx * dt;
            coin.rotation += coin.rotSpeed * dt;
            coin.pulse += dt * 5;
            coin.vy += 80 * dt;

            // Paddle collision
            const pLeft = this.paddleX - this.paddleWidth / 2;
            const pRight = this.paddleX + this.paddleWidth / 2;
            const pTop = this.paddleY - this.paddleHeight / 2;

            if (coin.y + coin.size > pTop && coin.y < pTop + 10 &&
                coin.x + coin.size > pLeft && coin.x - coin.size < pRight) {
                coin.collected = true;
                this.coins++;
                this.saveSettings();
                this.audio.init(); this.audio.playBrickSound(1.5);
                this.spawnFloatingText(coin.x, coin.y - 10, '+1 COIN', [255, 215, 0]);
                return false;
            }

            return coin.y < V_HEIGHT + 20;
        });
    }

    drawCoinDrops(ctx) {
        for (const coin of this.coinDrops) {
            ctx.save();
            ctx.translate(coin.x, coin.y);
            ctx.rotate(coin.rotation);

            const pulseScale = 1 + Math.sin(coin.pulse) * 0.15;
            ctx.scale(pulseScale, pulseScale);

            // Coin glow
            const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coin.size * 2);
            glowGrad.addColorStop(0, rgba(255, 215, 0, 80));
            glowGrad.addColorStop(1, rgba(255, 215, 0, 0));
            ctx.fillStyle = glowGrad;
            ctx.fillRect(-coin.size * 2, -coin.size * 2, coin.size * 4, coin.size * 4);

            // Coin body
            ctx.beginPath();
            ctx.arc(0, 0, coin.size / 2, 0, Math.PI * 2);
            ctx.fillStyle = rgba(255, 215, 0);
            ctx.fill();
            ctx.strokeStyle = rgba(255, 255, 200);
            ctx.lineWidth = 1;
            ctx.stroke();

            // Coin inner mark
            ctx.font = '5px PixelFont, monospace';
            ctx.fillStyle = rgba(180, 120, 0);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('C', 0, 0);

            ctx.restore();
        }
    }

    // ─── Companion System ─────────────────────────────

    fireCompanionProjectile() {
        if (!this.equippedCompanion) return;
        const comp = this.companions.find(c => c.id === this.equippedCompanion);
        if (!comp) return;

        const startX = this.paddleX;
        const startY = this.paddleY - 12;

        if (comp.type === 'linear') {
            this.companionProjectiles.push({
                x: startX, y: startY,
                vx: 0, vy: -200,
                type: 'linear',
                color: comp.color,
                size: 3,
                lifetime: 0
            });
        } else if (comp.type === 'zigzag') {
            this.companionProjectiles.push({
                x: startX, y: startY,
                vx: 0, vy: -180,
                type: 'zigzag',
                color: comp.color,
                size: 3,
                lifetime: 0,
                zigzagTimer: 0,
                zigzagDir: 1
            });
        } else if (comp.type === 'side') {
            this.companionProjectiles.push({
                x: startX, y: startY,
                vx: -120, vy: -150,
                type: 'side',
                color: comp.color,
                size: 3,
                lifetime: 0
            });
            this.companionProjectiles.push({
                x: startX, y: startY,
                vx: 120, vy: -150,
                type: 'side',
                color: comp.color,
                size: 3,
                lifetime: 0
            });
        }

        this.audio.init(); this.audio.playBrickSound(1.8);
    }

    updateCompanionProjectiles(dt) {
        if (this.state !== GameState.Playing) return;

        this.companionProjectiles = this.companionProjectiles.filter(proj => {
            proj.lifetime += dt;

            if (proj.type === 'zigzag') {
                proj.zigzagTimer += dt;
                if (proj.zigzagTimer > 0.15) {
                    proj.zigzagTimer = 0;
                    proj.zigzagDir *= -1;
                }
                proj.vx = proj.zigzagDir * 120;
            }

            proj.x += proj.vx * dt;
            proj.y += proj.vy * dt;

            // Out of bounds - NO bouncing
            if (proj.y < -10 || proj.y > V_HEIGHT + 10 || proj.x < -10 || proj.x > PLAY_AREA_WIDTH + 10) {
                return false;
            }

            // Brick collision
            for (const brick of this.bricks) {
                if (brick.destroyed) continue;
                const bLeft = brick.x - brick.w / 2;
                const bRight = brick.x + brick.w / 2;
                const bTop = brick.y - brick.h / 2;
                const bBottom = brick.y + brick.h / 2;

                if (proj.x + proj.size > bLeft && proj.x - proj.size < bRight &&
                    proj.y + proj.size > bTop && proj.y - proj.size < bBottom) {
                    brick.destroyed = true;

                    this.combo++;
                    this.comboTimer = 2.0;
                    const comboMultiplier = Math.min(this.combo, 5);
                    const points = brick.points * comboMultiplier;
                    this.score += points;

                    if (Math.random() < 0.30) {
                        this.spawnCoinDrop(brick.x, brick.y);
                    }

                    this.spawnParticles(brick.x, brick.y, brick.color);
                    this.audio.init(); this.audio.playBrickSound(1.0);

                    if (this.combo >= 2) {
                        this.spawnFloatingText(
                            brick.x, brick.y - 10,
                            `x${this.combo}`,
                            this.combo >= 5 ? [255, 50, 255] : this.combo >= 3 ? [255, 200, 0] : [0, 255, 200]
                        );
                    }

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
                            this.lives = 3 + (this.extraLives || 0);
                            this.resetBallAndPaddle(false);
                            this.initBricks();
                        }
                    }

                    return false; // Projectile destroyed on contact
                }
            }

            return proj.lifetime < 5;
        });
    }

    drawCompanion(ctx) {
        if (this.state !== GameState.Playing && this.state !== GameState.Paused) return;
        if (!this.equippedCompanion) return;
        const comp = this.companions.find(c => c.id === this.equippedCompanion);
        if (!comp) return;

        const cx = this.paddleX;
        const cy = this.paddleY - 14;
        const pulse = Math.sin(this.menuAnimTimer * 4) * 0.2 + 1;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(pulse, pulse);

        const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
        glowGrad.addColorStop(0, rgba(comp.color[0], comp.color[1], comp.color[2], 60));
        glowGrad.addColorStop(1, rgba(comp.color[0], comp.color[1], comp.color[2], 0));
        ctx.fillStyle = glowGrad;
        ctx.fillRect(-10, -10, 20, 20);

        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, 5);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fillStyle = rgba(comp.color[0], comp.color[1], comp.color[2]);
        ctx.fill();
        ctx.strokeStyle = rgba(255, 255, 255, 200);
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(2, 0);
        ctx.lineTo(0, 3);
        ctx.lineTo(-2, 0);
        ctx.closePath();
        ctx.fillStyle = rgba(255, 255, 255, 120);
        ctx.fill();

        ctx.restore();
    }

    drawCompanionProjectiles(ctx) {
        for (const proj of this.companionProjectiles) {
            ctx.save();
            ctx.translate(proj.x, proj.y);

            const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, proj.size * 3);
            glowGrad.addColorStop(0, rgba(proj.color[0], proj.color[1], proj.color[2], 120));
            glowGrad.addColorStop(1, rgba(proj.color[0], proj.color[1], proj.color[2], 0));
            ctx.fillStyle = glowGrad;
            ctx.fillRect(-proj.size * 3, -proj.size * 3, proj.size * 6, proj.size * 6);

            ctx.beginPath();
            ctx.arc(0, 0, proj.size, 0, Math.PI * 2);
            ctx.fillStyle = rgba(proj.color[0], proj.color[1], proj.color[2]);
            ctx.fill();
            ctx.strokeStyle = rgba(255, 255, 255, 200);
            ctx.lineWidth = 0.8;
            ctx.stroke();

            const trailLen = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy) * 0.03;
            const angle = Math.atan2(proj.vy, proj.vx);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-Math.cos(angle) * trailLen, -Math.sin(angle) * trailLen);
            ctx.strokeStyle = rgba(proj.color[0], proj.color[1], proj.color[2], 150);
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.restore();
        }
    }

    // ─── Shop System ──────────────────────────────────

    handleShopTap(vx, vy) {
        this.shopIdleTimer = 0;
        const w = this.w, h = this.h;

        if (this.shopAssistantStep < 4) {
            this.advanceCelloDialog();
            return;
        }

        if (this.shopConfirmType) {
            // Confirm overlay tap
            const cw = w * 0.6;
            const ch = h * 0.35;
            const cx = (w - cw) / 2;
            const cy = (h - ch) / 2;
            const btnW = cw * 0.4;
            const btnH = h * 0.08;
            const btnY = cy + ch - btnH - h * 0.04;
            const btnCancelX = cx + cw * 0.05;
            const btnBuyX = cx + cw * 0.95 - btnW;

            if (vy >= btnY && vy <= btnY + btnH) {
                if (vx >= btnCancelX && vx <= btnCancelX + btnW) {
                    this.shopConfirmType = null;
                    this.audio.init(); this.audio.playBrickSound(0.9);
                } else if (vx >= btnBuyX && vx <= btnBuyX + btnW) {
                    if (this.shopConfirmType === 'companion') {
                        const comp = this.companions[this.shopConfirmIndex];
                        if (comp) {
                            this.coins -= comp.price;
                            comp.owned = true;
                            comp.equipped = true;
                            for (const c of this.companions) {
                                if (c.id !== comp.id) c.equipped = false;
                            }
                            this.equippedCompanion = comp.id;
                            this.saveSettings();
                            this.audio.init(); this.audio.playLevelClear();
                            this.spawnConfetti();
                        }
                    } else if (this.shopConfirmType === 'item') {
                        if (this.shopConfirmIndex === 0) {
                            this.coins -= 25;
                            this.extraLives = Math.min(2, (this.extraLives || 0) + 1);
                            this.lives = 3 + this.extraLives;
                            this.saveSettings();
                            this.audio.init(); this.audio.playLevelClear();
                            this.spawnConfetti();
                        }
                    }
                    this.shopConfirmType = null;
                }
            }
            return;
        }

        // Back button check
        const backBtnW = w * 0.15;
        const backBtnH = h * 0.065;
        const backBtnX = w * 0.02;
        const backBtnY = (h * 0.115 - backBtnH) / 2;
        if (vx >= backBtnX && vx <= backBtnX + backBtnW && vy >= backBtnY && vy <= backBtnY + backBtnH) {
            this.audio.init(); this.audio.playBrickSound(0.6);
            this.triggerStateTransition(GameState.Menu);
            return;
        }

        // Coordinates matching drawShop
        const headerH = h * 0.115;
        const contentY = headerH + 4;
        const scrollOffset = this.shopScrollY || 0;
        let drawY = contentY + 8 - scrollOffset;

        // Skip to Companion Row
        const secLabelSize = h * 0.028;
        drawY += secLabelSize + 12;

        const cardW = w * 0.27;
        const cardH = h * 0.38;
        const cardGap = (w - this.companions.length * cardW) / (this.companions.length + 1);

        for (let i = 0; i < this.companions.length; i++) {
            const cx = cardGap + i * (cardW + cardGap);
            const cy = drawY;
            if (vx >= cx && vx <= cx + cardW && vy >= cy && vy <= cy + cardH) {
                this.shopSelectedIndex = i;
                this.audio.init(); this.audio.playBrickSound(1.1);
                return;
            }

            // Buy/Equip button check if selected
            if (this.shopSelectedIndex === i) {
                const btnY = cy + cardH + 6;
                const btnH = h * 0.055;
                if (vx >= cx && vx <= cx + cardW && vy >= btnY && vy <= btnY + btnH) {
                    this.handleShopAction();
                    return;
                }
            }
        }

        // Skip past companion row to Items
        drawY += cardH + (this.shopSelectedIndex >= 0 ? h * 0.055 + 6 : 0) + 24;
        drawY += secLabelSize + 12;

        // Items grid
        const itemCardW = w * 0.27;
        const itemCardH = h * 0.28;
        const itemGap = (w - 3 * itemCardW) / 4;

        for (let i = 0; i < 3; i++) { // Revive, soon1, soon2
            const col = i % 3;
            const row = Math.floor(i / 3);
            const ix = itemGap + col * (itemCardW + itemGap);
            const iy = drawY + row * (itemCardH + 10);

            if (vx >= ix && vx <= ix + itemCardW && vy >= iy && vy <= iy + itemCardH) {
                if (i === 0) { // Revive
                    if ((this.extraLives || 0) >= 2) {
                        this.audio.init(); this.audio.playHitWallSound();
                    } else if (this.coins >= 25) {
                        this.shopConfirmType = 'item';
                        this.shopConfirmIndex = 0;
                        this.audio.init(); this.audio.playBrickSound(0.9);
                    } else {
                        this.audio.init(); this.audio.playLifeLost();
                    }
                }
                return;
            }
        }
    }

    handleShopAction() {
        const comp = this.companions[this.shopSelectedIndex];
        if (!comp) return;

        if (!comp.owned) {
            if (this.coins >= comp.price) {
                this.shopConfirmType = 'companion';
                this.shopConfirmIndex = this.shopSelectedIndex;
                this.audio.init(); this.audio.playBrickSound(0.9);
            } else {
                this.audio.init(); this.audio.playLifeLost();
            }
        } else {
            if (comp.equipped) {
                comp.equipped = false;
                this.equippedCompanion = null;
            } else {
                for (const c of this.companions) c.equipped = false;
                comp.equipped = true;
                this.equippedCompanion = comp.id;
            }
            this.saveSettings();
            this.audio.init(); this.audio.playBrickSound(1.1);
        }
    }

    advanceCelloDialog() {
        if (this.shopAssistantStep < 4) {
            this.shopAssistantStep++;
            this.shopAssistantTimer = 0;
            this.audio.init(); this.audio.playBrickSound(1.1);
        }
        if (this.shopAssistantStep === 4) {
            this.shopFirstVisit = false;
            this.saveSettings();
        }
    }

    dismissCello() {
        this.shopCelloVisible = false;
        this.shopFirstVisit = false;
        this.saveSettings();
    }

    drawShop(ctx, w, h) {
        if (!this.shopScrollY) this.shopScrollY = 0;

        // ── Header bar ──
        const headerH = h * 0.115;
        const headerGrad = ctx.createLinearGradient(0, 0, 0, headerH);
        headerGrad.addColorStop(0, rgba(40, 20, 0, 240));
        headerGrad.addColorStop(1, rgba(20, 10, 0, 240));
        ctx.fillStyle = headerGrad;
        ctx.fillRect(0, 0, w, headerH);

        ctx.strokeStyle = rgba(255, 140, 0, 120);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, headerH); ctx.lineTo(w, headerH); ctx.stroke();

        // Title
        const titleText = 'SHOP';
        const titleSize = h * 0.060;
        const titleW = textWidth(ctx, titleText, titleSize);
        const bloomPulse = (Math.sin(this.menuAnimTimer * 2.5) + 1) * 0.5;
        drawText(ctx, titleText, (w - titleW) / 2 + 2, h * 0.025 + 2, titleSize, rgba(180, 80, 0, 60));
        drawText(ctx, titleText, (w - titleW) / 2, h * 0.025, titleSize,
            rgba(255, 180 + bloomPulse * 30, 40, 220 + bloomPulse * 35));

        // Coin balance top-right
        const coinBalText = `${this.coins}`;
        const coinBalSize = h * 0.035;
        const coinBalW = textWidth(ctx, coinBalText, coinBalSize);
        const cX = w - coinBalW - w * 0.04;

        ctx.beginPath();
        ctx.arc(cX - h * 0.02, h * 0.038 - coinBalSize * 0.15, h * 0.02, 0, Math.PI * 2);
        ctx.fillStyle = rgba(255, 215, 0); ctx.fill();
        ctx.strokeStyle = rgba(255, 255, 255, 180); ctx.lineWidth = 2; ctx.stroke();

        drawText(ctx, coinBalText, cX, h * 0.038, coinBalSize, rgba(255, 210, 0, 230));

        // ── Scrollable content area ──
        const contentY = headerH + 4;
        const contentH = h - headerH - 4; // Use full height minus header

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, contentY, w, contentH);
        ctx.clip();

        const scrollOffset = this.shopScrollY || 0;
        let drawY = contentY + 8 - scrollOffset;

        // ── Section: COMPANION ──
        const secLabelSize = h * 0.028;
        drawText(ctx, '  COMPANION', w * 0.02, drawY + 2, secLabelSize, rgba(255, 180, 60, 220));
        ctx.strokeStyle = rgba(255, 140, 0, 60);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w * 0.02, drawY + secLabelSize + 4);
        ctx.lineTo(w * 0.98, drawY + secLabelSize + 4);
        ctx.stroke();
        drawY += secLabelSize + 12;

        // Companion cards row
        const cardW = w * 0.27;
        const cardH = h * 0.38;
        const cardGap = (w - this.companions.length * cardW) / (this.companions.length + 1);
        const compRowStartY = drawY;

        for (let i = 0; i < this.companions.length; i++) {
            const comp = this.companions[i];
            const cx = cardGap + i * (cardW + cardGap);
            const cy = drawY;
            const selected = this.shopSelectedIndex === i;

            // Card background
            const bgA = selected ? 55 : 22;
            fillRoundedRect(ctx, cx, cy, cardW, cardH, 8,
                rgba(comp.color[0], comp.color[1], comp.color[2], bgA));

            // Border
            const bA = selected ? 220 + Math.sin(this.menuAnimTimer * 5) * 35 : 55;
            drawRoundedRect(ctx, cx, cy, cardW, cardH, 8);
            ctx.strokeStyle = rgba(comp.color[0], comp.color[1], comp.color[2], bA);
            ctx.lineWidth = selected ? 2.5 : 1;
            ctx.stroke();

            // Outer glow if selected
            if (selected) {
                drawRoundedRect(ctx, cx - 3, cy - 3, cardW + 6, cardH + 6, 10);
                ctx.strokeStyle = rgba(comp.color[0], comp.color[1], comp.color[2],
                    30 + Math.sin(this.menuAnimTimer * 4) * 15);
                ctx.lineWidth = 4;
                ctx.stroke();
            }

            // Top glass shine
            const shine = ctx.createLinearGradient(cx, cy, cx, cy + cardH * 0.35);
            shine.addColorStop(0, rgba(255, 255, 255, selected ? 20 : 8));
            shine.addColorStop(1, rgba(255, 255, 255, 0));
            fillRoundedRect(ctx, cx + 1, cy + 1, cardW - 2, cardH * 0.35, 7, shine);

            // Icon
            const iconX = cx + cardW / 2;
            const iconY = cy + cardH * 0.24;
            const iSz = Math.min(cardW, cardH) * 0.28;
            const iPulse = selected ? 1 + Math.sin(this.menuAnimTimer * 3) * 0.12 : 1;

            ctx.save();
            ctx.translate(iconX, iconY);
            ctx.scale(iPulse, iPulse);

            // Diamond icon
            ctx.beginPath();
            ctx.moveTo(0, -iSz); ctx.lineTo(iSz * 0.7, 0);
            ctx.lineTo(0, iSz); ctx.lineTo(-iSz * 0.7, 0);
            ctx.closePath();
            ctx.fillStyle = rgba(comp.color[0], comp.color[1], comp.color[2]);
            ctx.fill();
            ctx.strokeStyle = rgba(255, 255, 255, 180);
            ctx.lineWidth = 1.2; ctx.stroke();

            // Inner shine
            ctx.beginPath();
            ctx.moveTo(0, -iSz * 0.5); ctx.lineTo(iSz * 0.3, 0);
            ctx.lineTo(0, iSz * 0.5); ctx.lineTo(-iSz * 0.3, 0);
            ctx.closePath();
            ctx.fillStyle = rgba(255, 255, 255, 70); ctx.fill();

            // Projectile indicator
            ctx.strokeStyle = rgba(comp.color[0], comp.color[1], comp.color[2], 200);
            ctx.lineWidth = 1.8;
            if (comp.type === 'linear') {
                ctx.beginPath(); ctx.moveTo(0, -iSz - 4); ctx.lineTo(0, -iSz - 16); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-3, -iSz - 13); ctx.lineTo(0, -iSz - 18); ctx.lineTo(3, -iSz - 13); ctx.stroke();
            } else if (comp.type === 'zigzag') {
                ctx.beginPath();
                ctx.moveTo(0, -iSz - 2); ctx.lineTo(-5, -iSz - 8);
                ctx.lineTo(5, -iSz - 14); ctx.lineTo(0, -iSz - 20);
                ctx.stroke();
            } else if (comp.type === 'side') {
                ctx.beginPath(); ctx.moveTo(-3, -iSz - 4); ctx.lineTo(-10, -iSz - 16); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-4, -iSz - 14); ctx.lineTo(-12, -iSz - 18); ctx.lineTo(-8, -iSz - 11); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(3, -iSz - 4); ctx.lineTo(10, -iSz - 16); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(4, -iSz - 14); ctx.lineTo(12, -iSz - 18); ctx.lineTo(8, -iSz - 11); ctx.stroke();
            }
            ctx.restore();

            // Name
            const nameSize = h * 0.028;
            const nameW = textWidth(ctx, comp.name, nameSize);
            drawText(ctx, comp.name, cx + (cardW - nameW) / 2, cy + cardH * 0.52,
                nameSize, rgba(255, 255, 255, selected ? 255 : 180));

            // Description
            const cDescSize = h * 0.020;
            const cDescW = textWidth(ctx, comp.desc, cDescSize);
            drawText(ctx, comp.desc, cx + (cardW - cDescW) / 2, cy + cardH * 0.65,
                cDescSize, rgba(180, 200, 220, selected ? 220 : 140));

            // Status/Price
            const statusY = cy + cardH * 0.82; // Moved down to make room for desc
            if (comp.owned) {
                const sLabel = comp.equipped ? 'EQUIPPED' : 'OWNED';
                const sColor = comp.equipped ? rgba(80, 255, 180) : rgba(150, 200, 255);
                const sSize = h * 0.022;
                const sW = textWidth(ctx, sLabel, sSize);
                drawText(ctx, sLabel, cx + (cardW - sW) / 2, statusY, sSize, sColor);
            } else {
                const priceText = `${comp.price}`;
                const priceSize = h * 0.026;
                const priceW = textWidth(ctx, priceText, priceSize);
                const canAfford = this.coins >= comp.price;
                const px = cx + (cardW - priceW) / 2 + h * 0.015;

                ctx.beginPath();
                ctx.arc(px - h * 0.018, statusY - priceSize * 0.30, h * 0.015, 0, Math.PI * 2);
                ctx.fillStyle = rgba(255, 215, 0); ctx.fill();
                ctx.strokeStyle = rgba(255, 255, 255, 150); ctx.lineWidth = 1; ctx.stroke();

                drawText(ctx, priceText, px, statusY, priceSize,
                    canAfford ? rgba(255, 210, 0) : rgba(255, 70, 70));
            }

            // Action button below card (selected only)
            if (selected) {
                const btnY = cy + cardH + 6;
                const btnH = h * 0.055;
                let btnText, btnColor;
                if (!comp.owned) {
                    btnText = this.coins >= comp.price ? 'BUY' : 'NOT ENOUGH';
                    btnColor = this.coins >= comp.price ? [80, 255, 180] : [255, 70, 70];
                } else {
                    btnText = comp.equipped ? 'UNEQUIP' : 'EQUIP';
                    btnColor = comp.equipped ? [255, 200, 50] : [80, 200, 255];
                }
                fillRoundedRect(ctx, cx, btnY, cardW, btnH, 4,
                    rgba(btnColor[0], btnColor[1], btnColor[2], 40));
                drawRoundedRect(ctx, cx, btnY, cardW, btnH, 4);
                ctx.strokeStyle = rgba(btnColor[0], btnColor[1], btnColor[2], 200);
                ctx.lineWidth = 1.8; ctx.stroke();
                const bfSize = h * 0.026;
                const bfW = textWidth(ctx, btnText, bfSize);
                drawText(ctx, btnText, cx + (cardW - bfW) / 2, btnY + (btnH - bfSize) / 2, bfSize, rgba(255, 255, 255));
            }
        }

        // Move drawY past companion row + button
        drawY += cardH + (this.shopSelectedIndex >= 0 ? h * 0.055 + 6 : 0) + 24;

        // ── Section: ITEMS ──
        drawText(ctx, '  ITEMS', w * 0.02, drawY + 2, secLabelSize, rgba(255, 180, 60, 220));
        ctx.strokeStyle = rgba(255, 140, 0, 60);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w * 0.02, drawY + secLabelSize + 4);
        ctx.lineTo(w * 0.98, drawY + secLabelSize + 4);
        ctx.stroke();
        drawY += secLabelSize + 12;

        // Items grid (2 columns)
        const itemCardW = w * 0.27;
        const itemCardH = h * 0.35;
        const itemGap = (w - 3 * itemCardW) / 4;

        const shopItems = [
            { id: 'revive', name: 'REVIVE', desc: '+1 Life', price: 25, icon: '\u2665', color: [255, 80, 120], available: true },
            { id: 'soon1', name: 'COMING', desc: 'SOON', price: null, icon: '?', color: [100, 100, 130], available: false },
            { id: 'soon2', name: 'COMING', desc: 'SOON', price: null, icon: '?', color: [100, 100, 130], available: false },
        ];

        for (let i = 0; i < shopItems.length; i++) {
            const item = shopItems[i];
            const col = i % 3;
            const row = Math.floor(i / 3);
            const ix = itemGap + col * (itemCardW + itemGap);
            const iy = drawY + row * (itemCardH + 10);

            const iAvail = item.available;
            const iBg = iAvail ? 22 : 10;
            fillRoundedRect(ctx, ix, iy, itemCardW, itemCardH, 7,
                rgba(item.color[0], item.color[1], item.color[2], iBg));
            drawRoundedRect(ctx, ix, iy, itemCardW, itemCardH, 7);
            ctx.strokeStyle = rgba(item.color[0], item.color[1], item.color[2], iAvail ? 80 : 35);
            ctx.lineWidth = 1; ctx.stroke();

            // Icon
            const iconFontSize = h * 0.060;
            const iconW = textWidth(ctx, item.icon, iconFontSize);
            drawText(ctx, item.icon, ix + (itemCardW - iconW) / 2, iy + itemCardH * 0.18,
                iconFontSize, rgba(item.color[0], item.color[1], item.color[2], iAvail ? 220 : 80));

            // Name
            const iNameSize = h * 0.024;
            const iNameW = textWidth(ctx, item.name, iNameSize);
            drawText(ctx, item.name, ix + (itemCardW - iNameW) / 2, iy + itemCardH * 0.57,
                iNameSize, rgba(255, 255, 255, iAvail ? 200 : 90));

            // Desc / Price
            if (iAvail && item.price != null) {
                const descText = item.desc;
                const descSize = h * 0.020;
                const descW = textWidth(ctx, descText, descSize);
                drawText(ctx, descText, ix + (itemCardW - descW) / 2, iy + itemCardH * 0.70,
                    descSize, rgba(180, 200, 220, 160));

                const iPriceText = `${item.price}`;
                const iPriceSize = h * 0.022;
                const iPriceW = textWidth(ctx, iPriceText, iPriceSize);
                const px = ix + (itemCardW - iPriceW) / 2 + h * 0.015;

                ctx.beginPath();
                ctx.arc(px - h * 0.018, iy + itemCardH * 0.88 - iPriceSize * 0.30, h * 0.015, 0, Math.PI * 2);
                ctx.fillStyle = rgba(255, 215, 0); ctx.fill();
                ctx.strokeStyle = rgba(255, 255, 255, 150); ctx.lineWidth = 1; ctx.stroke();

                drawText(ctx, iPriceText, px, iy + itemCardH * 0.88,
                    iPriceSize, this.coins >= item.price ? rgba(255, 210, 0) : rgba(255, 70, 70));
            } else {
                const descSize = h * 0.020;
                const descW = textWidth(ctx, item.desc, descSize);
                drawText(ctx, item.desc, ix + (itemCardW - descW) / 2, iy + itemCardH * 0.75,
                    descSize, rgba(item.color[0], item.color[1], item.color[2], 80));
            }
        }

        // Save total content height for scroll clamping
        this.shopContentH = (drawY + scrollOffset) - contentY + itemCardH + 20;

        ctx.restore(); // end clip

        // ── Scroll indicator (right edge) ──
        const totalContent = itemCardH + drawY + 20 - contentY;
        if (totalContent > contentH) {
            const trackX = w - 6;
            const trackH = contentH;
            const thumbH = Math.max(30, (contentH / totalContent) * trackH);
            const thumbY = contentY + (scrollOffset / (totalContent - contentH)) * (trackH - thumbH);
            ctx.fillStyle = rgba(255, 140, 0, 25);
            ctx.fillRect(trackX - 2, contentY, 4, trackH);
            ctx.fillStyle = rgba(255, 140, 0, 140);
            fillRoundedRect(ctx, trackX - 2, thumbY, 4, thumbH, 2, rgba(255, 140, 0, 180));
        }

        // ── Back button ──
        const backBtnW = w * 0.15;
        const backBtnH = h * 0.065;
        const backBtnX = w * 0.02;
        const backBtnY = (headerH - backBtnH) / 2;

        fillRoundedRect(ctx, backBtnX, backBtnY, backBtnW, backBtnH, 5, rgba(255, 120, 0, 20));
        drawRoundedRect(ctx, backBtnX, backBtnY, backBtnW, backBtnH, 5);
        ctx.strokeStyle = rgba(255, 140, 0, 100);
        ctx.lineWidth = 1.5; ctx.stroke();

        const backText = '< BACK';
        const backFontSize = h * 0.028;
        const backW2 = textWidth(ctx, backText, backFontSize);
        drawText(ctx, backText, backBtnX + (backBtnW - backW2) / 2, backBtnY + (backBtnH - backFontSize) / 2,
            backFontSize, rgba(220, 170, 60));

        // Cello assistant overlay
        if (this.shopCelloVisible) {
            this.drawCelloAssistant(ctx, w, h);
        }

        // Confirm Buy Overlay
        if (this.shopConfirmType) {
            ctx.fillStyle = rgba(0, 5, 15, 180);
            ctx.fillRect(0, 0, w, h);

            const cw = w * 0.6;
            const ch = h * 0.35;
            const cx = (w - cw) / 2;
            const cy = (h - ch) / 2;

            fillRoundedRect(ctx, cx, cy, cw, ch, 8, rgba(20, 30, 45, 240));
            drawRoundedRect(ctx, cx, cy, cw, ch, 8);
            ctx.strokeStyle = rgba(255, 150, 50, 200);
            ctx.lineWidth = 2;
            ctx.stroke();

            const cTitle = 'CONFIRM BUY?';
            const cTSize = h * 0.04;
            const cTW = textWidth(ctx, cTitle, cTSize);
            drawText(ctx, cTitle, cx + (cw - cTW) / 2, cy + h * 0.04, cTSize, rgba(255, 200, 100));

            const btnW = cw * 0.4;
            const btnH = h * 0.08;
            const btnY = cy + ch - btnH - h * 0.04;

            const btnCancelX = cx + cw * 0.05;
            fillRoundedRect(ctx, btnCancelX, btnY, btnW, btnH, 4, rgba(100, 50, 50, 200));
            drawRoundedRect(ctx, btnCancelX, btnY, btnW, btnH, 4);
            ctx.strokeStyle = rgba(255, 100, 100); ctx.lineWidth = 1.5; ctx.stroke();
            const lCancel = 'CANCEL';
            const lCSize = h * 0.025;
            const lCW = textWidth(ctx, lCancel, lCSize);
            drawText(ctx, lCancel, btnCancelX + (btnW - lCW) / 2, btnY + (btnH - lCSize) / 2, lCSize, rgba(255, 180, 180));

            const btnBuyX = cx + cw * 0.95 - btnW;
            fillRoundedRect(ctx, btnBuyX, btnY, btnW, btnH, 4, rgba(50, 100, 50, 200));
            drawRoundedRect(ctx, btnBuyX, btnY, btnW, btnH, 4);
            ctx.strokeStyle = rgba(100, 255, 100); ctx.lineWidth = 1.5; ctx.stroke();
            const lBuy = 'BUY';
            const lBSize = h * 0.025;
            const lBW = textWidth(ctx, lBuy, lBSize);
            drawText(ctx, lBuy, btnBuyX + (btnW - lBW) / 2, btnY + (btnH - lBSize) / 2, lBSize, rgba(180, 255, 180));
        }
    }

    drawCelloAssistant(ctx, w, h) {


        const titlePulse = (Math.sin(this.menuAnimTimer * 3) + 1) * 0.5;
        drawText(ctx, titleText, (w - titleW) / 2 + 2, h * 0.06 + 2, titleSize, rgba(255, 200, 0, 60));
        drawText(ctx, titleText, (w - titleW) / 2, h * 0.06, titleSize, rgba(255, 220, 0, 200 + titlePulse * 55));

        // Coin balance
        const balText = `COINS: ${this.coins}`;
        const balSize = h * 0.028;
        const balW = textWidth(ctx, balText, balSize);
        drawText(ctx, balText, (w - balW) / 2, h * 0.14, balSize, rgba(255, 215, 0));

        // Companion cards
        const cardW = w * 0.22;
        const cardH = h * 0.45;
        const cardSpacing = w * 0.025;
        const totalCardsW = this.companions.length * cardW + (this.companions.length - 1) * cardSpacing;
        const startX = (w - totalCardsW) / 2;
        const cardY = h * 0.22;

        for (let i = 0; i < this.companions.length; i++) {
            const comp = this.companions[i];
            const cx = startX + i * (cardW + cardSpacing);
            const selected = this.shopSelectedIndex === i;

            // Card glass panel
            const bgAlpha = selected ? 50 : 25;
            fillRoundedRect(ctx, cx, cardY, cardW, cardH, 6,
                rgba(comp.color[0], comp.color[1], comp.color[2], bgAlpha));

            // Border
            const borderAlpha = selected ? 220 : 60;
            const pulseAlpha = selected ? borderAlpha + Math.sin(this.menuAnimTimer * 5) * 40 : borderAlpha;
            drawRoundedRect(ctx, cx, cardY, cardW, cardH, 6);
            ctx.strokeStyle = rgba(comp.color[0], comp.color[1], comp.color[2], pulseAlpha);
            ctx.lineWidth = selected ? 2.5 : 1;
            ctx.stroke();

            if (selected) {
                drawRoundedRect(ctx, cx - 3, cardY - 3, cardW + 6, cardH + 6, 8);
                ctx.strokeStyle = rgba(comp.color[0], comp.color[1], comp.color[2], 40 + Math.sin(this.menuAnimTimer * 4) * 20);
                ctx.lineWidth = 3;
                ctx.stroke();
            }

            // Scanlines
            ctx.save();
            drawRoundedRect(ctx, cx, cardY, cardW, cardH, 6);
            ctx.clip();
            const scanOffset = (this.menuAnimTimer * 25) % 6;
            ctx.strokeStyle = rgba(255, 255, 255, 6);
            ctx.lineWidth = 0.5;
            for (let sy = scanOffset; sy < cardH; sy += 3) {
                ctx.beginPath();
                ctx.moveTo(cx, cardY + sy);
                ctx.lineTo(cx + cardW, cardY + sy);
                ctx.stroke();
            }
            ctx.restore();

            // Top highlight
            const hlGrad = ctx.createLinearGradient(cx, cardY, cx, cardY + cardH * 0.3);
            hlGrad.addColorStop(0, rgba(255, 255, 255, selected ? 25 : 10));
            hlGrad.addColorStop(1, rgba(255, 255, 255, 0));
            fillRoundedRect(ctx, cx + 1, cardY + 1, cardW - 2, cardH * 0.3, 5, hlGrad);

            // Companion icon
            const iconCenterX = cx + cardW / 2;
            const iconCenterY = cardY + cardH * 0.22;
            const iconSize = h * 0.09;

            const iconGlow = ctx.createRadialGradient(iconCenterX, iconCenterY, 0, iconCenterX, iconCenterY, iconSize);
            iconGlow.addColorStop(0, rgba(comp.color[0], comp.color[1], comp.color[2], 80));
            iconGlow.addColorStop(1, rgba(comp.color[0], comp.color[1], comp.color[2], 0));
            ctx.fillStyle = iconGlow;
            ctx.fillRect(iconCenterX - iconSize, iconCenterY - iconSize, iconSize * 2, iconSize * 2);

            ctx.save();
            ctx.translate(iconCenterX, iconCenterY);
            const iconPulse = selected ? (Math.sin(this.menuAnimTimer * 3) * 0.15 + 1) : 1;
            ctx.scale(iconPulse, iconPulse);

            const dSize = iconSize * 0.5;
            ctx.beginPath();
            ctx.moveTo(0, -dSize);
            ctx.lineTo(dSize * 0.7, 0);
            ctx.lineTo(0, dSize);
            ctx.lineTo(-dSize * 0.7, 0);
            ctx.closePath();
            ctx.fillStyle = rgba(comp.color[0], comp.color[1], comp.color[2]);
            ctx.fill();
            ctx.strokeStyle = rgba(255, 255, 255, 200);
            ctx.lineWidth = 1.2;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, -dSize * 0.5);
            ctx.lineTo(dSize * 0.3, 0);
            ctx.lineTo(0, dSize * 0.5);
            ctx.lineTo(-dSize * 0.3, 0);
            ctx.closePath();
            ctx.fillStyle = rgba(255, 255, 255, 80);
            ctx.fill();

            // Projectile type indicator
            if (comp.type === 'linear') {
                ctx.strokeStyle = rgba(comp.color[0], comp.color[1], comp.color[2], 180);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -dSize - 5);
                ctx.lineTo(0, -dSize - 15);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-3, -dSize - 12);
                ctx.lineTo(0, -dSize - 17);
                ctx.lineTo(3, -dSize - 12);
                ctx.stroke();
            } else if (comp.type === 'zigzag') {
                ctx.strokeStyle = rgba(comp.color[0], comp.color[1], comp.color[2], 180);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -dSize - 3);
                ctx.lineTo(-5, -dSize - 8);
                ctx.lineTo(5, -dSize - 13);
                ctx.lineTo(0, -dSize - 18);
                ctx.stroke();
            } else if (comp.type === 'side') {
                ctx.strokeStyle = rgba(comp.color[0], comp.color[1], comp.color[2], 180);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-dSize * 0.7 - 3, 0);
                ctx.lineTo(-dSize * 0.7 - 13, 0);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-dSize * 0.7 - 10, -3);
                ctx.lineTo(-dSize * 0.7 - 15, 0);
                ctx.lineTo(-dSize * 0.7 - 10, 3);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(dSize * 0.7 + 3, 0);
                ctx.lineTo(dSize * 0.7 + 13, 0);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(dSize * 0.7 + 10, -3);
                ctx.lineTo(dSize * 0.7 + 15, 0);
                ctx.lineTo(dSize * 0.7 + 10, 3);
                ctx.stroke();
            }

            ctx.restore();

            // Name
            const nameSize = h * 0.032;
            const nameW = textWidth(ctx, comp.name, nameSize);
            drawText(ctx, comp.name, cx + (cardW - nameW) / 2, cardY + cardH * 0.48, nameSize,
                rgba(255, 255, 255, selected ? 255 : 180));

            // Description
            const descSize = h * 0.019;
            const descW = textWidth(ctx, comp.desc, descSize);
            drawText(ctx, comp.desc, cx + (cardW - descW) / 2, cardY + cardH * 0.58, descSize,
                rgba(180, 200, 220, selected ? 220 : 140));

            // Status / Price
            const statusY = cardY + cardH * 0.72;
            if (comp.owned) {
                if (comp.equipped) {
                    const eqText = 'EQUIPPED';
                    const eqSize = h * 0.024;
                    const eqW = textWidth(ctx, eqText, eqSize);
                    drawText(ctx, eqText, cx + (cardW - eqW) / 2, statusY, eqSize, rgba(0, 255, 180));
                } else {
                    const ownText = 'OWNED';
                    const ownSize = h * 0.024;
                    const ownW = textWidth(ctx, ownText, ownSize);
                    drawText(ctx, ownText, cx + (cardW - ownW) / 2, statusY, ownSize, rgba(150, 200, 255));
                }
            } else {
                const priceText = `${comp.price} COINS`;
                const priceSize = h * 0.028;
                const priceW = textWidth(ctx, priceText, priceSize);
                const canAfford = this.coins >= comp.price;
                drawText(ctx, priceText, cx + (cardW - priceW) / 2, statusY, priceSize,
                    canAfford ? rgba(255, 215, 0) : rgba(255, 60, 60));
            }

            // Action button (selected card only)
            if (selected) {
                const btnY = cardY + cardH + h * 0.03;
                const btnH2 = h * 0.065;
                let btnText, btnColor;

                if (!comp.owned) {
                    btnText = this.coins >= comp.price ? 'BUY' : 'NOT ENOUGH';
                    btnColor = this.coins >= comp.price ? [0, 255, 180] : [255, 60, 60];
                } else {
                    btnText = comp.equipped ? 'UNEQUIP' : 'EQUIP';
                    btnColor = comp.equipped ? [255, 200, 0] : [0, 200, 255];
                }

                fillRoundedRect(ctx, cx, btnY, cardW, btnH2, 4,
                    rgba(btnColor[0], btnColor[1], btnColor[2], 40));
                drawRoundedRect(ctx, cx, btnY, cardW, btnH2, 4);
                ctx.strokeStyle = rgba(btnColor[0], btnColor[1], btnColor[2], 200);
                ctx.lineWidth = 2;
                ctx.stroke();

                const btnFontSize = h * 0.028;
                const btnTextW = textWidth(ctx, btnText, btnFontSize);
                drawText(ctx, btnText, cx + (cardW - btnTextW) / 2, btnY + (btnH2 - btnFontSize) / 2, btnFontSize,
                    rgba(255, 255, 255));
            }
        }

        // Back button
        const backBtnW = w * 0.18;
        const backBtnH = h * 0.06;
        const backBtnX = (w - backBtnW) / 2;
        const backBtnY = h * 0.88;

        fillRoundedRect(ctx, backBtnX, backBtnY, backBtnW, backBtnH, 4,
            rgba(0, 180, 255, 20));
        drawRoundedRect(ctx, backBtnX, backBtnY, backBtnW, backBtnH, 4);
        ctx.strokeStyle = rgba(0, 180, 255, 120);
        ctx.lineWidth = 1;
        ctx.stroke();

        const backText = 'BACK';
        const backFontSize = h * 0.030;
        const backW2 = textWidth(ctx, backText, backFontSize);
        drawText(ctx, backText, (w - backW2) / 2, backBtnY + (backBtnH - backFontSize) / 2, backFontSize,
            rgba(200, 200, 200));

        // Help text
        const helpText = '[ Tap card / Arrows + Enter ]';
        const helpSize = h * 0.020;
        const helpW = textWidth(ctx, helpText, helpSize);
        drawText(ctx, helpText, (w - helpW) / 2, h * 0.95, helpSize, rgba(140, 140, 140));

        // Cello assistant overlay
        if (this.shopCelloVisible) {
            this.drawCelloAssistant(ctx, w, h);
        }
    }

    drawCelloAssistant(ctx, w, h) {
        const isHelp = this.shopAssistantStep >= 4;

        if (!isHelp) {
            // Semi-transparent overlay only during tutorial
            ctx.fillStyle = rgba(0, 0, 0, 160);
            ctx.fillRect(0, 0, w, h);
        }

        const dialogs = [
            'Hi there! I am Cello, your shop assistant!\nWelcome to the Companion Shop!',
            'Here you can buy Companions that will\nhelp you destroy blocks with projectiles!',
            'Each companion fires differently:\nLinear - Zigzag - Side shots!',
            'Collect coins from breaking blocks\nto buy them. Let us go shopping!',
            'Any help?'
        ];

        const step = Math.min(this.shopAssistantStep, dialogs.length - 1);
        const dialog = dialogs[step];

        // Cello character
        const celloX = isHelp ? w * 0.88 : w * 0.75;
        const celloY = isHelp ? h * 0.82 : h * 0.35;

        ctx.save();
        ctx.translate(celloX, celloY);

        const bobY = Math.sin(this.shopCelloAnimTimer * 3) * 5;
        ctx.translate(0, bobY);

        // Shadow
        ctx.beginPath();
        ctx.ellipse(0, 45, 25, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = rgba(0, 0, 0, 60);
        ctx.fill();

        // Body
        fillRoundedRect(ctx, -20, -10, 40, 50, 8, rgba(60, 200, 255));
        drawRoundedRect(ctx, -20, -10, 40, 50, 8);
        ctx.strokeStyle = rgba(100, 230, 255, 200);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Face screen
        fillRoundedRect(ctx, -15, -5, 30, 25, 4, rgba(10, 20, 40));

        // Expressions
        const isSleeping = this.shopIdleTimer > 5.0; // 5 seconds idle
        const blinkPhase = this.shopCelloAnimTimer % 4;
        const isBlinking = blinkPhase > 3.7 && blinkPhase < 3.9;

        if (isSleeping) {
            // Sleeping expression (closed eyes zZz)
            ctx.strokeStyle = rgba(0, 255, 200);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-9, 7); ctx.lineTo(-6, 9); ctx.lineTo(-3, 7);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(3, 7); ctx.lineTo(6, 9); ctx.lineTo(9, 7);
            ctx.stroke();

            // Zzz text floating
            const zBob = Math.sin(this.shopCelloAnimTimer * 2) * 5;
            drawText(ctx, 'Z', 10, -20 + zBob, h * 0.015, rgba(0, 255, 200, 200));
            drawText(ctx, 'z', 18, -25 + zBob, h * 0.010, rgba(0, 255, 200, 150));
        } else if (isBlinking) {
            ctx.fillStyle = rgba(0, 255, 200);
            ctx.fillRect(-9, 6, 6, 2);
            ctx.fillRect(3, 6, 6, 2);
        } else {
            const cycle = this.shopCelloAnimTimer % 6;
            let lookX = 0;
            let lookY = 0;
            if (cycle < 1) { // Look Up
                lookY = -1.5;
            } else if (cycle > 3 && cycle < 4) { // Look Down
                lookY = 1.5;
            } else if (cycle > 4.5 && cycle < 5) { // Smile/Happy
                ctx.strokeStyle = rgba(0, 255, 200);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-9, 8); ctx.lineTo(-6, 6); ctx.lineTo(-3, 8);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(3, 8); ctx.lineTo(6, 6); ctx.lineTo(9, 8);
                ctx.stroke();
                lookX = null; // Skip drawing normal eyes
            }

            if (lookX !== null) {
                // Happy/Normal eyes without pupils
                ctx.beginPath();
                ctx.arc(-6 + lookX, 7 + lookY, 3, 0, Math.PI * 2);
                ctx.fillStyle = rgba(0, 255, 200);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(6 + lookX, 7 + lookY, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Mouth (Smile)
        if (isSleeping) {
            ctx.beginPath();
            ctx.arc(0, 15, 3, 0, Math.PI * 2);
            ctx.fillStyle = rgba(0, 255, 200, 150);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(0, 12, 5, 0.1 * Math.PI, 0.9 * Math.PI);
            ctx.strokeStyle = rgba(0, 255, 200);
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }

        // Name tag
        const nameTag = 'CELLO';
        const nameSize = h * 0.018;
        const nameTagW = textWidth(ctx, nameTag, nameSize);
        drawText(ctx, nameTag, -nameTagW / 2, 30, nameSize, rgba(255, 255, 255, 200));

        ctx.restore();

        // Speech bubble
        const bubbleW = isHelp ? w * 0.16 : w * 0.45;
        const bubbleH = isHelp ? h * 0.10 : h * 0.32;
        const bubbleX = isHelp ? celloX - bubbleW - w * 0.02 : celloX - bubbleW - w * 0.05;
        const bubbleY = isHelp ? celloY - h * 0.06 : h * 0.25;

        const bubbleAlpha = isHelp ? 245 : 200;

        fillRoundedRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 10, rgba(15, 20, 35, bubbleAlpha));
        drawRoundedRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 10);
        ctx.strokeStyle = rgba(0, 200, 255, 160);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Bubble tail (pointing right towards Cello)
        ctx.beginPath();
        ctx.moveTo(bubbleX + bubbleW, bubbleY + bubbleH * 0.4);
        ctx.lineTo(bubbleX + bubbleW + 15, bubbleY + bubbleH * 0.5);
        ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH * 0.6);
        ctx.fillStyle = rgba(15, 20, 35, bubbleAlpha);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bubbleX + bubbleW, bubbleY + bubbleH * 0.4);
        ctx.lineTo(bubbleX + bubbleW + 15, bubbleY + bubbleH * 0.5);
        ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH * 0.6);
        ctx.strokeStyle = rgba(0, 200, 255, 160);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Clear the overlapping border line
        ctx.beginPath();
        ctx.moveTo(bubbleX + bubbleW, bubbleY + bubbleH * 0.4 - 1);
        ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH * 0.6 + 1);
        ctx.strokeStyle = rgba(15, 20, 35, bubbleAlpha);
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.stroke();

        // Dialog text
        const lines = dialog.split('\n');
        const dialogSize = isHelp ? h * 0.025 : h * 0.030;
        const lineHeight = dialogSize * 1.6;
        const textStartY = isHelp ? bubbleY + (bubbleH - dialogSize) / 2 : bubbleY + bubbleH * 0.25;

        for (let li = 0; li < lines.length; li++) {
            const lineW = textWidth(ctx, lines[li], dialogSize);
            drawText(ctx, lines[li], bubbleX + (bubbleW - lineW) / 2, textStartY + li * lineHeight, dialogSize,
                rgba(220, 240, 255, isHelp ? 180 : 255));
        }

        if (!isHelp) {
            // Step indicator
            const stepText = `${step + 1}/${dialogs.length - 1}`;
            const stepSize = h * 0.020;
            const stepW = textWidth(ctx, stepText, stepSize);
            drawText(ctx, stepText, bubbleX + bubbleW - stepW - 12, bubbleY + bubbleH - h * 0.04, stepSize,
                rgba(100, 140, 180));

            // Continue prompt
            const contText = '[ Tap to continue ]';
            const contSize = h * 0.022;
            const contW = textWidth(ctx, contText, contSize);
            const contPulse = (Math.sin(this.menuAnimTimer * 4) + 1) * 0.5;
            drawText(ctx, contText, (w - contW) / 2, h * 0.72, contSize, rgba(255, 255, 255, 120 + contPulse * 130));
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

        // Menu decorative bricks removed

        // Rain
        this.drawRain(ctx);

        // Game objects
        if (this.state === GameState.Playing || this.state === GameState.Paused ||
            this.state === GameState.StageClear || this.state === GameState.GameOver) {
            try {
                this.drawGameObjects(ctx);
            } catch(e) {
                ctx.fillStyle = 'red';
                ctx.font = '20px monospace';
                ctx.fillText('drawGameObjects Error: ' + e.message, 10, 50);
            }
        }

        // Confetti (drawn in game viewport)
        try {
            this.drawConfetti(ctx);
        } catch(e) {
            ctx.fillStyle = 'red';
            ctx.font = '20px monospace';
            ctx.fillText('drawConfetti Error: ' + e.message, 10, 80);
        }

        ctx.restore();

        // ── UI VIEW (virtual window size) ──
        try {
            this.drawUI(ctx, w, h);
        } catch(e) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = 'red';
            ctx.font = '20px monospace';
            ctx.fillText('drawUI Error: ' + e.message, 10, 110);
            ctx.restore();
        }

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
        const isMenu = this.state === GameState.Menu || this.state === GameState.Options || this.state === GameState.Shop;
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

        // Coin drops
        this.drawCoinDrops(ctx);

        // Companion & Projectiles
        this.drawCompanion(ctx);
        this.drawCompanionProjectiles(ctx);

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

        // ── Top-Left Pause Button (Drawn in drawHUD instead, so removed from here) ──

        if (this.state === GameState.Menu) {
            this.drawMenu(ctx, w, h);
        } else if (this.state === GameState.Options) {
            this.drawOptions(ctx, w, h);
        } else if (this.state === GameState.Shop) {
            this.drawShop(ctx, w, h);
        } else if (this.state === GameState.Paused) {
            this.drawPauseMenu(ctx, w, h);
        }

        if (this.state === GameState.StageClear || this.state === GameState.GameOver) {
            this.drawOverlay(ctx, w, h);
        }
    }

    // ─── Menu ─────────────────────────────────────────

    drawMenu(ctx, w, h) {
        // ── Background vignette ──
        const vigGrad = ctx.createRadialGradient(w * 0.4, h * 0.45, 0, w * 0.4, h * 0.45, w * 0.75);
        vigGrad.addColorStop(0, rgba(0, 0, 0, 0));
        vigGrad.addColorStop(1, rgba(0, 0, 0, 180));
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, w, h);

        // ── Decorative diagonal lines REMOVED ──

        // ── ARCOSTER logo image (top center) ──
        if (!this._logoImg) {
            this._logoImg = new Image();
            this._logoImg.src = 'img/arcoster_logo.png';
        }
        const bloomPulse = (Math.sin(this.menuAnimTimer * 1.8) + 1) * 0.5;
        if (this._logoImg.complete && this._logoImg.naturalWidth > 0) {
            const logoAspect = this._logoImg.naturalWidth / this._logoImg.naturalHeight;
            const logoH = h * 0.22;
            const logoW = logoH * logoAspect;
            const logoX = (w - logoW) / 2;
            const logoY = h * 0.03;
            ctx.save();
            ctx.globalCompositeOperation = 'screen'; // black background becomes transparent
            ctx.globalAlpha = 0.95 + bloomPulse * 0.05;
            ctx.drawImage(this._logoImg, logoX, logoY, logoW, logoH);
            ctx.restore();
        }

        // ── Subtitle ──
        const subText = 'Galaxy Block Blaster';
        const subSize = h * 0.022;
        const subW = textWidth(ctx, subText, subSize);
        drawText(ctx, subText, (w - subW) / 2, h * 0.27, subSize, rgba(180, 200, 255, 160));

        // ── Scores row ──
        const infoY = h * 0.30;
        const hsText = `BEST: ${String(this.highScore).padStart(6, '0')}`;
        const hsSize = h * 0.022;
        const hsW = textWidth(ctx, hsText, hsSize);
        drawText(ctx, hsText, (w - hsW) / 2, infoY, hsSize, rgba(200, 200, 200, 160));

        // ── Menu items (left-aligned, sketch style) ──
        const menuItems = ['START GAME', 'SHOP', 'OPTION', 'EXIT GAME'];
        const menuColors = [
            [80, 255, 180],   // Start = mint green
            [255, 200, 50],   // Shop  = amber gold
            [100, 180, 255],  // Option = sky blue
            [255, 80, 90],    // Exit  = coral red
        ];

        const menuStartY = h * 0.36;
        const menuStepY = h * 0.125;
        const menuLeftX = w * 0.12;
        const menuFontSize = h * 0.050;
        const tickSize = h * 0.020;

        for (let i = 0; i < menuItems.length; i++) {
            const selected = this.menuSelectedIndex === i;
            const itemY = menuStartY + i * menuStepY;
            const bc = menuColors[i];

            // Selected row highlight streak
            if (selected) {
                const streakGrad = ctx.createLinearGradient(0, itemY - menuFontSize * 0.3, w, itemY + menuFontSize * 1.1);
                streakGrad.addColorStop(0, rgba(0, 0, 0, 0));
                streakGrad.addColorStop(0.08, rgba(bc[0], bc[1], bc[2], 30));
                streakGrad.addColorStop(0.5, rgba(bc[0], bc[1], bc[2], 50));
                streakGrad.addColorStop(0.92, rgba(bc[0], bc[1], bc[2], 30));
                streakGrad.addColorStop(1, rgba(0, 0, 0, 0));
                ctx.fillStyle = streakGrad;
                ctx.fillRect(0, itemY - menuFontSize * 0.3, w, menuFontSize * 1.4);
            }

            // Tick marks removed as requested

            // Item text
            const lw = textWidth(ctx, menuItems[i], menuFontSize);
            const textX = (w - lw) / 2;
            const textAlpha = selected ? 255 : 160;

            if (selected) {
                // Glow pass behind text
                drawText(ctx, menuItems[i], textX + 2, itemY + 2, menuFontSize, rgba(bc[0], bc[1], bc[2], 60));
            }
            drawText(ctx, menuItems[i], textX, itemY, menuFontSize,
                rgba(bc[0], bc[1], bc[2], textAlpha));

            // Underline for selected
            if (selected) {
                const underPulse = 0.5 + 0.5 * Math.sin(this.menuAnimTimer * 5);
                ctx.strokeStyle = rgba(bc[0], bc[1], bc[2], 160 + underPulse * 95);
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(textX, itemY + menuFontSize + 1);
                ctx.lineTo(textX + lw, itemY + menuFontSize + 1);
                ctx.stroke();
            }
        }

        // ── Bottom hint ──
        const hintText = 'Tap / Arrow Keys to navigate';
        const hintSize = h * 0.020;
        const hintW = textWidth(ctx, hintText, hintSize);
        drawText(ctx, hintText, (w - hintW) / 2, h * 0.938, hintSize, rgba(120, 120, 140, 160));
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
        ctx.strokeStyle = rgba(131, 137, 145, 160);
        ctx.lineWidth = 3;
        ctx.stroke();

        // Outer glow
        drawRoundedRect(ctx, panelX - 3, panelY - 3, panelW + 6, panelH + 6, 10);
        ctx.strokeStyle = rgba(131, 137, 145, 45);
        ctx.lineWidth = 6;
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
        drawText(ctx, titleText, (w - tw) / 2, panelY + h * 0.04, titleSize, rgba(200, 200, 210));

        // Divider
        ctx.strokeStyle = rgba(131, 137, 145, 100);
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
            [131, 137, 145],   // Grey for RESUME
            [131, 137, 145],   // Grey for RESTART
            [131, 137, 145],   // Grey for EXIT
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
        // ── Background vignette ──
        const vigGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
        vigGrad.addColorStop(0, rgba(0, 0, 0, 0));
        vigGrad.addColorStop(1, rgba(0, 0, 0, 160));
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, w, h);

        // ── Title ──
        const titleText = '- OPTION -';
        const titleSize = h * 0.055;
        const titleW = textWidth(ctx, titleText, titleSize);
        drawText(ctx, titleText, (w - titleW) / 2 + 2, h * 0.065 + 2, titleSize, rgba(255, 120, 0, 60));
        drawText(ctx, titleText, (w - titleW) / 2, h * 0.065, titleSize, rgba(255, 180, 60, 230));

        // Subtitle tag
        const subTag = 'Game Settings';
        const subTagSize = h * 0.022;
        const subTagW = textWidth(ctx, subTag, subTagSize);
        drawText(ctx, subTag, (w - subTagW) / 2, h * 0.135, subTagSize, rgba(200, 200, 220, 140));

        // Separator
        const sepY = h * 0.165;
        ctx.strokeStyle = rgba(255, 120, 0, 80);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(w * 0.1, sepY); ctx.lineTo(w * 0.9, sepY); ctx.stroke();

        // ── Settings rows ──
        const rowStartY = h * 0.21;
        const rowStep = h * 0.145;
        const labelX = w * 0.10;
        const valueX = w * 0.60;
        const rowFontSz = h * 0.030;
        const selColor = rgba(255, 210, 60);
        const normColor = rgba(180, 185, 200);

        // Row background helper
        const drawRowBg = (idx, selected) => {
            const ry = rowStartY + idx * rowStep - rowFontSz * 0.3;
            const rowH = rowFontSz * 1.8;
            if (selected) {
                fillRoundedRect(ctx, w * 0.06, ry, w * 0.88, rowH, 4, rgba(255, 140, 0, 18));
                drawRoundedRect(ctx, w * 0.06, ry, w * 0.88, rowH, 4);
                ctx.strokeStyle = rgba(255, 140, 0, 80);
                ctx.lineWidth = 1;
                ctx.stroke();
            } else {
                fillRoundedRect(ctx, w * 0.06, ry, w * 0.88, rowH, 4, rgba(255, 255, 255, 5));
            }
        };

        // 1. Paddle Color
        const sel0 = this.optionSelectedIndex === 0;
        drawRowBg(0, sel0);
        drawText(ctx, 'Paddle Color', labelX, rowStartY, rowFontSz, sel0 ? selColor : normColor);
        const colorLabel = (sel0 ? '< ' : '  ') + this.paddleColors[this.selectedColorIndex].label + (sel0 ? ' >' : '  ');
        drawText(ctx, colorLabel, valueX, rowStartY, rowFontSz, sel0 ? selColor : normColor);

        // Color preview dot
        const dotColor = this.paddleColors[this.selectedColorIndex].rgb || [0, 200, 255];
        ctx.beginPath();
        ctx.arc(valueX - 14, rowStartY + rowFontSz * 0.5, 5, 0, Math.PI * 2);
        ctx.fillStyle = rgba(dotColor[0] ?? 0, dotColor[1] ?? 200, dotColor[2] ?? 255);
        ctx.fill();

        // 2. Volume
        const sel1 = this.optionSelectedIndex === 1;
        const volY = rowStartY + rowStep;
        drawRowBg(1, sel1);
        drawText(ctx, 'Volume', labelX, volY, rowFontSz, sel1 ? selColor : normColor);

        const volPct = `${this.volume}%`;
        const volPctW = textWidth(ctx, volPct, rowFontSz * 0.9);
        drawText(ctx, volPct, valueX - volPctW - 8, volY, rowFontSz * 0.9, sel1 ? selColor : normColor);

        const barX = valueX;
        const barY2 = volY + rowFontSz * 0.25;
        const barW = w * 0.28;
        const barH2 = 10;

        // Track
        fillRoundedRect(ctx, barX, barY2, barW, barH2, 4, rgba(30, 30, 45, 230));
        // Fill
        const fillW2 = Math.max(0, barW * (this.volume / 100));
        if (fillW2 > 0) {
            const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
            barGrad.addColorStop(0, rgba(255, 140, 0, 220));
            barGrad.addColorStop(1, rgba(255, 220, 60, 220));
            fillRoundedRect(ctx, barX, barY2, fillW2, barH2, 4, barGrad);
        }
        drawRoundedRect(ctx, barX, barY2, barW, barH2, 4);
        ctx.strokeStyle = rgba(255, 140, 0, sel1 ? 200 : 80);
        ctx.lineWidth = sel1 ? 1.5 : 1;
        ctx.stroke();

        // Knob
        const knobX2 = barX + fillW2;
        ctx.beginPath();
        ctx.arc(knobX2, barY2 + barH2 / 2, 7, 0, Math.PI * 2);
        ctx.fillStyle = sel1 ? rgba(255, 220, 60) : rgba(255, 140, 0);
        ctx.fill();
        ctx.strokeStyle = rgba(255, 255, 255, 200);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 3. Difficulty
        const sel2 = this.optionSelectedIndex === 2;
        const diffY = rowStartY + rowStep * 2;
        drawRowBg(2, sel2);
        drawText(ctx, 'Difficulty', labelX, diffY, rowFontSz, sel2 ? selColor : normColor);
        const diffText = (sel2 ? '< ' : '  ') + this.difficulties[this.difficulty] + (sel2 ? ' >' : '  ');
        const diffColors = [rgba(80, 255, 140), rgba(255, 200, 0), rgba(255, 60, 80)];
        drawText(ctx, diffText, valueX, diffY, rowFontSz, sel2 ? diffColors[this.difficulty] : normColor);

        // Difficulty pip indicators
        for (let d = 0; d < 3; d++) {
            const pipX = valueX - 30 + d * 8;
            const pipY = diffY + rowFontSz * 0.5;
            ctx.beginPath();
            ctx.arc(pipX, pipY, 3, 0, Math.PI * 2);
            ctx.fillStyle = d <= this.difficulty ? rgba(255, 180, 0) : rgba(60, 60, 80);
            ctx.fill();
        }

        // 4. Button Size
        const sel3 = this.optionSelectedIndex === 3;
        const sizeY = rowStartY + rowStep * 3;
        drawRowBg(3, sel3);
        drawText(ctx, 'Button Size', labelX, sizeY, rowFontSz, sel3 ? selColor : normColor);

        const sizePct = `${this.btnScale}%`;
        const sizePctW = textWidth(ctx, sizePct, rowFontSz * 0.9);
        drawText(ctx, sizePct, valueX - sizePctW - 8, sizeY, rowFontSz * 0.9, sel3 ? selColor : normColor);

        const sbarX = valueX;
        const sbarY2 = sizeY + rowFontSz * 0.25;
        const sbarW = w * 0.28;
        const sbarH2 = 10;

        fillRoundedRect(ctx, sbarX, sbarY2, sbarW, sbarH2, 4, rgba(30, 30, 45, 230));
        const sfillW2 = Math.max(0, sbarW * ((this.btnScale - 90) / 30));
        if (sfillW2 > 0) {
            const barGrad = ctx.createLinearGradient(sbarX, 0, sbarX + sbarW, 0);
            barGrad.addColorStop(0, rgba(255, 140, 0, 220));
            barGrad.addColorStop(1, rgba(255, 220, 60, 220));
            fillRoundedRect(ctx, sbarX, sbarY2, sfillW2, sbarH2, 4, barGrad);
        }
        drawRoundedRect(ctx, sbarX, sbarY2, sbarW, sbarH2, 4);
        ctx.strokeStyle = rgba(255, 140, 0, sel3 ? 200 : 80);
        ctx.lineWidth = sel3 ? 1.5 : 1;
        ctx.stroke();

        const sknobX2 = sbarX + sfillW2;
        ctx.beginPath();
        ctx.arc(sknobX2, sbarY2 + sbarH2 / 2, 7, 0, Math.PI * 2);
        ctx.fillStyle = sel3 ? rgba(255, 220, 60) : rgba(255, 140, 0);
        ctx.fill();
        ctx.strokeStyle = rgba(255, 255, 255, 200);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // ── Back button ──
        const selBack = this.optionSelectedIndex === 4;
        const backY = h * 0.78;
        const backBtnW = w * 0.30;
        const backBtnH = h * 0.065;
        const backBtnX = (w - backBtnW) / 2;

        fillRoundedRect(ctx, backBtnX, backY, backBtnW, backBtnH, 5,
            rgba(255, 120, 0, selBack ? 40 : 15));
        drawRoundedRect(ctx, backBtnX, backY, backBtnW, backBtnH, 5);
        ctx.strokeStyle = rgba(255, 140, 0, selBack ? 220 : 70);
        ctx.lineWidth = selBack ? 2 : 1;
        ctx.stroke();

        const backText = 'BACK TO MENU';
        const backFontSz = h * 0.030;
        const bw2 = textWidth(ctx, backText, backFontSz);
        drawText(ctx, backText, (w - bw2) / 2, backY + (backBtnH - backFontSz) / 2, backFontSz,
            selBack ? rgba(255, 255, 255) : rgba(200, 160, 60));

        // ── Help ──
        const helpText = '[ Arrow keys to navigate | Left/Right to change ]';
        const helpSize = h * 0.020;
        const helpW = textWidth(ctx, helpText, helpSize);
        drawText(ctx, helpText, (w - helpW) / 2, h * 0.92, helpSize, rgba(120, 120, 140, 160));
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
        // Overlay HUD (Neat & Colorful, ZZZ inspired)

        const uiY = h * 0.04;
        const iconSize = h * 0.080;

        // ── Top-left: Pause icon & Lives bar ──
        const pauseX = w * 0.03;
        const pauseW = iconSize * 1.5;

        // Pause button background
        fillRoundedRect(ctx, pauseX, uiY, pauseW, iconSize, 12, rgba(20, 25, 35, 200));
        drawRoundedRect(ctx, pauseX, uiY, pauseW, iconSize, 12);
        ctx.strokeStyle = rgba(131, 137, 145, 255);
        ctx.lineWidth = 6;
        ctx.stroke();

        // Pause bars
        ctx.fillStyle = rgba(131, 137, 145, 255);
        ctx.fillRect(pauseX + pauseW * 0.35, uiY + iconSize * 0.28, pauseW * 0.12, iconSize * 0.44);
        ctx.fillRect(pauseX + pauseW * 0.53, uiY + iconSize * 0.28, pauseW * 0.12, iconSize * 0.44);

        // Lives Bar
        const livesX = pauseX + pauseW + 12;
        const livesW = w * 0.28;
        const livesH = iconSize * 0.7;
        const livesY = uiY + (iconSize - livesH) / 2;

        fillRoundedRect(ctx, livesX, livesY, livesW, livesH, livesH / 2, rgba(20, 25, 35, 200));
        drawRoundedRect(ctx, livesX, livesY, livesW, livesH, livesH / 2);
        ctx.strokeStyle = rgba(131, 137, 145, 255);
        ctx.lineWidth = 6;
        ctx.stroke();

        // Fill lives segments
        const maxLives = 5;
        const segGap = 4;
        const segW = (livesW - 10 - segGap * (maxLives - 1)) / maxLives;
        for (let i = 0; i < maxLives; i++) {
            const hasLife = i < this.lives;
            ctx.fillStyle = hasLife ? rgba(50, 255, 100, 240) : rgba(50, 50, 60, 150);
            const sx = livesX + 5 + i * (segW + segGap);
            const r = (i === 0 || i === maxLives - 1) ? (livesH - 10) / 2 : 2;
            fillRoundedRect(ctx, sx, livesY + 5, segW, livesH - 10, r, ctx.fillStyle);
        }

        // ── Below Top-left: Score & Combo ──
        const scoreText = `${this.score} PTS`;
        const scoreSize = h * 0.055;
        drawText(ctx, scoreText, w * 0.03, uiY + iconSize + 30, scoreSize, rgba(255, 210, 0, 255));

        if (this.combo > 1) {
            const comboText = `COMBO x${this.combo}`;
            const comboSize = h * 0.045;
            const comboColor = this.combo >= 5 ? rgba(255, 50, 255) :
                this.combo >= 3 ? rgba(255, 150, 0) : rgba(0, 255, 200);
            drawText(ctx, comboText, w * 0.03, uiY + iconSize + 30 + scoreSize + 6, comboSize, comboColor);
        }

        // ── Top-right: Timer ──
        const mins = String(Math.floor(this.elapsedTime / 60)).padStart(2, '0');
        const secs = String(Math.floor(this.elapsedTime) % 60).padStart(2, '0');
        const timerText = `${mins}:${secs}`;
        const timerSize = h * 0.05;
        const timerW = textWidth(ctx, timerText, timerSize);

        const timerPadX = 16;
        const timerBoxW = timerW + timerPadX * 2;
        const timerBoxH = iconSize * 0.8;
        const timerX = w * 0.97 - timerBoxW;
        const timerY = uiY;

        fillRoundedRect(ctx, timerX, timerY, timerBoxW, timerBoxH, timerBoxH / 2, rgba(20, 25, 35, 200));
        drawRoundedRect(ctx, timerX, timerY, timerBoxW, timerBoxH, timerBoxH / 2);
        ctx.strokeStyle = rgba(255, 100, 100, 150);
        ctx.lineWidth = 4;
        ctx.stroke();
        drawText(ctx, timerText, timerX + timerPadX, timerY + (timerBoxH - timerSize) / 2, timerSize, rgba(255, 200, 200, 255));

        // ── Below Top-right: ARCOSTER & STAGE ──
        const titleText = 'ARCØSTER';
        const titleSize = h * 0.05;
        const titleW = textWidth(ctx, titleText, titleSize);
        drawText(ctx, titleText, w * 0.97 - titleW, timerY + timerBoxH + 25, titleSize, rgba(0, 180, 255, 220));

        const stageText = `STAGE ${this.currentLevel + 1}`;
        const stageSize = h * 0.035;
        const stageW = textWidth(ctx, stageText, stageSize);
        drawText(ctx, stageText, w * 0.97 - stageW, timerY + timerBoxH + 25 + titleSize + 4, stageSize, rgba(200, 220, 255, 200));
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
