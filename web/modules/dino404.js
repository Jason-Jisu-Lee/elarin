// /modules/dino404.js
// Runner with a code-drawn minimal, cute cat facing right. No images.
// Controls: Space/ArrowUp = start + jump. Space on death = restart.

let canvas,
  ctx,
  rafId = null;
let state = "idle"; // idle | running | dead
let groundY, frame, score;
let dino, obstacles;
let spawnTimer = 0;

// Physics and pace
const GRAVITY = 0.7;
const JUMP_V = -14.375; // ~15% longer airtime than -12.5
const SPEED_BASE = 5; // slightly faster
const SPEED_CAP = 5;
const SPEED_SCALE = 300; // slower growth

// Spawn variance
const MIN_GAP_BASE_PX = 200; // base safe gap in pixels
const MIN_GAP_PER_SPEED = 34; // extra gap per unit speed

// Cat sprite grid
const GRID_W = 16;
const GRID_H = 16;
const SCALE = 3; // 16*3 => 48px

// Animation
const SPRITE_FRAMES = 3; // 0..2
const SPRITE_FPS = 9;
let spriteFrame = 0;

// Colors
const C_BODY = "#2f2f2f";
const C_BELLY = "#7b7f87";
const C_EYE = "#0b0b0b";
const C_NOSE = "#f6a8a8";
const C_EARIN = "#c2c4c7";

// Utils
function randInt(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
}
function randExp(mean) {
  return -mean * Math.log(1 - Math.random());
}

function minGapPx(speed) {
  return Math.max(
    180,
    Math.floor(MIN_GAP_BASE_PX + MIN_GAP_PER_SPEED * (speed - SPEED_BASE + 1))
  );
}

function scheduleNextSpawn(speed) {
  const minPx = minGapPx(speed);
  const minFrames = Math.ceil(minPx / Math.max(1, speed));
  const extra = Math.floor(randExp(minFrames * 0.9)); // exponential tail
  const jitter = randInt(10, 30);
  return minFrames + extra + jitter;
}

function resetGame() {
  frame = 0;
  score = 0;
  obstacles = [];
  spawnTimer = 40;
  const w = GRID_W * SCALE;
  const h = GRID_H * SCALE;
  dino = { x: 50, y: 0, w, h, vy: 0 };
  dino.y = groundY - dino.h;
  spriteFrame = 0;
}

function start() {
  state = "running";
  resetGame();
  loop();
}

function stop() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

function onKey(e) {
  const code = e.code;
  if (code === "Space" || code === "ArrowUp") {
    e.preventDefault();
    if (state === "idle") start();
    else if (state === "running") {
      if (onGround()) dino.vy = JUMP_V;
    } else if (state === "dead") start(); // Space to restart
  }
}

function onGround() {
  return dino.y >= groundY - dino.h - 0.5;
}

function spawnObstacle() {
  const h = 24 + Math.floor(Math.random() * 36); // 24..59
  const w = 12 + Math.floor(Math.random() * 16); // 12..27
  obstacles.push({ x: canvas.width + 10, y: groundY - h, w, h });
}

function trySpawnObstacle(speed) {
  const last = obstacles[obstacles.length - 1];
  const needPx = minGapPx(speed);
  if (last) {
    const gapPx = canvas.width + 10 - (last.x + last.w);
    if (gapPx < needPx) {
      spawnTimer = Math.max(
        10,
        Math.ceil((needPx - gapPx) / Math.max(1, speed))
      );
      return;
    }
  }
  spawnObstacle();
  spawnTimer = scheduleNextSpawn(speed);
}

