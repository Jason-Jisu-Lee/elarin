// Single-window hover controls inside #floater
// - Text lives in #floater-text (so rotation doesn't wipe controls)
// - Icons appear on hover
// - Drag handle repositions and persists

function hasTauri() {
  return !!(window.__TAURI__ && window.__TAURI__.window);
}

function loadSavedPos() {
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

export function enableOverlayFeatures(floater) {
  if (!floater) return;

  // Build inner structure: text + controls
  floater.innerHTML = `
    <span id="floater-text">Loading...</span>
    <div id="floater-controls" aria-hidden="true">
      <button class="floater-btn floater-close" title="Close" aria-label="Close">×</button>
      <button class="floater-btn floater-drag"  title="Drag"  aria-label="Drag">⠿</button>
      <button class="floater-btn floater-gear"  title="Settings" aria-label="Settings">⚙</button>
    </div>
  `;

  // Restore saved position
  const saved = loadSavedPos();
  if (saved) applyPos(floater, saved.x, saved.y);

  const closeBtn = floater.querySelector(".floater-close");
  const dragBtn  = floater.querySelector(".floater-drag");
  const gearBtn  = floater.querySelector(".floater-gear");

  // Close behavior
  closeBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (hasTauri()) {
      try { const aw = await window.__TAURI__.window.getCurrent(); await aw.close(); } catch {}
    } else {
      window.close();
    }
  });

  // Drag behavior
  let dragging = false;
  let startX = 0, startY = 0;
  let origX = 0, origY = 0;

  dragBtn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    const rect = floater.getBoundingClientRect();
    origX = rect.left;
    origY = rect.top;
    startX = e.clientX;
    startY = e.clientY;
    document.body.style.userSelect = "none";
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const nx = origX + (e.clientX - startX);
    const ny = origY + (e.clientY - startY);
    applyPos(floater, nx, ny);
  });

  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = "";
    // persist final position
    const r = floater.getBoundingClientRect();
    savePos(r.left, r.top);
  });

  // Settings placeholder
  gearBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    console.log("Settings panel to be implemented.");
  });
}
