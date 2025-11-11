// SPA router + floater control
import { loadResources } from "/modules/settings.js";
import { startLoop, stopLoop, sentences } from "/modules/textRotation.js";
import { enableOverlayFeatures } from "/modules/overlay.js";
import * as Dino404 from "/modules/dino404.js";
import * as Auth from "/modules/auth.js";
import * as Billing from "/modules/billing.js";
import * as News from "/modules/news.js";

const routes = [
  "/",
  "/about/",
  "/login/",
  "/account/",
  "/signup/",
  "/contact/",
  "/404/",
];
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
    session = { authenticated: false, subscribed: false, user: null };
  }
}

function setAuthNavState() {
  const a = document.getElementById("nav-auth");
  if (!a) return;
  if (session.authenticated) {
    a.textContent = "Account";
    a.setAttribute("data-route", "");
    a.href = "/login/"; // keep using /login/ as account entry in nav
    a.onclick = null;
  } else {
    a.textContent = "Log In";
    a.setAttribute("data-route", "");
    a.href = "/login/";
    a.onclick = null;
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
      Billing.createCheckoutSession().then(({ url, error }) => {
        if (url) location.href = url;
        else alert(error || "Unable to start checkout.");
      });
    } else {
      navTo("/login/"); // open Account
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
        showBanner(banner, res.error);
        if (failsafe) failsafe.hidden = true;
      } else {
        showBanner(banner, "Signup failed.");
        if (failsafe) failsafe.hidden = false;
      }
    } catch {
      showBanner(banner, "Server error. Please try again.");
      if (failsafe) failsafe.hidden = false;
    }
  });
}

function showBanner(node, text, isSuccess = false) {
  if (!node) return;
  node.textContent = text;
  node.hidden = false;
  if (isSuccess) node.classList.add("success");
  else node.classList.remove("success");
}

/* ---------- Account (preferences) ---------- */
async function wireAccountForm() {
  const banner = document.getElementById("account-banner");
  const form = document.getElementById("prefs-form");
  const btnManage = document.getElementById("btn-manage");
  if (!form) return;

  try {
    const r = await fetch("/api/preferences", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const j = await r.json();
    const prefs = j?.preferences || { topics: [], intensity: 3 };
    setFormFromPrefs(form, prefs);
  } catch {}

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = getPrefsFromForm(form);
    try {
      const r = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (j?.ok) showBanner(banner, "Preferences saved.", true);
      else showBanner(banner, j?.error || "Save failed.");
    } catch {
      showBanner(banner, "Server error. Try again.");
    }
  });

  if (btnManage) {
    btnManage.addEventListener("click", (e) => {
      e.preventDefault();
      if (!session.subscribed) {
        Billing.createCheckoutSession().then(({ url, error }) => {
          if (url) location.href = url;
          else alert(error || "Unable to start checkout.");
        });
      } else {
        Billing.createPortalSession().then(({ url, error }) => {
          if (url) location.href = url;
          else alert(error || "Unable to open billing portal.");
        });
      }
    });
  }
}

function setFormFromPrefs(form, prefs) {
  const setChecked = (name, values) => {
    const set = new Set(values || []);
    form.querySelectorAll(`input[name="${name}"]`).forEach((el) => {
      el.checked = set.has(el.value);
    });
  };
  setChecked("topics", prefs.topics || []);
  const sel = form.querySelector('select[name="intensity"]');
  if (sel) sel.value = String(prefs.intensity || 3);
}
function getPrefsFromForm(form) {
  const topics = [];
  form.querySelectorAll('input[name="topics"]:checked').forEach((el) => {
    topics.push(el.value);
  });
  const sel = form.querySelector('select[name="intensity"]');
  const intensity = sel ? Number(sel.value) : 3;
  return { topics, intensity };
}

/* ---------- Checkout success auto-sync ---------- */
async function syncSubscription() {
  try {
    const r = await fetch("/api/billing/sync-subscription", { method: "POST" });
    return await r.json();
  } catch {
    return { ok: false };
  }
}

