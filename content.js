// Injects a "Gemini summary" card at the top of the right-hand column on watch pages.
(() => {
  const PANEL_ID = "ytgs-panel";
  let runToken = 0;

  const videoIdFromUrl = () => (location.pathname === "/watch" ? new URLSearchParams(location.search).get("v") : null);

  async function waitFor(selector, timeout = 15000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await YTGS.sleep(200);
    }
    return null;
  }

  function el(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "onclick") e.addEventListener("click", v);
      else e.setAttribute(k, v);
    }
    for (const k of kids) e.append(k);
    return e;
  }

  // ---- panel -------------------------------------------------------------
  async function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    const host = await waitFor("ytd-watch-flexy #secondary-inner, ytd-watch-flexy #secondary");
    if (!host) return null;
    if (panel && panel.parentElement === host && host.firstElementChild === panel) return panel;
    panel?.remove();
    panel = el("div", { id: PANEL_ID },
      el("div", { class: "ytgs-head" },
        el("span", { class: "ytgs-title" }, "✨ Gemini summary"),
        el("span", { class: "ytgs-src" }),
        el("span", { class: "ytgs-btns" },
          el("button", { title: "Regenerate", onclick: () => run(true) }, "↻"),
          el("button", { title: "Copy", onclick: copy }, "⧉"),
          el("button", { title: "Collapse", onclick: () => panel.classList.toggle("ytgs-collapsed") }, "▾"))),
      el("div", { class: "ytgs-body" }));
    panel.addEventListener("click", (e) => { // timestamp links -> seek the video
      const a = e.target.closest("a[data-t]");
      if (a) { e.preventDefault(); seek(+a.dataset.t); }
    });
    host.prepend(panel);
    return panel;
  }

  function setBody(panel, node, src = "") {
    const body = panel.querySelector(".ytgs-body");
    body.replaceChildren(node);
    panel.querySelector(".ytgs-src").textContent = src;
  }

  function copy() {
    const body = document.querySelector(`#${PANEL_ID} .ytgs-body`);
    if (body) navigator.clipboard.writeText(body.innerText);
  }

  // Minimal, safe markdown: paragraphs, **bold**, *italic*, bullets, [m:ss] -> seek links.
  function render(md) {
    const frag = document.createDocumentFragment();
    const inline = (line, parent) => {
      const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[(?:\d+:)?\d{1,2}:\d{2}\])/g;
      let last = 0, m;
      while ((m = re.exec(line))) {
        parent.append(line.slice(last, m.index));
        const tok = m[0];
        if (tok.startsWith("**")) parent.append(el("b", {}, tok.slice(2, -2)));
        else if (tok.startsWith("*")) parent.append(el("i", {}, tok.slice(1, -1)));
        else {
          parent.append(el("a", { class: "ytgs-ts", href: "#", "data-t": String(YTGS.parseTime(tok.slice(1, -1))) }, tok.slice(1, -1)));
        }
        last = m.index + tok.length;
      }
      parent.append(line.slice(last));
    };
    let list = null;
    for (const block of md.replace(/\r/g, "").split(/\n{2,}/)) {
      for (const raw of block.split("\n")) {
        const line = raw.trim();
        if (!line) continue;
        const bullet = line.match(/^[-*•]\s+(.*)/);
        if (bullet) {
          if (!list) { list = el("ul"); frag.append(list); }
          const li = el("li"); inline(bullet[1], li); list.append(li);
        } else {
          list = null;
          const p = el("p"); inline(line.replace(/^#+\s*/, ""), p); frag.append(p);
        }
      }
      list = null;
    }
    return frag;
  }

  function seek(secs) {
    const v = document.querySelector("video.html5-main-video, video");
    if (v) { v.currentTime = secs; v.play?.(); }
  }

  // ---- main ---------------------------------------------------------------
  const loading = (msg) => el("div", { class: "ytgs-loading" }, msg);

  async function run(force = false) {
    const videoId = videoIdFromUrl();
    const token = ++runToken;
    if (!videoId) { document.getElementById(PANEL_ID)?.remove(); return; }
    const panel = await ensurePanel();
    if (!panel || token !== runToken) return;
    const current = () => token === runToken && videoIdFromUrl() === videoId;

    const cacheKey = `sum:${videoId}`;
    if (!force) {
      const hit = (await chrome.storage.local.get(cacheKey))[cacheKey];
      if (hit && current()) { show(panel, hit, " · cached"); return; }
    }

    const s = await chrome.runtime.sendMessage({ type: "getSettings" });
    if (!s.autoRun && !force) {
      setBody(panel, el("button", { class: "ytgs-go", onclick: () => run(true) }, "Summarise this video"));
      return;
    }

    let result = null;
    // 1) YouTube's own Gemini: Ask -> "Summarize the video". No key needed.
    if (s.mode !== "api") {
      setBody(panel, loading("Asking YouTube's Gemini to summarise…"));
      try {
        const box = await YTGS.youtubeSummary(current);
        result = { html: box.innerHTML, source: "YouTube Ask" };
      } catch (e) {
        if (!current()) return;
        if (!s.apiKey) { setBody(panel, el("div", { class: "ytgs-err" }, `⚠ ${e.message}. (Add a Gemini API key in settings to fall back to the API.)`)); return; }
      }
    }

    // 2) Gemini API with your own prompt (transcript, else Gemini watches the video).
    if (!result) {
      if (!s.apiKey) return showNoKey(panel);
      setBody(panel, loading("Reading transcript…"));
      const transcript = await YTGS.transcriptFromPanel(current).catch(() => null);
      if (!current()) return;
      const title = document.querySelector("ytd-watch-metadata h1")?.textContent.trim() || document.title.replace(/ - YouTube$/, "");
      setBody(panel, loading(transcript ? "Summarising transcript with Gemini…" : "No transcript — Gemini is watching the video (can take ~30-60 s)…"));
      const r = await chrome.runtime.sendMessage({ type: "summarize", videoId, title, transcript });
      if (!current()) return;
      if (!r.ok) {
        if (r.code === "NO_KEY") return showNoKey(panel);
        setBody(panel, el("div", { class: "ytgs-err" }, `⚠ ${r.error}`));
        return;
      }
      result = { text: r.text, source: `API · ${r.source}` };
    }

    await chrome.storage.local.set({ [cacheKey]: result });
    if (current()) show(panel, result);
  }

  function show(panel, r, suffix = "") {
    let node;
    if (r.html != null) { // re-sanitise on every render, including from cache
      node = YTGS.cleanAnswer(new DOMParser().parseFromString(r.html, "text/html").body);
    } else node = render(r.text);
    setBody(panel, node, r.source + suffix);
  }

  function showNoKey(panel) {
    setBody(panel, el("div", {},
      "Add your free Gemini API key to start. ",
      el("a", { href: "#", onclick: (e) => { e.preventDefault(); chrome.runtime.sendMessage({ type: "openOptions" }); } }, "Open settings")));
  }

  document.addEventListener("yt-navigate-finish", () => run());
  run();
})();
