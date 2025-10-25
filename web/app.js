// SPA router + floater control
import { loadResources } from "/modules/settings.js";
import { startLoop, stopLoop, sentences } from "/modules/textRotation.js";
import { enableOverlayFeatures } from "/modules/overlay.js";
import * as Dino404 from "/modules/dino404.js";

const routes = ["/", "/about/", "/login/", "/contact/", "/404/"];
let atlasLoaded = false;

function normPath(pathname) {
  if (pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname : pathname + "/";
}

function setActiveNav(path) {
  document.querySelectorAll(".page-tabs a[data-route]").forEach((a) => {
    const ap = normPath(new URL(a.href, location.origin).pathname);
    if (ap === path) {
      a.classList.add("current");
      a.setAttribute("aria-current", "page");
    } else {
      a.classList.remove("current");
      a.removeAttribute("aria-current");
    }
  });
}

function swapContent(tplId) {
  const tpl = document.getElementById(tplId);
  const slot = document.getElementById("page-slot");
  if (!tpl || !slot) return;
  slot.replaceWith(tpl.content.firstElementChild.cloneNode(true));
  // ensure new slot keeps the same id for future swaps
  const newSlot = document.querySelector(".hero-copy.narrow:last-of-type");
  if (newSlot) newSlot.id = "page-slot";
}

async function mountFloater() {
  let floater = document.getElementById("floater");
  if (!floater) {
    floater = document.createElement("div");
    floater.id = "floater";
    floater.textContent = "Loading…";
    document.querySelector("main").appendChild(floater);
    enableOverlayFeatures(floater);
  }
  if (!atlasLoaded) {
    const ok = await loadResources();
    atlasLoaded = ok;
    if (!ok) {
      floater.textContent =
        "Error: Cannot Connect To The Atlas. Please Contact The Developer.";
      floater.classList.add("visible");
      return;
    }
  }
  if (!Array.isArray(sentences) || sentences.length === 0) {
    floater.textContent = "No sentences loaded.";
    floater.classList.add("visible");
    return;
  }
  stopLoop();
  startLoop(floater);
}

function unmountFloater() {
  const floater = document.getElementById("floater");
  if (floater) {
    stopLoop();
    floater.remove();
  }
}

// replace render() with this
function render(path) {
  // ensure dino is cleaned up when leaving 404
  if (typeof Dino404?.unmount === "function") Dino404.unmount();
  const p = normPath(path);
  setActiveNav(p);
  switch (p) {
    case "/":
      swapContent("tpl-home");
      break;
    case "/about/":
      swapContent("tpl-about");
      break;
    case "/login/":
      swapContent("tpl-login");
      break;
    case "/contact/":
      swapContent("tpl-contact");
      break;
    case "/404/":
      swapContent("tpl-404");
      {
        const canvas = document.getElementById("dino-canvas");
        if (canvas) Dino404.mount(canvas);
      }
      break;
    default:
      swapContent("tpl-home");
  }
  // floater on every page
  mountFloater();
}

function onLinkClick(e) {
  const a = e.target.closest("a[data-route]");
  if (!a) return;
  const url = new URL(a.href, location.origin);
  if (url.origin !== location.origin) return;
  const path = normPath(url.pathname);
  if (!routes.includes(path)) return;
  e.preventDefault();
  if (path !== normPath(location.pathname)) history.pushState({}, "", path);
  render(path);
}

window.addEventListener("popstate", () => render(location.pathname));
document.addEventListener("click", onLinkClick);

// Initial render
render(location.pathname);