function collide(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

function update() {
  const speed = SPEED_BASE + Math.min(SPEED_CAP, score / SPEED_SCALE);
  frame++;
  score += 1;

  // animate sprite when running
  if (state === "running" && SPRITE_FRAMES > 1) {
    if (frame % Math.max(1, Math.floor(60 / SPRITE_FPS)) === 0) {
      spriteFrame = (spriteFrame + 1) % SPRITE_FRAMES;
    }
  }

  // spawn logic with fairness and variance
  spawnTimer -= 1;
  if (spawnTimer <= 0) trySpawnObstacle(speed);

  // gravity
  dino.vy += GRAVITY;
  dino.y += dino.vy;
  if (onGround()) {
    dino.y = groundY - dino.h;
    dino.vy = 0;
  }

  // move obstacles and cull
  for (const o of obstacles) o.x -= speed;
  obstacles = obstacles.filter((o) => o.x + o.w > -10);

  // collisions
  for (const o of obstacles) {
    if (collide(dino, o)) {
      state = "dead";
      stop();
      draw();
      return;
    }
  }
}

function drawGround() {
  ctx.beginPath();
  ctx.moveTo(0, groundY + 0.5);
  ctx.lineTo(canvas.width, groundY + 0.5);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#9CA3AF";
  ctx.stroke();
}

function drawObstacles() {
  ctx.fillStyle = "#374151";
  for (const o of obstacles) ctx.fillRect(o.x, o.y, o.w, o.h);
}

function drawText(text, y) {
  ctx.font =
    "16px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  ctx.fillStyle = "#374151";
  const m = ctx.measureText(text);
  ctx.fillText(text, Math.round((canvas.width - m.width) / 2), y);
}

function drawScoreHUD() {
  ctx.font =
    "14px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  ctx.fillStyle = "#4B5563";
  const s = String(Math.floor(score / 5)).padStart(5, "0");
  ctx.fillText(s, canvas.width - 70, 24);
}

// ---------- Minimal cute pixel cat (facing right) ----------
function px(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(dino.x + x * SCALE),
    Math.round(dino.y + y * SCALE),
    Math.round(w * SCALE),
    Math.round(h * SCALE)
  );
}

/** 16x16 chibi cat, rounded silhouette, simple tail. frameIdx: 0..2 */
function drawCat(frameIdx) {
  // Body (rounded rectangle impression)
  px(4, 9, 7, 4, C_BODY); // torso
  px(5, 8, 5, 1, C_BODY); // back curve
  px(10, 10, 1, 2, C_BODY); // chest bulge

  // Belly highlight
  px(6, 11, 3, 1, C_BELLY);

  // Head, larger than body for cute look
  px(11, 7, 4, 4, C_BODY); // head block
  // Ears
  px(11, 6, 1, 1, C_BODY);
  px(13, 6, 1, 1, C_BODY);
  // Inner ear hints
  px(11, 6, 1, 1, C_EARIN);
  px(13, 6, 1, 1, C_EARIN);

  // Face
  px(14, 8, 1, 1, C_EYE); // eye
  px(14, 9, 1, 1, C_NOSE); // nose

  // Tail, smooth and consistent on the back-left
  // Anchor near x=3..4. Animate up-mid-down gently.
  if (frameIdx === 0) {
    px(3, 8, 1, 3, C_BODY); // up
    px(2, 7, 1, 1, C_BODY);
  } else if (frameIdx === 1) {
    px(3, 9, 1, 3, C_BODY); // mid
    px(2, 10, 1, 1, C_BODY);
  } else {
    px(3, 10, 1, 2, C_BODY); // down
    px(2, 11, 1, 1, C_BODY);
  }

  // Legs animate, compact and symmetric
  if (frameIdx === 0) {
    // front forward, back back
    px(10, 12, 1, 3, C_BODY);
    px(9, 12, 1, 2, C_BODY); // front
    px(5, 12, 1, 2, C_BODY);
    px(4, 12, 1, 3, C_BODY); // back
  } else if (frameIdx === 1) {
    // neutral
    px(10, 12, 1, 2, C_BODY);
    px(9, 12, 1, 2, C_BODY);
    px(5, 12, 1, 2, C_BODY);
    px(4, 12, 1, 2, C_BODY);
  } else {
    // front back, back forward
    px(10, 12, 1, 2, C_BODY);
    px(9, 12, 1, 3, C_BODY);
    px(5, 12, 1, 3, C_BODY);
    px(4, 12, 1, 2, C_BODY);
  }
}

function drawDino() {
  drawCat(spriteFrame);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround();
  if (state === "idle") drawText("Press Space to start", 85);
  drawDino();
  drawObstacles();
  drawScoreHUD();
  if (state === "dead") {
    const disp = Math.floor(score / 5);
    drawText(`Your score: ${disp}`, 80); // higher placement
    drawText("Game Over — press Space", 100);
  }
}

function loop() {
  rafId = requestAnimationFrame(loop);
  update();
  draw();
}

export function mount(targetCanvas) {
  if (!targetCanvas) return;
  if (canvas === targetCanvas && rafId) return;
  canvas = targetCanvas;
  ctx = canvas.getContext("2d");
  groundY = canvas.height - 20;
  ctx.imageSmoothingEnabled = false;
  window.addEventListener("keydown", onKey);
  state = "idle";
  resetGame();
  draw();
}

export function unmount() {
  stop();
  if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  window.removeEventListener("keydown", onKey);
  state = "idle";
}
