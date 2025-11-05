// SPA router + floater control
import { loadResources } from "/modules/settings.js";
import { startLoop, stopLoop, sentences } from "/modules/textRotation.js";
import { enableOverlayFeatures } from "/modules/overlay.js";
import * as Dino404 from "/modules/dino404.js";
import * as Auth from "/modules/auth.js";

const routes = ["/", "/about/", "/login/", "/signup/", "/contact/", "/404/"];
let atlasLoaded = false;
let session = { authenticated: false, subscribed: false, user: null };

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

function setAuthNavState() {
  const a = document.getElementById("nav-auth");
  if (!a) return;
  if (session.authenticated) {
    a.textContent = "Manage subscription";
    a.removeAttribute("data-route"); // not an SPA route
    a.href = "#";
    a.onclick = (e) => {
      e.preventDefault();
      // Placeholder until Phase 6/7
      if (!session.subscribed) alert("Checkout coming soon.");
      else alert("Billing portal coming soon.");
    };
  } else {
    a.textContent = "Log In";
    a.setAttribute("data-route", "");
    a.href = "/login/";
    a.onclick = null;
  }
}

function swapContent(tplId) {
  const tpl = document.getElementById(tplId);
  const slot = document.getElementById("page-slot");
  if (!tpl || !slot) return;
  slot.replaceWith(tpl.content.firstElementChild.cloneNode(true));
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

async function refreshSession() {
  try {
    session = await Auth.getSession();
  } catch {
    session = { authenticated: false };
  }
}

function wireCTA() {
  const btn = document.getElementById("get-elarin");
  if (!btn) return;
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!session.authenticated) {
      sessionStorage.setItem(
        "loginBanner",
        "To utilize Elarin, please log in first."
      );
      sessionStorage.setItem("loginBannerType", "info");
      navTo("/login/");
      return;
    }
    if (!session.subscribed) {
      alert("Checkout coming soon.");
    } else {
      alert("Open preferences coming soon.");
    }
  });
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function wireLoginForm() {
  const banner = document.getElementById("login-banner");
  const msg = sessionStorage.getItem("loginBanner");
  const type = sessionStorage.getItem("loginBannerType");
  if (banner && msg) {
    banner.textContent = msg;
    if (type === "success") banner.classList.add("success");
    banner.hidden = false;
    sessionStorage.removeItem("loginBanner");
    sessionStorage.removeItem("loginBannerType");
  }

  const form = document.getElementById("login-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = fd.get("email");
    const password = fd.get("password");
    if (!isEmail(email))
      return showBanner(banner, "Enter a valid email address.");
    if (!password || String(password).length < 8)
      return showBanner(banner, "Password must be at least 8 characters.");
    const res = await Auth.login(email, password);
    if (res?.ok) {
      session = await Auth.getSession();
      navTo("/");
    } else {
      showBanner(banner, res?.error || "Login failed.");
    }
  });
}

function wireSignupForm() {
  const banner = document.getElementById("signup-banner");
  const failsafe = document.getElementById("signup-failsafe");
  const form = document.getElementById("signup-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = fd.get("email");
    const password = fd.get("password");
    const password2 = fd.get("password2");
    if (banner) {
      banner.hidden = true;
      banner.textContent = "";
    }
    if (failsafe) failsafe.hidden = true;

    if (!isEmail(email))
      return showBanner(banner, "Enter a valid email address.");
    if (!password || String(password).length < 8)
      return showBanner(banner, "Password must be at least 8 characters.");
    if (String(password) !== String(password2))
      return showBanner(banner, "Please enter the same password.");

    try {
      const res = await Auth.signup(email, password);
      if (res?.ok) {
        await Auth.logout();
        sessionStorage.setItem(
          "loginBanner",
          "Signed up successfully. Please log in"
        );
        sessionStorage.setItem("loginBannerType", "success");
        navTo("/login/");
      } else if (res?.error) {
        // specific error from API (e.g., duplicate email)
        showBanner(banner, res.error);
        if (failsafe) failsafe.hidden = true; // keep failsafe hidden
      } else {
        // no specific error string; use generic and show failsafe
        showBanner(banner, "Signup failed.");
        if (failsafe) failsafe.hidden = false;
      }
    } catch {
      // network/runtime issue only
      showBanner(banner, "Server error. Please try again.");
      if (failsafe) failsafe.hidden = false;
    }
  });
}

function showBanner(node, text) {
  if (!node) return;
  node.textContent = text;
  node.hidden = false;
}

// replace render() with this
async function render(path) {
  if (typeof Dino404?.unmount === "function") Dino404.unmount();
  await refreshSession();

  const p = normPath(path);
  setActiveNav(p);
  setAuthNavState();
  switch (p) {
    case "/":
      swapContent("tpl-home");
      wireCTA();
      break;
    case "/about/":
      swapContent("tpl-about");
      break;
    case "/login/":
      swapContent("tpl-login");
      wireLoginForm();
      break;
    case "/signup/":
      swapContent("tpl-signup");
      wireSignupForm();
      break;
    case "/contact/":
      swapContent("tpl-contact");
      break;
    case "/404/": {
      swapContent("tpl-404");
      const canvas = document.getElementById("dino-canvas");
      if (canvas) Dino404.mount(canvas);
      break;
    }
    default:
      swapContent("tpl-home");
      wireCTA();
  }
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

function navTo(path) {
  if (path !== normPath(location.pathname)) history.pushState({}, "", path);
  render(path);
}

window.addEventListener("popstate", () => render(location.pathname));
document.addEventListener("click", onLinkClick);

// Initial render
render(location.pathname);
