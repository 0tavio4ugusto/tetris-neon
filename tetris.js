// ============================================================
// TETRIS NEON — Full Game Engine
// ============================================================

const COLS = 10;
const ROWS = 20;
const BLOCK = 32;
const PREVIEW_BLOCK = 24;

// Piece definitions (SRS standard)
const PIECES = {
  I: { shape: [[0,0],[1,0],[2,0],[3,0]], color: '#0ff' },
  O: { shape: [[0,0],[1,0],[0,1],[1,1]], color: '#ff0' },
  T: { shape: [[0,0],[1,0],[2,0],[1,1]], color: '#a0f' },
  S: { shape: [[1,0],[2,0],[0,1],[1,1]], color: '#0f0' },
  Z: { shape: [[0,0],[1,0],[1,1],[2,1]], color: '#f00' },
  J: { shape: [[0,0],[0,1],[1,1],[2,1]], color: '#44f' },
  L: { shape: [[2,0],[0,1],[1,1],[2,1]], color: '#f80' },
};

const PIECE_NAMES = Object.keys(PIECES);

// ============================================================
// STATE
// ============================================================
let board, currentPiece, nextPieces, holdPiece, canHold;
let score, level, linesCleared, combo;
let dropInterval, dropTimer, lastTime;
let gameState; // 'menu' | 'playing' | 'paused' | 'gameover'
let lockDelay, lockTimer, lockMoves;
let particles = [];
let flashRows = [];
let flashTimer = 0;
let shakeTimer = 0;
let bgStars = [];
let ghostY;

// ============================================================
// CANVASES
// ============================================================
const boardCanvas = document.getElementById('board');
const boardCtx = boardCanvas.getContext('2d');
const fxCanvas = document.getElementById('fx');
const fxCtx = fxCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold');
const holdCtx = holdCanvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');

function resizeBoard() {
  boardCanvas.width = COLS * BLOCK;
  boardCanvas.height = ROWS * BLOCK;
  fxCanvas.width = window.innerWidth;
  fxCanvas.height = window.innerHeight;
}

// ============================================================
// BOARD
// ============================================================
function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

