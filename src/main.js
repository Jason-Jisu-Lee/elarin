import { loadResources } from "./modules/settings.js";
import { startLoop } from "./modules/textRotation.js";
import { enableOverlayFeatures } from "./modules/overlay.js";

async function init() {
  const floater = document.getElementById("floater");
  enableOverlayFeatures(floater);

  const ok = await loadResources();
  const textEl = document.getElementById("floater-text") || floater;
  if (!ok) {
    textEl.textContent = "Failed to load resources.";
    return;
  }

  startLoop(textEl);
}

// keep the overlay always click-through
async function enableClickThrough() {
  try {
    const appWindow = await window.__TAURI__.window.getCurrent();
    setTimeout(async () => {
      await appWindow.setIgnoreCursorEvents(true);
      console.log("✅ Click-through enabled");
    }, 500);
  } catch (err) {
    console.error("Click-through failed:", err);
  }
}

init().then(enableClickThrough);