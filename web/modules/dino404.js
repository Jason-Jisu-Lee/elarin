// /modules/dino404.js
// Runner with a code-drawn pixel cat (facing right). No external images.
// Controls: Space/ArrowUp = start + jump, Space on death = restart.

let canvas,
  ctx,
  rafId = null;
let state = "idle"; // idle | running | dead
let groundY, frame, score;
let dino, obstacles;
let spawnTimer = 0;

// Physics and pace
const GRAVITY = 0.7;
const JUMP_V = -14.375; // ~15% longer airtime vs 12.5 at same gravity
const SPEED_BASE = 5; // slightly faster than before
const SPEED_CAP = 5; // additive cap
const SPEED_SCALE = 300;

// Cat sprite grid
const GRID_W = 16;
const GRID_H = 16;
const SCALE = 3; // 16*3 => 48px

// Animation
const SPRITE_FRAMES = 3; // 0..2
const SPRITE_FPS = 9;
let spriteFrame = 0;

// Colors
const C_BODY = "#3b3b3b";
const C_OUT = "#1f2937";
const C_WHISK = "#9ca3af";
const C_EYE = "#0b0b0b";
const C_NOSE = "#f59e9e";
const C_BELLY = "#6b7280";

// Utils
function randInt(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
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

// Fair spacing: enforce gap based on speed and jump arc
function trySpawnObstacle(speed) {
  const minGapPx = Math.max(220, Math.floor(speed * 42)); // wider than before
  const last = obstacles[obstacles.length - 1];
  if (last) {
    const gapPx = canvas.width + 10 - (last.x + last.w);
    if (gapPx < minGapPx) {
      spawnTimer = Math.max(
        10,
        Math.ceil((minGapPx - gapPx) / Math.max(1, speed))
      );
      return;
    }
  }
  spawnObstacle();
  // Next spawn after at least another safe gap plus randomness
  spawnTimer = Math.round(minGapPx / Math.max(1, speed)) + randInt(20, 35);
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

  // spawn logic with fairness
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

// ---------- Pixel-art CAT (code-drawn, facing right) ----------
function px(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(dino.x + x * SCALE),
    Math.round(dino.y + y * SCALE),
    Math.round(w * SCALE),
    Math.round(h * SCALE)
  );
}

function outlineRect(x, y, w, h) {
  px(x, y, w, 1, C_OUT);
  px(x, y + h - 1, w, 1, C_OUT);
  px(x, y, 1, h, C_OUT);
  px(x + w - 1, y, 1, h, C_OUT);
}

/** 16x16 cute cat, facing right. frameIdx: 0..2 */
function drawCat(frameIdx) {
  // Back hump (left/back)
  px(2, 7, 3, 2, C_BODY);
  outlineRect(2, 7, 3, 2);

  // Torso
  px(3, 8, 8, 4, C_BODY);
  outlineRect(3, 8, 8, 4);

  // Chest near head
  px(10, 9, 2, 3, C_BODY);
  outlineRect(10, 9, 2, 3);

  // Head (right/front)
  px(12, 7, 4, 4, C_BODY);
  outlineRect(12, 7, 4, 4);

  // Ears
  px(12, 6, 1, 1, C_BODY);
  px(14, 6, 1, 1, C_BODY);

  // Face
  px(14, 8, 1, 1, C_EYE); // eye
  px(15, 10, 1, 1, C_NOSE); // nose
  px(15, 9, 1, 1, C_WHISK); // whiskers
  px(15, 11, 1, 1, C_WHISK);

  // Belly highlight
  px(7, 10, 3, 1, C_BELLY);

  // Tail animate on left/back
  if (frameIdx === 0) {
    px(2, 8, 1, 3, C_BODY);
    px(1, 7, 1, 2, C_BODY); // up
  } else if (frameIdx === 1) {
    px(2, 9, 1, 3, C_BODY);
    px(1, 10, 1, 1, C_BODY); // mid
  } else {
    px(2, 10, 1, 2, C_BODY);
    px(1, 11, 1, 1, C_BODY); // down
  }

  // Legs animate (front near x=10..11, back near x=5..6)
  if (frameIdx === 0) {
    // FL forward, BL back
    px(10, 12, 1, 3, C_BODY);
    px(11, 12, 1, 2, C_BODY); // front
    px(5, 12, 1, 2, C_BODY);
    px(6, 12, 1, 3, C_BODY); // back
  } else if (frameIdx === 1) {
    // neutral
    px(10, 12, 1, 2, C_BODY);
    px(11, 12, 1, 2, C_BODY);
    px(5, 12, 1, 2, C_BODY);
    px(6, 12, 1, 2, C_BODY);
  } else {
    // FL back, BL forward
    px(10, 12, 1, 2, C_BODY);
    px(11, 12, 1, 3, C_BODY);
    px(5, 12, 1, 3, C_BODY);
    px(6, 12, 1, 2, C_BODY);
  }

  // Paw definition
  px(10, 15, 1, 1, C_OUT);
  px(11, 14, 1, 1, C_OUT);
  px(5, 14, 1, 1, C_OUT);
  px(6, 15, 1, 1, C_OUT);
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
    drawText("Game Over — press Space", 90);
    const disp = Math.floor(score / 5);
    drawText(`Your score: ${disp}`, 110); // higher placement
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
