// src/modules/overlay.js
// Two-window design, but fully guarded if Tauri API is unavailable.

function isControlsRole() {
  const q = new URLSearchParams(location.search);
  return q.get("role") === "controls";
}

function hasTauri() {
  return !!(window.__TAURI__ && window.__TAURI__.window && window.__TAURI__.event);
}

/* -------------------- MAIN WINDOW -------------------- */
async function getCurrentWindow() {
  return await window.__TAURI__.window.getCurrent();
}

async function loadSavedPos() {
  const x = parseFloat(localStorage.getItem("floater.left"));
  const y = parseFloat(localStorage.getItem("floater.top"));
  if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  return null;
}

function savePos(x, y) {
  localStorage.setItem("floater.left", String(x));
  localStorage.setItem("floater.top", String(y));
}

function applyPos(floater, x, y) {
  floater.style.left = `${x}px`;
  floater.style.top = `${y}px`;
  floater.style.right = "auto";
  floater.style.bottom = "auto";
}

async function computeAnchor(floater) {
  const rect = floater.getBoundingClientRect();
  const win = await getCurrentWindow();
  const pos = await win.outerPosition();
  return { x: pos.x + rect.right, y: pos.y + rect.top, w: rect.width, h: rect.height };
}

export async function enableOverlayFeatures(floater) {
  if (!floater) return;

  // Allow text to show even without Tauri
  const saved = await loadSavedPos();
  if (saved) applyPos(floater, saved.x, saved.y);

  if (!hasTauri()) {
    console.warn("No Tauri API. Running without click-through/controls.");
    return;
  }

  // Move-by events from controls window
  await window.__TAURI__.event.listen("floater:moveBy", ({ payload }) => {
    const { dx = 0, dy = 0 } = payload || {};
    const r = floater.getBoundingClientRect();
    const nx = r.left + dx;
    const ny = r.top + dy;
    applyPos(floater, nx, ny);
    savePos(nx, ny);
  });

  // Controls asks for anchor → reply
  await window.__TAURI__.event.listen("controls:request-anchor", async () => {
    const anchor = await computeAnchor(floater);
    try {
      await window.__TAURI__.event.emitTo("controls", "controls:set-anchor", anchor);
    } catch {}
  });
}

export async function ensureControlsWindow(floater) {
  if (!hasTauri()) return;

  const { WebviewWindow } = window.__TAURI__.window;
  const existing = window.__TAURI__.window.WebviewWindow.getByLabel?.("controls");
  if (existing) {
    await window.__TAURI__.event.emit("controls:request-anchor");
    return;
  }

  const anchor = await computeAnchor(floater);
  const width = 22, height = 68, margin = 6;
  const x = Math.round(anchor.x + margin);
  const y = Math.round(Math.max(0, anchor.y - height));

  new WebviewWindow("controls", {
    url: "index.html?role=controls",
    width, height, x, y,
    decorations: false, transparent: true, alwaysOnTop: true,
    resizable: false, focus: false, visible: true, skipTaskbar: true, fileDropEnabled: false
  });

  setTimeout(() => {
    window.__TAURI__.event.emit("controls:request-anchor");
  }, 300);
}

/* -------------------- CONTROLS WINDOW -------------------- */
async function renderControlsUI() {
  document.body.innerHTML = "";
  document.body.classList.add("controls");

  const root = document.createElement("div");
  root.id = "controls-root";

  const btnClose = document.createElement("div");
  btnClose.className = "ctl-btn ctl-close"; btnClose.textContent = "×";

  const btnDrag = document.createElement("div");
  btnDrag.className = "ctl-btn ctl-drag"; btnDrag.textContent = "⠿";

  const btnGear = document.createElement("div");
  btnGear.className = "ctl-btn ctl-gear"; btnGear.textContent = "⚙";

  root.append(btnClose, btnDrag, btnGear);
  document.body.appendChild(root);

  // Close main app
  btnClose.addEventListener("click", async (e) => {
    e.stopPropagation();
    try { await window.__TAURI__.event.emitTo("main", "app:close"); } catch {}
    const me = await getCurrentWindow();
    me.close();
  });

  // Drag
  let dragging = false, startX = 0, startY = 0, startPos = null;

  btnDrag.addEventListener("mousedown", async (e) => {
    e.preventDefault();
    dragging = true;
    startX = e.screenX; startY = e.screenY;
    startPos = await (await getCurrentWindow()).outerPosition();
    document.body.style.userSelect = "none";
  });

  window.addEventListener("mousemove", async (e) => {
    if (!dragging) return;
    const dx = e.screenX - startX, dy = e.screenY - startY;
    await window.__TAURI__.event.emitTo("main", "floater:moveBy", { dx, dy });
    const me = await getCurrentWindow();
    await me.setPosition({ x: startPos.x + dx, y: startPos.y + dy });
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
    document.body.style.userSelect = "";
  });

  btnGear.addEventListener("click", () => console.log("Settings to implement."));

  await window.__TAURI__.event.listen("controls:set-anchor", async ({ payload }) => {
    const { x, y } = payload || {};
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const me = await getCurrentWindow();
    const sz = await me.outerSize();
    const margin = 6;
    await me.setPosition({ x: Math.round(x + margin), y: Math.round(y - sz.height) });
  });
}

export async function initControlsWindowIfNeeded() {
  if (!isControlsRole()) return;
  if (!hasTauri()) { console.warn("Controls role without Tauri API."); return; }
  await renderControlsUI();
}
