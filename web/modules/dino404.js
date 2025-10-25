// /modules/dino404.js
// Runner with 4-frame pixel-art sprite loaded from PNGs.
// Controls: Space/ArrowUp = start + jump, R = restart.

let canvas,
  ctx,
  rafId = null;
let state = "idle"; // idle | running | dead
let groundY, frame, score;
let dino, obstacles;

// Physics
const GRAVITY = 0.7;
const JUMP_V = -12.5;
const SPEED_BASE = 6;

// Sprite config
const FRAME_NAMES = ["1.png", "2.png", "3.png", "4.png"];
// Resolve relative to this module so it works under any base path.
// Place PNGs in /assets/ inside your deployed root (e.g., web/assets in repo).
const FRAME_URLS = FRAME_NAMES.map(
  (n) => new URL(`../assets/${n}`, import.meta.url).href
);

const SPRITE_FPS = 10; // frames per second while running
const SCALE = 2; // integer pixel scale for crispness

let images = [];
let framesReady = false;
let spriteError = false;
let animFrameIndex = 0;

function preloadFrames() {
  images = [];
  framesReady = false;
  spriteError = false;

  return Promise.all(
    FRAME_URLS.map(
      (src) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.decoding = "async";
          img.src = src;
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Failed to load " + src));
        })
    )
  )
    .then((imgs) => {
      // Basic dimension check
      const w = imgs[0].naturalWidth;
      const h = imgs[0].naturalHeight;
      const dimsOk = imgs.every(
        (im) => im.naturalWidth === w && im.naturalHeight === h
      );
      if (!dimsOk) throw new Error("Sprite frames are not the same size");
      images = imgs;
      framesReady = true;
    })
    .catch((err) => {
      console.error("[dino404] sprite preload error:", err);
      framesReady = false;
      spriteError = true;
    });
}

function resetGame() {
  frame = 0;
  score = 0;
  obstacles = [];
  const baseW = framesReady ? images[0].naturalWidth * SCALE : 44;
  const baseH = framesReady ? images[0].naturalHeight * SCALE : 48;
  dino = { x: 50, y: 0, w: baseW, h: baseH, vy: 0 };
  dino.y = groundY - dino.h;
  animFrameIndex = 0;
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

  // animate sprite when running
  if (state === "running" && framesReady && images.length > 1) {
    if (frame % Math.max(1, Math.floor(60 / SPRITE_FPS)) === 0) {
      animFrameIndex = (animFrameIndex + 1) % images.length;
    }
  }

  // obstacle spawn
  const spawnEvery = Math.max(45, 90 - Math.floor(score / 20));
  if (frame % spawnEvery === 0) spawnObstacle();

  // gravity and movement
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

function drawDino() {
  if (framesReady) {
    const img = images[animFrameIndex] || images[0];
    const dx = Math.round(dino.x);
    const dy = Math.round(dino.y);
    ctx.drawImage(img, dx, dy, dino.w, dino.h);
    return;
  }
  // fallback rectangle if images not loaded
  ctx.fillStyle = "#111827";
  ctx.fillRect(dino.x, dino.y, dino.w, dino.h);
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
  if (state === "idle") {
    if (!framesReady && !spriteError) drawText("Loading sprite…", 70);
    if (spriteError) drawText("Sprite load failed. Press Space to start", 70);
    drawText("Press Space to start", 90);
  }
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
  if (canvas === targetCanvas && rafId) return;
  canvas = targetCanvas;
  ctx = canvas.getContext("2d");
  groundY = canvas.height - 20;
  ctx.imageSmoothingEnabled = false;

  window.addEventListener("keydown", onKey);
  state = "idle";

  preloadFrames().finally(() => {
    resetGame();
    draw();
  });
}

export function unmount() {
  stop();
  if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  window.removeEventListener("keydown", onKey);
  state = "idle";
}
