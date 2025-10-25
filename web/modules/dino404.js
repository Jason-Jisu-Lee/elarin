// /modules/dino404.js
// Minimal runner with optional pixel-art sprite. No external deps.
// Controls: Space/ArrowUp = start/jump, R = restart.

let canvas,
  ctx,
  rafId = null;
let state = "idle"; // idle | running | dead
let groundY, frame, score;
let dino, obstacles;

// Physics and game pace
const GRAVITY = 0.7;
const JUMP_V = -12.5;
const SPEED_BASE = 6;

// Sprite config. Set SPRITE_URL to your asset or leave null for rectangle.
// Requirements: PNG/WebP with alpha. One horizontal row of frames. No padding.
const SPRITE_URL = "/assets/cat.png"; // e.g., "/assets/cat.png" or null
const SPRITE_FRAME_W = 32; // source frame width in px
const SPRITE_FRAME_H = 32; // source frame height in px
const SPRITE_FRAMES = 4; // number of frames in the row
const SPRITE_FPS = 8; // animation speed while running

let spriteImg = null,
  spriteReady = false,
  spriteFrame = 0;

function resetGame() {
  frame = 0;
  score = 0;
  obstacles = [];
  const scale = SPRITE_URL ? 2 : 1; // scale pixel art by integer for crispness
  const w = SPRITE_URL ? SPRITE_FRAME_W * scale : 44;
  const h = SPRITE_URL ? SPRITE_FRAME_H * scale : 48;
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

  // advance sprite animation when running
  if (spriteReady && state === "running" && SPRITE_FRAMES > 1) {
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

function drawDino() {
  if (spriteReady) {
    const sx = (spriteFrame % SPRITE_FRAMES) * SPRITE_FRAME_W;
    const sy = 0;
    const dx = Math.round(dino.x);
    const dy = Math.round(dino.y);
    ctx.drawImage(
      spriteImg,
      sx,
      sy,
      SPRITE_FRAME_W,
      SPRITE_FRAME_H,
      dx,
      dy,
      dino.w,
      dino.h
    );
    return;
  }
  // fallback rectangle dino
  ctx.fillStyle = "#111827"; // gray-900
  ctx.fillRect(dino.x, dino.y, dino.w, dino.h);
  ctx.clearRect(dino.x + dino.w - 8, dino.y + dino.h - 8, 6, 6);
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
  ctx.imageSmoothingEnabled = false; // crisp pixel-art

  if (SPRITE_URL && !spriteImg) {
    spriteImg = new Image();
    spriteImg.src = SPRITE_URL;
    spriteImg.onload = () => {
      spriteReady = true;
    };
    spriteImg.onerror = () => {
      spriteReady = false;
    };
  }

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
