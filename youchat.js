// Gets YouTube's own Gemini summary: clicks the ✦ "Ask" button under the video, clicks
// "Summarize the video" in the "Ask about this video" panel, waits for the answer, copies it
// out, and closes the panel. No API key needed. Selectors checked on 2026-11-18.

var YTGS = (typeof YTGS !== "undefined" && YTGS) || {};

YTGS.ASK = {
  askBtn: 'ytd-watch-metadata button[aria-label="Ask"]',
  panel: 'ytd-engagement-panel-section-list-renderer[target-id="PAyouchat"]',
  answer: 'you-chat-item-view-model[data-target-id^="youchat"]',
  chipText: /^summari[sz]e (the|this) video$/i,
};

// Copy YouTube's answer into fresh, safe DOM (only text + a few formatting tags).
// Timestamp links become plain <a data-t="secs"> that content.js turns into seeks.
YTGS.cleanAnswer = function (src) {
  const KEEP = new Set(["P", "STRONG", "B", "EM", "I", "UL", "OL", "LI", "BR", "H1", "H2", "H3", "H4"]);
  const walk = (node, out) => {
    for (const n of node.childNodes) {
      if (n.nodeType === Node.TEXT_NODE) { out.append(n.textContent); continue; }
      if (n.nodeType !== Node.ELEMENT_NODE) continue;
      if (n.tagName === "A") {
        const t = (n.getAttribute("href") || "").match(/[?&]t=(\d+)/)?.[1];
        if (t) { const a = document.createElement("a"); a.className = "ytgs-ts"; a.href = "#"; a.dataset.t = t; a.textContent = n.textContent; out.append(a); }
        else out.append(n.textContent);
        continue;
      }
      if (KEEP.has(n.tagName)) { const e = document.createElement(n.tagName); walk(n, e); out.append(e); }
      else walk(n, out); // unwrap spans etc.
    }
  };
  const box = document.createElement("div");
  walk(src, box);
  return box;
};

YTGS.youtubeSummary = async function (isStillCurrent, timeoutMs = 60000) {
  const { sleep } = YTGS;
  const A = YTGS.ASK;
  const until = async (fn, ms, step = 250) => {
    for (let t = 0; t < ms; t += step) {
      if (!isStillCurrent()) throw new Error("navigated away");
      const v = fn();
      if (v) return v;
      await sleep(step);
    }
    return null;
  };

  const ask = await until(() => document.querySelector(A.askBtn), 8000);
  if (!ask) throw new Error("YouTube's Ask button isn't available on this video");

  const wasOpen = document.querySelector(A.panel)?.getAttribute("visibility") === "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED";
  // Hide the Ask panel while we drive it. Counted, so an older run that ends after a newer
  // one started (navigation mid-run) can't un-hide it, and the class never gets stuck.
  YTGS.busy = (YTGS.busy || 0) + 1;
  document.documentElement.classList.add("ytgs-busy");
  try {
    if (!wasOpen) ask.click();
    const panel = await until(() => {
      const p = document.querySelector(A.panel);
      return p?.getAttribute("visibility") === "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED" ? p : null;
    }, 8000);
    if (!panel) throw new Error("Ask panel did not open");

    const chip = await until(() => [...panel.querySelectorAll("button")].find((b) => A.chipText.test(b.innerText.trim())), 8000);
    if (!chip) throw new Error('No "Summarize the video" option in the Ask panel');

    const before = new Set(panel.querySelectorAll(A.answer));
    chip.click();

    // Done when the new answer shows its thumbs-up/down row, or its text stops changing for 4 s.
    let lastLen = -1, stableFor = 0;
    const md = await until(() => {
      const items = [...panel.querySelectorAll(A.answer)].filter((x) => !before.has(x) && x.querySelector("markdown-div"));
      const item = items.at(-1);
      if (!item) return null;
      const m = item.querySelector("markdown-div");
      if (item.querySelector("yt-response-actions-view-model") && m.innerText.trim().length > 40) return m;
      const len = m.innerText.length;
      stableFor = len === lastLen && len > 100 ? stableFor + 500 : 0;
      lastLen = len;
      return stableFor >= 4000 ? m : null;
    }, timeoutMs, 500);
    if (!md) throw new Error("Timed out waiting for YouTube's summary");

    return YTGS.cleanAnswer(md);
  } finally {
    // Close the panel again if we opened it — also on failure, but not if the user has
    // navigated on (the panel now belongs to the next video's run).
    if (!wasOpen && isStillCurrent()) {
      document.querySelector(A.panel)?.querySelector('#visibility-button button, button[aria-label="Close"]')?.click();
    }
    if (--YTGS.busy <= 0) { YTGS.busy = 0; document.documentElement.classList.remove("ytgs-busy"); }
  }
};