// ============================================================
// PIECE HELPERS
// ============================================================
function randomBag() {
  const bag = [...PIECE_NAMES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

let bag = [];
function nextFromBag() {
  if (bag.length === 0) bag = randomBag();
  return bag.pop();
}

function spawnPiece() {
  if (nextPieces.length < 4) {
    nextPieces.push(nextFromBag(), nextFromBag(), nextFromBag(), nextFromBag());
  }
  const name = nextPieces.shift();
  const def = PIECES[name];
  const shape = def.shape.map(p => [...p]);
  currentPiece = {
    name,
    shape,
    color: def.color,
    x: Math.floor(COLS / 2) - 1,
    y: 0,
    rotation: 0,
  };
  canHold = true;
  lockTimer = 0;
  lockMoves = 0;

  if (collides(currentPiece.shape, currentPiece.x, currentPiece.y)) {
    gameState = 'gameover';
    showOverlay('GAME OVER', `Score: ${score} — Press ENTER`);
  }
}

function rotateCW(shape) {
  // Find bounding box
  let maxX = 0, maxY = 0;
  for (const [x, y] of shape) { maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  const size = Math.max(maxX, maxY);
  return shape.map(([x, y]) => [size - y, x]);
}

function rotateCCW(shape) {
  let maxX = 0, maxY = 0;
  for (const [x, y] of shape) { maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  const size = Math.max(maxX, maxY);
  return shape.map(([x, y]) => [y, size - x]);
}

// SRS wall kick data
const KICKS = {
  '0>1': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '1>0': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '1>2': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '2>1': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '2>3': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '3>2': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '3>0': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '0>3': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
};

const I_KICKS = {
  '0>1': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  '1>0': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  '1>2': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
  '2>1': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  '2>3': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  '3>2': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  '3>0': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  '0>3': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
};

function collides(shape, px, py) {
  for (const [sx, sy] of shape) {
    const x = px + sx;
    const y = py + sy;
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y >= 0 && board[y][x]) return true;
  }
  return false;
}

function lock() {
  for (const [sx, sy] of currentPiece.shape) {
    const x = currentPiece.x + sx;
    const y = currentPiece.y + sy;
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
      board[y][x] = currentPiece.color;
    }
  }
  clearLines();
  spawnPiece();
}

function clearLines() {
  const full = [];
  for (let r = 0; r < ROWS; r++) {
    if (board[r].every(c => c !== null)) full.push(r);
  }
  if (full.length === 0) {
    combo = 0;
    return;
  }

  // Score
  const pts = [0, 100, 300, 500, 800];
  combo++;
  score += (pts[full.length] || 800) * level + (combo - 1) * 50 * level;
  linesCleared += full.length;

  // Level up
  level = Math.floor(linesCleared / 10) + 1;
  dropInterval = Math.max(50, 1000 - (level - 1) * 80);

  // Effects
  shakeTimer = full.length >= 4 ? 400 : full.length >= 2 ? 200 : 100;
  flashRows = [...full];
  flashTimer = 300;

  // Spawn particles
  for (const row of full) {
    for (let c = 0; c < COLS; c++) {
      const color = board[row][c] || '#fff';
      spawnParticles(c * BLOCK + BLOCK / 2, row * BLOCK + BLOCK / 2, color, 12);
    }
  }

  // Remove lines
  for (const row of full.sort((a, b) => b - a)) {
    board.splice(row, 1);
    board.unshift(Array(COLS).fill(null));
  }

  updateUI();
}

// ============================================================
// HOLD
// ============================================================
function doHold() {
  if (!canHold) return;
  canHold = false;
  const name = currentPiece.name;
  if (holdPiece) {
    const tmp = holdPiece;
    holdPiece = name;
    const def = PIECES[tmp];
    currentPiece = {
      name: tmp,
      shape: def.shape.map(p => [...p]),
      color: def.color,
      x: Math.floor(COLS / 2) - 1,
      y: 0,
      rotation: 0,
    };
  } else {
    holdPiece = name;
    spawnPiece();
  }
  lockTimer = 0;
  lockMoves = 0;
}

// ============================================================
// GHOST PIECE
// ============================================================
function calcGhostY() {
  let gy = currentPiece.y;
  while (!collides(currentPiece.shape, currentPiece.x, gy + 1)) gy++;
  return gy;
}

// ============================================================
// PARTICLES
// ============================================================
function spawnParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1,
      decay: 0.015 + Math.random() * 0.02,
      size: 2 + Math.random() * 4,
      color,
    });
  }
}

function spawnLineClearEffect(row) {
  const y = row * BLOCK + BLOCK / 2;
  for (let x = 0; x < COLS * BLOCK; x += 8) {
    spawnParticles(x, y, '#fff', 2);
  }
}

// ============================================================
// BG STARS
// ============================================================
function initStars() {
  bgStars = [];
  for (let i = 0; i < 100; i++) {
    bgStars.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 2,
      speed: 0.2 + Math.random() * 0.5,
      alpha: 0.3 + Math.random() * 0.5,
    });
  }
}

// ============================================================
// INPUT
// ============================================================
const keys = {};

document.addEventListener('keydown', e => {
  if (e.repeat) return;

  if (e.key === 'Enter') {
    if (gameState === 'menu' || gameState === 'gameover') {
      startGame();
      return;
    }
  }

  if (e.key === 'p' || e.key === 'P') {
    if (gameState === 'playing') {
      gameState = 'paused';
      showOverlay('PAUSED', 'Press P to resume');
    } else if (gameState === 'paused') {
      gameState = 'playing';
      hideOverlay();
      lastTime = performance.now();
    }
    return;
  }

  if (gameState !== 'playing') return;

  switch (e.key) {
    case 'ArrowLeft':
      tryMove(-1, 0);
      break;
    case 'ArrowRight':
      tryMove(1, 0);
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
      tryRotate(1);
      break;
    case 'z':
    case 'Z':
      tryRotate(-1);
      break;
    case ' ':
      hardDrop();
      e.preventDefault();
      break;
    case 'c':
    case 'C':
      doHold();
      break;
  }
});

