// Minimal original clone of the offline dino runner. No external deps.
// Space/ArrowUp: start + jump. R: restart after game over.

let canvas,
  ctx,
  rafId = null;
let state = "idle"; // idle | running | dead
let groundY, frame, score;
let dino, obstacles;

const GRAVITY = 0.7;
const JUMP_V = -12.5;
const SPEED_BASE = 6;

function resetGame() {
  frame = 0;
  score = 0;
  obstacles = [];
  dino = { x: 50, y: 0, w: 44, h: 48, vy: 0 };
  dino.y = groundY - dino.h;
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
  const h = 25 + Math.floor(Math.random() * 40);
  const w = 10 + Math.floor(Math.random() * 20);
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

  const spawnEvery = Math.max(45, 90 - Math.floor(score / 20));
  if (frame % spawnEvery === 0) spawnObstacle();

  dino.vy += GRAVITY;
  dino.y += dino.vy;
  if (onGround()) {
    dino.y = groundY - dino.h;
    dino.vy = 0;
  }

  for (const o of obstacles) o.x -= speed;
  obstacles = obstacles.filter((o) => o.x + o.w > -10);

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
  ctx.fillStyle = "#111827";
  ctx.fillRect(dino.x, dino.y, dino.w, dino.h);
  ctx.clearRect(dino.x + dino.w - 8, dino.y + dino.h - 8, 6, 6);
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
  if (canvas === targetCanvas && rafId) return;
  canvas = targetCanvas;
  ctx = canvas.getContext("2d");
  groundY = canvas.height - 20;
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
