import { loadResources } from "./modules/settings.js";
import { startLoop } from "./modules/textRotation.js";
import { enableOverlayFeatures, ensureControlsWindow, initControlsWindowIfNeeded } from "./modules/overlay.js";

function hasTauri() {
  return !!(window.__TAURI__ && window.__TAURI__.window && window.__TAURI__.event);
}

async function initMain() {
  const floater = document.getElementById("floater");
  const ok = await loadResources();
  if (!ok) {
    floater.textContent = "Failed to load resources.";
    return;
  }

  await enableOverlayFeatures(floater);
  startLoop(floater);

  if (hasTauri()) {
    await ensureControlsWindow(floater);
    try {
      const appWin = await window.__TAURI__.window.getCurrent();
      setTimeout(async () => {
        await appWin.setIgnoreCursorEvents(true);
        console.log("Main click-through enabled");
      }, 300);
    } catch (err) {
      console.error("setIgnoreCursorEvents failed:", err);
    }

    await window.__TAURI__.event.listen("app:close", async () => {
      try { const aw = await window.__TAURI__.window.getCurrent(); await aw.close(); } catch {}
    });
  } else {
    console.warn("Running without Tauri window features.");
  }
}

(function bootstrap() {
  const role = new URLSearchParams(location.search).get("role") || "main";
  if (role === "controls") {
    initControlsWindowIfNeeded();
  } else {
    initMain();
  }
})();