// DAS (Delayed Auto Shift)
let dasTimer = 0;
let dasDir = 0;
const DAS_DELAY = 170;
const DAS_REPEAT = 50;

// ============================================================
// MOVEMENT
// ============================================================
function tryMove(dx, dy) {
  if (!collides(currentPiece.shape, currentPiece.x + dx, currentPiece.y + dy)) {
    currentPiece.x += dx;
    currentPiece.y += dy;
    if (dy === 0) { lockTimer = 0; lockMoves++; }
    return true;
  }
  return false;
}

function tryRotate(dir) {
  const newShape = dir === 1 ? rotateCW(currentPiece.shape) : rotateCCW(currentPiece.shape);
  const from = currentPiece.rotation;
  const to = (from + (dir === 1 ? 1 : 3)) % 4;
  const kickKey = `${from}>${to}`;
  const kicks = currentPiece.name === 'I' ? I_KICKS[kickKey] : KICKS[kickKey];

  if (!kicks) return;

  for (const [kx, ky] of kicks) {
    if (!collides(newShape, currentPiece.x + kx, currentPiece.y - ky)) {
      currentPiece.shape = newShape;
      currentPiece.x += kx;
      currentPiece.y -= ky;
      currentPiece.rotation = to;
      lockTimer = 0;
      lockMoves++;
      return;
    }
  }
}

function softDrop() {
  if (tryMove(0, 1)) {
    score += 1;
    dropTimer = 0;
    updateUI();
  }
}

function hardDrop() {
  let dropped = 0;
  while (!collides(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y++;
    dropped++;
  }
  score += dropped * 2;

  // Hard drop effect
  spawnParticles(
    currentPiece.x * BLOCK + BLOCK,
    currentPiece.y * BLOCK + BLOCK / 2,
    currentPiece.color, 20
  );
  shakeTimer = 100;

  lock();
  updateUI();
}

// ============================================================
// UI
// ============================================================
function updateUI() {
  document.getElementById('score').textContent = score.toLocaleString();
  document.getElementById('level').textContent = level;
  document.getElementById('lines').textContent = linesCleared;
  document.getElementById('combo').textContent = combo;
}

function showOverlay(title, sub) {
  const overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');
  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-sub').textContent = sub;
}

function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}

// ============================================================
// RENDERING
// ============================================================
function drawBlock(ctx, x, y, color, size = BLOCK, alpha = 1) {
  ctx.globalAlpha = alpha;

  // Main fill
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

  // Inner highlight
  const grad = ctx.createLinearGradient(x, y, x + size, y + size);
  grad.addColorStop(0, 'rgba(255,255,255,0.3)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  grad.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = grad;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

  // Glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  ctx.shadowBlur = 0;

  ctx.globalAlpha = 1;
}

function drawBoard() {
  boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);

  // Grid
  boardCtx.strokeStyle = 'rgba(255,255,255,0.03)';
  boardCtx.lineWidth = 1;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      boardCtx.strokeRect(c * BLOCK, r * BLOCK, BLOCK, BLOCK);
    }
  }

  // Locked blocks
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) {
        drawBlock(boardCtx, c * BLOCK, r * BLOCK, board[r][c]);
      }
    }
  }

  // Ghost
  if (currentPiece && gameState === 'playing') {
    const gy = calcGhostY();
    for (const [sx, sy] of currentPiece.shape) {
      const x = (currentPiece.x + sx) * BLOCK;
      const y = (gy + sy) * BLOCK;
      drawBlock(boardCtx, x, y, currentPiece.color, BLOCK, 0.15);
    }
  }

  // Current piece
  if (currentPiece && (gameState === 'playing' || gameState === 'paused')) {
    for (const [sx, sy] of currentPiece.shape) {
      const x = (currentPiece.x + sx) * BLOCK;
      const y = (currentPiece.y + sy) * BLOCK;
      drawBlock(boardCtx, x, y, currentPiece.color);
    }
  }

  // Flash effect
  if (flashTimer > 0) {
    const alpha = flashTimer / 300;
    boardCtx.fillStyle = `rgba(255,255,255,${alpha * 0.4})`;
    for (const row of flashRows) {
      boardCtx.fillRect(0, row * BLOCK, COLS * BLOCK, BLOCK);
    }
  }
}

