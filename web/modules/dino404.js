// /modules/dino404.js
// Runner game with a pixel-art CAT drawn entirely in code (no images).
// Controls: Space/ArrowUp = start + jump, R = restart.
// Minimal surface: same mount/unmount API as before.

let canvas,
  ctx,
  rafId = null;
let state = "idle"; // idle | running | dead
let groundY, frame, score;
let dino, obstacles;

// Physics and pace
const GRAVITY = 0.7;
const JUMP_V = -12.5;
const SPEED_BASE = 6;

// Cat sprite grid
// Drawn on a 16×16 logical grid with integer scaling for crisp pixels.
const GRID_W = 16;
const GRID_H = 16;
const SCALE = 3; // 16*3 => 48px sprite height

// Animation
const SPRITE_FRAMES = 3; // 0,1,2 cycling
const SPRITE_FPS = 8; // animation speed
let spriteFrame = 0;

// Colors
const C_BODY = "#3b3b3b"; // dark gray
const C_OUT = "#1f2937"; // near-black outline
const C_WHISK = "#9ca3af"; // whiskers gray
const C_EYE = "#111111"; // eye
const C_NOSE = "#f59e9e"; // soft pink
const C_BELLY = "#6b7280"; // mid gray

function resetGame() {
  frame = 0;
  score = 0;
  obstacles = [];
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
    } else if (state === "dead") start();
  } else if (code === "KeyR") {
    if (state !== "running") start();
  }
}

function onGround() {
  return dino.y >= groundY - dino.h - 0.5;
}

function spawnObstacle() {
  const h = 25 + Math.floor(Math.random() * 40); // 25..64
  const w = 10 + Math.floor(Math.random() * 20); // 10..29
  obstacles.push({ x: canvas.width + 10, y: groundY - h, w, h });
}

function collide(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

function update() {
  const speed = SPEED_BASE + Math.min(10, score / 200);
  frame++;
  score += 1;

  // advance animation when running
  if (state === "running" && SPRITE_FRAMES > 1) {
    if (frame % Math.max(1, Math.floor(60 / SPRITE_FPS)) === 0) {
      spriteFrame = (spriteFrame + 1) % SPRITE_FRAMES;
    }
  }

  // spawn obstacles
  const spawnEvery = Math.max(45, 90 - Math.floor(score / 20));
  if (frame % spawnEvery === 0) spawnObstacle();

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
      draw(); // render final frame with "Game Over"
      return;
    }
  }
}

function drawGround() {
  ctx.beginPath();
  ctx.moveTo(0, groundY + 0.5);
  ctx.lineTo(canvas.width, groundY + 0.5);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#9CA3AF"; // gray-400
  ctx.stroke();
}

function drawObstacles() {
  ctx.fillStyle = "#374151"; // gray-700
  for (const o of obstacles) ctx.fillRect(o.x, o.y, o.w, o.h);
}

function drawText(text, y) {
  ctx.font =
    "16px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  ctx.fillStyle = "#374151";
  const m = ctx.measureText(text);
  ctx.fillText(text, (canvas.width - m.width) / 2, y);
}

function drawScore() {
  ctx.font =
    "14px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  ctx.fillStyle = "#4B5563";
  const s = String(Math.floor(score / 5)).padStart(5, "0");
  ctx.fillText(s, canvas.width - 70, 24);
}

// ---------- Pixel-art CAT (code-drawn) ----------

function px(x, y, w, h, color) {
  // draw in grid units, scaled with integer multiplier for crisp pixels
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(dino.x + x * SCALE),
    Math.round(dino.y + y * SCALE),
    Math.round(w * SCALE),
    Math.round(h * SCALE)
  );
}

function outlineRect(x, y, w, h) {
  ctx.fillStyle = C_OUT;
  // top and bottom
  px(x, y, w, 1, C_OUT);
  px(x, y + h - 1, w, 1, C_OUT);
  // left and right
  px(x, y, 1, h, C_OUT);
  px(x + w - 1, y, 1, h, C_OUT);
}

/**
 * Draw a 16x16 pixel-art cat using block rectangles.
 * frame = 0,1,2 for walk cycle. Facing right.
 */
function drawCat(frameIdx) {
  // Base body block positions in grid coords
  // Body core
  px(5, 8, 8, 4, C_BODY); // torso
  outlineRect(5, 8, 8, 4);

  // Back hump
  px(10, 7, 3, 2, C_BODY);
  outlineRect(10, 7, 3, 2);

  // Chest
  px(4, 9, 2, 3, C_BODY);
  outlineRect(4, 9, 2, 3);

  // Head
  px(2, 7, 4, 4, C_BODY);
  outlineRect(2, 7, 4, 4);

  // Ears
  px(2, 6, 1, 1, C_BODY);
  px(4, 6, 1, 1, C_BODY);

  // Eye and nose
  px(4, 8, 1, 1, C_EYE); // eye
  px(3, 10, 1, 1, C_NOSE); // nose

  // Whiskers
  px(1, 10, 2, 1, C_WHISK); // left side
  px(3, 11, 2, 1, C_WHISK); // lower whisk

  // Belly highlight
  px(7, 10, 3, 1, C_BELLY);

  // Tail (animate slightly)
  // Base at (13,8)
  if (frameIdx === 0) {
    px(13, 8, 1, 3, C_BODY); // up
    px(14, 7, 1, 2, C_BODY);
  } else if (frameIdx === 1) {
    px(13, 9, 1, 3, C_BODY); // mid
    px(14, 10, 1, 1, C_BODY);
  } else {
    px(13, 10, 1, 2, C_BODY); // down
    px(14, 11, 1, 1, C_BODY);
  }

  // Legs (animate)
  // Front legs at x ~5,6 ; Back legs at x ~10,11
  if (frameIdx === 0) {
    // FL forward, BL back
    px(5, 12, 1, 3, C_BODY); // FL
    px(6, 12, 1, 2, C_BODY);
    px(10, 12, 1, 2, C_BODY); // BL
    px(11, 12, 1, 3, C_BODY);
  } else if (frameIdx === 1) {
    // neutral mid
    px(5, 12, 1, 2, C_BODY);
    px(6, 12, 1, 2, C_BODY);
    px(10, 12, 1, 2, C_BODY);
    px(11, 12, 1, 2, C_BODY);
  } else {
    // FL back, BL forward
    px(5, 12, 1, 3, C_BODY); // FL
    px(6, 12, 1, 2, C_BODY);
    px(10, 12, 1, 3, C_BODY); // BL
    px(11, 12, 1, 2, C_BODY);
  }

  // Paw outlines for definition
  px(5, 15, 1, 1, C_OUT);
  px(6, 14, 1, 1, C_OUT);
  px(10, 14, 1, 1, C_OUT);
  px(11, 15, 1, 1, C_OUT);
}

function drawDino() {
  // Clear sprite area before drawing cat
  // (main clear is already done in draw())
  drawCat(spriteFrame);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround();
  if (state === "idle") drawText("Press Space to start", 90);
  drawDino();
  drawObstacles();
  drawScore();
  if (state === "dead") drawText("Game Over — press Space or R", 120);
}

function loop() {
  rafId = requestAnimationFrame(loop);
  update();
  draw();
}

export function mount(targetCanvas) {
  if (!targetCanvas) return;
  if (canvas === targetCanvas && rafId) return; // already running here
  canvas = targetCanvas;
  ctx = canvas.getContext("2d");
  groundY = canvas.height - 20;
  ctx.imageSmoothingEnabled = false; // crisp pixels
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
