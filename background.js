importScripts("defaults.js");

const API = "https://generativelanguage.googleapis.com/v1beta";

async function settings() {
  return { ...YTGS_DEFAULTS, ...(await chrome.storage.sync.get(Object.keys(YTGS_DEFAULTS))) };
}

async function callGemini(s, body) {
  const r = await fetch(`${API}/models/${encodeURIComponent(s.model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": s.apiKey },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error?.message || `Gemini API HTTP ${r.status}`);
  const cand = j.candidates?.[0];
  const text = (cand?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("").trim();
  if (!text) throw new Error(`Empty answer (${cand?.finishReason || j.promptFeedback?.blockReason || "no candidates"})`);
  return text;
}

async function summarize({ videoId, title, transcript }) {
  const s = await settings();
  if (!s.apiKey) throw Object.assign(new Error("NO_KEY"), { code: "NO_KEY" });
  const prompt = s.prompt.replaceAll("{title}", title || "this video");

  if (transcript) {
    const text = await callGemini(s, {
      contents: [{ role: "user", parts: [{ text: `${prompt}\n\nTranscript (timestamped):\n${transcript}` }] }],
    });
    return { text, source: "transcript" };
  }
  // No transcript: let Gemini watch the public video itself. Low media resolution keeps tokens down.
  const text = await callGemini(s, {
    contents: [{
      role: "user",
      parts: [{ fileData: { fileUri: `https://www.youtube.com/watch?v=${videoId}` } }, { text: prompt }],
    }],
    generationConfig: { mediaResolution: "MEDIA_RESOLUTION_LOW" },
  });
  return { text, source: "video" };
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === "summarize") {
    summarize(msg)
      .then((r) => reply({ ok: true, ...r }))
      .catch((e) => reply({ ok: false, error: e.message, code: e.code }));
    return true; // async reply
  }
  if (msg.type === "openOptions") chrome.runtime.openOptionsPage();
  if (msg.type === "getSettings") { settings().then(reply); return true; }
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