function drawPreview(ctx, name, x, y, size) {
  const def = PIECES[name];
  if (!def) return;
  for (const [sx, sy] of def.shape) {
    drawBlock(ctx, x + sx * size, y + sy * size, def.color, size);
  }
}

function drawHold() {
  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  if (holdPiece) {
    drawPreview(holdCtx, holdPiece, 20, 20, PREVIEW_BLOCK);
  }
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  for (let i = 0; i < Math.min(3, nextPieces.length); i++) {
    drawPreview(nextCtx, nextPieces[i], 12, 10 + i * 110, PREVIEW_BLOCK);
  }
}

function drawParticles(dt) {
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

  // Stars
  for (const star of bgStars) {
    star.y += star.speed;
    if (star.y > fxCanvas.height) {
      star.y = 0;
      star.x = Math.random() * fxCanvas.width;
    }
    fxCtx.fillStyle = `rgba(255,255,255,${star.alpha})`;
    fxCtx.fillRect(star.x, star.y, star.size, star.size);
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15; // gravity
    p.life -= p.decay;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    fxCtx.globalAlpha = p.life;
    fxCtx.shadowColor = p.color;
    fxCtx.shadowBlur = 10;
    fxCtx.fillStyle = p.color;
    fxCtx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  fxCtx.globalAlpha = 1;
  fxCtx.shadowBlur = 0;
}

// ============================================================
// SCREEN SHAKE
// ============================================================
function applyShake() {
  if (shakeTimer > 0) {
    const intensity = shakeTimer / 400 * 6;
    const dx = (Math.random() - 0.5) * intensity;
    const dy = (Math.random() - 0.5) * intensity;
    boardCanvas.style.transform = `translate(${dx}px, ${dy}px)`;
    shakeTimer -= 16;
  } else {
    boardCanvas.style.transform = '';
  }
}

// ============================================================
// GAME LOOP
// ============================================================
function gameLoop(time) {
  requestAnimationFrame(gameLoop);

  const dt = time - (lastTime || time);
  lastTime = time;

  // Always draw effects
  drawParticles(dt);

  if (gameState !== 'playing') return;

  // Flash timer
  if (flashTimer > 0) flashTimer -= dt;

  // Gravity
  dropTimer += dt;
  if (dropTimer >= dropInterval) {
    dropTimer = 0;
    if (!tryMove(0, 1)) {
      // Lock delay
      lockTimer += dropInterval;
      if (lockTimer >= 500 || lockMoves >= 15) {
        lock();
      }
    } else {
      lockTimer = 0;
    }
  }

  // Lock delay check when sitting on surface
  if (collides(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
    lockTimer += dt;
    if (lockTimer >= 500 || lockMoves >= 15) {
      lock();
    }
  } else {
    lockTimer = 0;
  }

  applyShake();
  drawBoard();
  drawHold();
  drawNext();
  updateUI();
}

// ============================================================
// START
// ============================================================
function startGame() {
  board = createBoard();
  bag = [];
  nextPieces = [];
  holdPiece = null;
  canHold = true;
  score = 0;
  level = 1;
  linesCleared = 0;
  combo = 0;
  dropInterval = 1000;
  dropTimer = 0;
  lockTimer = 0;
  lockMoves = 0;
  particles = [];
  flashRows = [];
  flashTimer = 0;
  shakeTimer = 0;
  gameState = 'playing';

  hideOverlay();
  spawnPiece();
  updateUI();
  lastTime = performance.now();
}

// ============================================================
// INIT
// ============================================================
resizeBoard();
initStars();
window.addEventListener('resize', () => {
  resizeBoard();
  initStars();
});

gameState = 'menu';
showOverlay('TETRIS NEON', 'Press ENTER to start');
requestAnimationFrame(gameLoop);