/* ---------- Home feed ---------- */
async function renderHomeFeed() {
  const feed = document.getElementById("today-feed");
  const title = document.getElementById("today-title");
  const actions = document.getElementById("today-actions");
  if (!feed || !title) return;

  if (!session.authenticated) {
    title.textContent = "Today’s Elarin";
    feed.setAttribute("aria-busy", "false");
    feed.innerHTML = `<div class="banner" style="display:block">Log in to see your tailored feed.</div>`;
    actions.style.display = "none";
    return;
  }
  if (!session.subscribed) {
    title.textContent = "Today’s Elarin";
    feed.setAttribute("aria-busy", "false");
    feed.innerHTML = `<div class="banner" style="display:block">Subscribe to unlock the feed. You will see topic-aligned headlines here.</div>`;
    actions.style.display = "none";
    return;
  }

  title.textContent = "Today’s Elarin";
  feed.setAttribute("aria-busy", "true");
  feed.innerHTML = `<div>Loading…</div>`;
  actions.style.display = "none";

  const paint = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
      feed.innerHTML = `<div>No items right now. Try refresh.</div>`;
      actions.style.display = "block";
      return;
    }
    const frag = document.createDocumentFragment();
    for (const it of items) {
      const a = document.createElement("a");
      a.href = it.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = it.title || "(untitled)";
      a.style.textDecoration = "none";

      const meta = document.createElement("div");
      meta.style.fontSize = "12px";
      meta.style.color = "#6b7280";
      const src = it.source || "";
      const when = timeAgo(it.published_at);
      meta.textContent = [src, when].filter(Boolean).join(" · ");

      const item = document.createElement("div");
      item.style.padding = "8px 10px";
      item.style.border = "1px solid #e5e7eb";
      item.style.borderRadius = "8px";
      item.appendChild(a);
      item.appendChild(meta);
      frag.appendChild(item);
    }
    feed.innerHTML = "";
    feed.appendChild(frag);
    actions.style.display = "block";
  };

  try {
    const j = await News.getFeed();
    if (j?.ok) paint(j.items);
    else {
      feed.innerHTML = `<div class="banner">Failed to load feed.</div>`;
      actions.style.display = "block";
    }
  } catch {
    feed.innerHTML = `<div class="banner">Network error.</div>`;
    actions.style.display = "block";
  } finally {
    feed.setAttribute("aria-busy", "false");
  }

  const btn = document.getElementById("btn-refresh-feed");
  if (btn) {
    btn.onclick = async () => {
      feed.setAttribute("aria-busy", "true");
      feed.innerHTML = `<div>Refreshing…</div>`;
      try {
        const j = await News.getFeed({ refresh: true });
        if (j?.ok) {
          const top = document.querySelector("main");
          if (top) top.scrollIntoView({ behavior: "smooth", block: "start" });
          const items = Array.isArray(j.items) ? j.items : [];
          const frag = document.createDocumentFragment();
          for (const it of items) {
            const a = document.createElement("a");
            a.href = it.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = it.title || "(untitled)";
            a.style.textDecoration = "none";

            const meta = document.createElement("div");
            meta.style.fontSize = "12px";
            meta.style.color = "#6b7280";
            const src = it.source || "";
            const when = timeAgo(it.published_at);
            meta.textContent = [src, when].filter(Boolean).join(" · ");

            const item = document.createElement("div");
            item.style.padding = "8px 10px";
            item.style.border = "1px solid #e5e7eb";
            item.style.borderRadius = "8px";
            item.appendChild(a);
            item.appendChild(meta);
            frag.appendChild(item);
          }
          feed.innerHTML = "";
          feed.appendChild(frag);
        } else {
          feed.innerHTML = `<div class="banner">Failed to refresh.</div>`;
        }
      } catch {
        feed.innerHTML = `<div class="banner">Network error.</div>`;
      } finally {
        feed.setAttribute("aria-busy", "false");
      }
    };
  }
}

function timeAgo(iso) {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  const m = Math.floor(s / 60),
    h = Math.floor(m / 60),
    d = Math.floor(h / 24);
  if (d >= 1) return `${d}d ago`;
  if (h >= 1) return `${h}h ago`;
  if (m >= 1) return `${m}m ago`;
  return `${s}s ago`;
}

// replace render() with this
async function render(path) {
  if (typeof Dino404?.unmount === "function") Dino404.unmount();
  await refreshSession();

  // If returning from Stripe success URL, try one-time sync
  const urlNow = new URL(location.href);
  if (
    urlNow.searchParams.get("status") === "success" &&
    session.authenticated
  ) {
    await syncSubscription();
    await refreshSession();
    history.replaceState({}, "", normPath(location.pathname));
  }

  const p = normPath(path);
  setActiveNav(p);
  setAuthNavState();

  switch (p) {
    case "/":
      swapContent("tpl-home");
      wireCTA();
      await renderHomeFeed();
      break;
    case "/about/":
      swapContent("tpl-about");
      break;
    case "/login/":
      if (session.authenticated) {
        swapContent("tpl-account");
        await wireAccountForm();
      } else {
        swapContent("tpl-login");
        wireLoginForm();
      }
      break;
    case "/account/":
      if (!session.authenticated) {
        sessionStorage.setItem(
          "loginBanner",
          "Please log in to access Account."
        );
        sessionStorage.setItem("loginBannerType", "info");
        navTo("/login/");
        return;
      }
      swapContent("tpl-account");
      await wireAccountForm();
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
      await renderHomeFeed();
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
