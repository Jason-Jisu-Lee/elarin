import { loadResources } from "./modules/settings.js";
import { startLoop } from "./modules/textRotation.js";
import { enableOverlayFeatures } from "./modules/overlay.js";

async function init() {
  const floater = document.getElementById("floater");
  const ok = await loadResources();
  if (!ok) {
    floater.textContent = "Failed to load resources.";
    return;
  }

  enableOverlayFeatures(floater);
  startLoop(floater);
}

// Enable OS-level click-through only after the webview is visible
async function enableClickThrough() {
  try {
    const appWindow = await window.__TAURI__.window.getCurrent();
    // small delay ensures the compositor created the surface
    setTimeout(async () => {
      await appWindow.setIgnoreCursorEvents(true);
      console.log("✅ Click-through enabled");
    }, 500);
  } catch (err) {
    console.error("Click-through failed:", err);
  }
}

init().then(enableClickThrough);
