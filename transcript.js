// Reads a video's transcript out of YouTube's own "Show transcript" panel.
//
// Why the panel and not an API: as of Nov 2026, both direct routes are refused even from
// inside a logged-in youtube.com tab — innertube /youtubei/v1/get_transcript answers
// 400 "Precondition check failed" and the captionTracks timedtext URL returns an empty body
// (it wants a proof-of-origin token). YouTube's own panel code still gets the data, so we
// open the panel, read the rendered segments, and close it again.

var YTGS = (typeof YTGS !== "undefined" && YTGS) || {};

YTGS.sleep = (ms) => new Promise((r) => setTimeout(r, ms));

YTGS.parseTime = (s) => s.split(":").reduce((a, b) => a * 60 + +b, 0);

YTGS.fmtTime = function (sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};

// Merge short caption segments into ~30 s chunks to save tokens.
YTGS.chunk = function (segs, every = 30) {
  const out = [];
  let cur = null;
  for (const { t, text } of segs) {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    if (!cur || t - cur.t >= every) { cur = { t, parts: [] }; out.push(cur); }
    cur.parts.push(clean);
  }
  return out.map((c) => `[${YTGS.fmtTime(c.t)}] ${c.parts.join(" ")}`).join("\n");
};

// One rendered segment -> {t, text}. Handles both panel generations:
//  - new (2026): <transcript-segment-view-model>, innerText "0:14\n14 seconds\n<text>"
//  - old:        <ytd-transcript-segment-renderer> with .segment-timestamp / .segment-text
YTGS.readSegment = function (el) {
  const ts = el.querySelector(".segment-timestamp");
  const tx = el.querySelector(".segment-text");
  if (ts && tx) return { t: YTGS.parseTime(ts.textContent.trim()), text: tx.textContent };
  const lines = el.innerText.split("\n").map((l) => l.trim()).filter(Boolean);
  const i = lines.findIndex((l) => /^\d+(:\d{2})+$/.test(l));
  if (i < 0) return null;
  // drop the screen-reader line ("14 seconds", "1 hour, 2 minutes, 5 seconds")
  const rest = lines.slice(i + 1).filter((l) => !/^\d+\s+(seconds?|minutes?|hours?)\b/i.test(l));
  return { t: YTGS.parseTime(lines[i]), text: rest.join(" ") };
};

YTGS.SEG_SEL = "transcript-segment-view-model, ytd-transcript-segment-renderer";

YTGS.transcriptFromPanel = async function (isStillCurrent) {
  let btn = null; // the description (and its "Show transcript" button) renders a moment after navigation
  for (let i = 0; i < 24 && !btn; i++) {
    btn = document.querySelector("ytd-video-description-transcript-section-renderer button");
    if (!btn) await YTGS.sleep(250);
    if (!isStillCurrent()) return null;
  }
  if (!btn) return null; // video has no transcript

  const stale = new Set(document.querySelectorAll(YTGS.SEG_SEL)); // segments left over from a previous video
  const openPanels = new Set([...document.querySelectorAll('ytd-engagement-panel-section-list-renderer[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"]')]);
  btn.click();

  let segs = [];
  for (let i = 0; i < 40; i++) {
    await YTGS.sleep(250);
    if (!isStillCurrent()) return null;
    segs = [...document.querySelectorAll(YTGS.SEG_SEL)].filter((s) => !stale.has(s));
    if (segs.length) { await YTGS.sleep(300); segs = [...document.querySelectorAll(YTGS.SEG_SEL)].filter((s) => !stale.has(s)); break; }
  }
  if (!segs.length && stale.size) segs = [...document.querySelectorAll(YTGS.SEG_SEL)]; // same video re-run: nodes were reused

  // Close the panel again, unless the user already had it open.
  const panel = segs[0]?.closest("ytd-engagement-panel-section-list-renderer");
  if (panel && !openPanels.has(panel)) {
    (panel.querySelector('#visibility-button button, button[aria-label="Close"]'))?.click();
  }

  const out = segs.map(YTGS.readSegment).filter((s) => s && s.text);
  return out.length ? YTGS.chunk(out) : null;
};
