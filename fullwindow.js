// Full-window mode: the player fills the browser tab (not the screen), YouTube's top bar
// hides until you hover it, and you can still scroll down to the summary and comments.
// It works by switching YouTube into theater mode and then stretching the player to 100vh.
(() => {
  const FW = "ytgs-fw";               // body class while full-window is on
  const BTN_ID = "ytgs-fw-btn";
  const ICON_ENTER = "M883 1056q0 13-10 23l-332 332 144 144q19 19 19 45t-19 45-45 19h-448q-26 0-45-19t-19-45v-448q0-26 19-45t45-19 45 19l144 144 332-332q10-10 23-10t23 10l114 114q10 10 10 23zm781-864v448q0 26-19 45t-45 19-45-19l-144-144-332 332q-10 10-23 10t-23-10l-114-114q-10-10-10-23t10-23l332-332-144-144q-19-19-19-45t19-45 45-19h448q26 0 45 19t19 45z";
  const ICON_EXIT = "M896 960v448q0 26-19 45t-45 19-45-19l-144-144-332 332q-10 10-23 10t-23-10l-114-114q-10-10-10-23t10-23l332-332-144-144q-19-19-19-45t19-45 45-19h448q26 0 45 19t19 45zm755-672q0 13-10 23l-332 332 144 144q19 19 19 45t-19 45-45 19h-448q-26 0-45-19t-19-45v-448q0-26 19-45t45-19 45 19l144 144 332-332q10-10 23-10t23 10l114 114q10 10 10 23z";

  const KEYS = ["fwEnabled", "fwEscExits", "fwButton", "fwKey", "fwAuto", "fwScroll", "fwHideScrollbar", "fwTopBar",
    "fwShowTitle", "fwMini"];
  let s = {};
  let on = false;
  let wasTheater = false;   // theater state before we entered, restored on exit
  let mini = false;

  const isWatch = () => /^\/(watch|live\/|clip\/)/.test(location.pathname);
  const watchEl = () => document.querySelector("ytd-watch-flexy, ytd-watch-grid, ytd-watch");
  const theater = () => !!watchEl()?.hasAttribute("theater");
  const player = () => document.getElementById("movie_player");
  const nudge = () => window.dispatchEvent(new Event("resize")); // makes the player re-measure

  // ---- settings ------------------------------------------------------------
  async function loadSettings() {
    s = { ...YTGS_DEFAULTS, ...(await chrome.storage.sync.get(KEYS)) };
    if (on) applyClasses();
    if (!s.fwMini || !s.fwEnabled) setMini(false);
    if (!s.fwEnabled) exit();
    ensureButton();
  }
  chrome.storage.onChanged.addListener((c, area) => {
    if (area === "sync" && KEYS.some((k) => k in c)) loadSettings();
  });

  // ---- player button -------------------------------------------------------
  function svg(path) {
    return `<svg width="20" height="28" viewBox="0 0 1792 1792" style="margin:9px"><path fill="#fff" d="${path}"/></svg>`;
  }

  function ensureButton() {
    let btn = document.getElementById(BTN_ID);
    if (!s.fwEnabled || !s.fwButton) { btn?.remove(); return; }
    const size = document.querySelector("#movie_player .ytp-size-button");
    if (!size) return;
    if (btn && btn.nextElementSibling === size) return;
    btn?.remove();
    btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.className = "ytp-button";
    btn.addEventListener("click", toggle);
    size.parentElement.insertBefore(btn, size);
    paintButton();
  }

  function paintButton() {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    btn.innerHTML = svg(on ? ICON_EXIT : ICON_ENTER);
    const label = `${on ? "Exit full window" : "Full window"} (${s.fwKey === " " ? "Space" : s.fwKey})`;
    btn.title = label;
    btn.setAttribute("aria-label", label);
  }

  // ---- enter / exit --------------------------------------------------------
  function applyClasses() {
    const b = document.body.classList;
    b.add(FW);
    b.toggle("ytgs-fw-scroll", !!s.fwScroll);
    b.toggle("ytgs-fw-noscrollbar", !!(s.fwScroll && s.fwHideScrollbar));
    b.toggle("ytgs-fw-topbar", !!s.fwTopBar);
    if (s.fwShowTitle) player()?.classList.remove("ytp-hide-info-bar");
  }

  // Theater mode can take a moment to stick (the size button may not exist yet): retry.
  function forceTheater(tries = 15) {
    if (!on || tries <= 0 || theater()) return;
    const size = document.querySelector("#movie_player .ytp-size-button");
    if (size) size.click();
    setTimeout(() => forceTheater(tries - 1), size ? 300 : 200);
  }

  function enter() {
    if (on || !s.fwEnabled || !isWatch() || document.fullscreenElement) return;
    on = true;
    wasTheater = theater();
    forceTheater();
    window.scrollTo(0, 0);
    applyClasses();
    paintButton();
    nudge();
  }

  function exit() {
    if (!on) return;
    on = false;
    document.body.classList.remove(FW, "ytgs-fw-scroll", "ytgs-fw-noscrollbar", "ytgs-fw-topbar");
    if (!wasTheater && theater()) document.querySelector("#movie_player .ytp-size-button")?.click();
    paintButton();
    nudge();
  }

  const toggle = () => (on ? exit() : enter());

  // ---- keyboard ------------------------------------------------------------
  const typing = (t) => t?.closest?.("input, textarea, select, [contenteditable=''], [contenteditable='true']");

  document.addEventListener("keydown", (e) => {
    if (!s.fwEnabled || !isWatch() || typing(e.target)) return;
    if (e.key === "Escape") { if (on && s.fwEscExits && !document.fullscreenElement) exit(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (s.fwKey && e.key.toLowerCase() === s.fwKey.toLowerCase()) {
      e.preventDefault(); e.stopPropagation();
      toggle();
    }
  }, true);

  // Real (screen) fullscreen takes over; our button would just be clutter there.
  document.addEventListener("fullscreenchange", () => {
    const btn = document.getElementById(BTN_ID);
    if (btn) btn.style.display = document.fullscreenElement ? "none" : "";
  });

  // ---- scrolling: top bar reveal + floating mini player --------------------
  const miniTop = Object.assign(document.createElement("button"), { className: "ytgs-mini-top", textContent: "Go to top" });
  const miniHide = Object.assign(document.createElement("button"), { className: "ytgs-mini-hide", textContent: "Hide" });
  miniTop.addEventListener("click", (e) => { e.stopPropagation(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  miniHide.addEventListener("click", (e) => {
    e.stopPropagation();
    const p = player();
    const hidden = p?.classList.toggle("ytgs-mini-tucked");
    miniHide.textContent = hidden ? "Show" : "Hide";
  });

  function setMini(want) {
    const p = player();
    if (!p || want === mini) return;
    mini = want;
    document.body.classList.toggle("ytgs-mini-on", want);
    if (want) {
      p.append(miniTop, miniHide);
      p.classList.add("ytgs-mini", "ytp-small-mode");
    } else {
      miniTop.remove(); miniHide.remove();
      miniHide.textContent = "Hide";
      p.classList.remove("ytgs-mini", "ytgs-mini-tucked", "ytp-small-mode");
    }
    nudge();
  }

  window.addEventListener("scroll", () => {
    const mast = document.getElementById("masthead-container");
    if (mast) mast.classList.toggle("ytgs-show", window.scrollY >= 100);
    setMini(!!(s.fwMini && on && isWatch() && window.scrollY > window.innerHeight - 100));
  }, { passive: true });

  // ---- navigation ----------------------------------------------------------
  // YouTube swaps videos without a page load; the player (and our button) usually survive,
  // but re-check after every navigation.
  let navTimer;
  function onNav() {
    clearTimeout(navTimer);
    navTimer = setTimeout(async () => {
      if (!isWatch()) { exit(); setMini(false); return; }
      for (let i = 0; i < 30 && !document.querySelector("#movie_player .ytp-size-button"); i++) {
        await new Promise((r) => setTimeout(r, 300));
      }
      ensureButton();
      if (on) { applyClasses(); forceTheater(); }
      else if (s.fwAuto) enter();
    }, 100);
  }
  ["yt-navigate-finish", "yt-page-data-updated", "popstate"].forEach((ev) => document.addEventListener(ev, onNav));

  loadSettings().then(onNav);
})();
