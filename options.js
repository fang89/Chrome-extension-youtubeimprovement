const $ = (id) => document.getElementById(id);
const flash = (msg) => { $("status").textContent = msg; setTimeout(() => ($("status").textContent = ""), 2500); };

async function load() {
  const s = await chrome.runtime.sendMessage({ type: "getSettings" });
  $("apiKey").value = s.apiKey;
  $("model").value = s.model;
  $("mode").value = s.mode;
  $("autoRun").checked = s.autoRun;
  $("prompt").value = s.prompt;
}

$("save").onclick = async () => {
  await chrome.storage.sync.set({
    apiKey: $("apiKey").value.trim(),
    model: $("model").value.trim() || YTGS_DEFAULTS.model,
    mode: $("mode").value,
    autoRun: $("autoRun").checked,
    prompt: $("prompt").value.trim() || YTGS_DEFAULTS.prompt,
  });
  flash("Saved ✓ (reload the YouTube tab)");
};

$("reset").onclick = () => { $("prompt").value = YTGS_DEFAULTS.prompt; };

$("clear").onclick = async () => {
  const all = await chrome.storage.local.get(null);
  await chrome.storage.local.remove(Object.keys(all).filter((k) => k.startsWith("sum:")));
  flash("Cache cleared ✓");
};

$("listModels").onclick = async () => {
  const key = $("apiKey").value.trim();
  if (!key) return flash("Enter the API key first");
  let r, j;
  try {
    r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": key } });
    j = await r.json();
  } catch (e) { return flash(`Failed: ${e.message}`); }
  if (!r.ok) return flash(j.error?.message || "Failed");
  const names = (j.models || [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent") && m.name.includes("gemini"))
    .map((m) => m.name.replace("models/", ""));
  $("models").replaceChildren(...names.map((n) => Object.assign(document.createElement("option"), { value: n })));
  flash(`${names.length} models — pick one in the Model box`);
};

load();
