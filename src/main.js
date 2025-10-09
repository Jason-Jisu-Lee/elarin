import { loadResources } from "./modules/settings.js";
import { startLoop } from "./modules/textRotation.js";
import { enableOverlayFeatures } from "./modules/overlay.js";

async function init() {
  const floater = document.getElementById("floater");
  enableOverlayFeatures(floater);

  try {
    const ok = await loadResources();
    if (!ok) {
      floater.textContent = "Error: Cannot Connect To The Atlas. Please Contact The Developer.";
      floater.classList.add("visible");
      return;
    }

    startLoop(floater);
  } catch (err) {
    console.error("init error:", err);
    floater.textContent = "Error: Cannot Connect To The Atlas. Please Contact The Developer.";
    floater.classList.add("visible");
  }
}

// always click-through
async function enableClickThrough() {
  try {
    const appWindow = await window.__TAURI__.window.getCurrent();
    setTimeout(() => appWindow.setIgnoreCursorEvents(true), 500);
  } catch (err) {
    console.error("Click-through failed:", err);
  }
}

init().then(enableClickThrough);
