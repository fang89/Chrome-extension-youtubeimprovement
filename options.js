// Settings page. Switches save the moment they're flipped; text fields save as you type
// (debounced). Content scripts listen to chrome.storage, so open tabs update live.
const $ = (id) => document.getElementById(id);

const SWITCHES = ["summaryEnabled", "autoRun", "fwEnabled", "fwButton", "fwEscExits", "fwAuto", "fwScroll",
  "fwHideScrollbar", "fwMini", "fwTopBar", "fwShowTitle", "fwPipKey", "fwHidePromo", "fwHideMiniBtn"];
const TEXTS = ["apiKey", "model", "prompt"];

let toastTimer;
function flash(msg) {
  $("status").textContent = msg;
  $("status").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("status").classList.remove("show"), 1800);
}
const save = async (obj, msg = "Saved ✓") => { await chrome.storage.sync.set(obj); flash(msg); };
const showKey = (k) => (k === " " ? "Space" : k);

// Grey out a card's rows when its master switch is off; "sub" rows follow their parent.
function refreshCards() {
  for (const box of document.querySelectorAll("input[data-card]")) {
    $(box.dataset.card).classList.toggle("disabled", !box.checked);
  }
  for (const id of ["fwHideScrollbar", "fwMini"]) {
    $(id).closest(".row").style.opacity = $("fwScroll").checked ? "" : ".4";
  }
}

async function load() {
  const s = { ...YTGS_DEFAULTS, ...(await chrome.storage.sync.get(null)) };
  for (const k of SWITCHES) $(k).checked = !!s[k];
  for (const k of TEXTS) $(k).value = s[k];
  $("mode").value = s.mode;
  $("fwKey").value = showKey(s.fwKey);
  refreshCards();
}

for (const k of SWITCHES) {
  $(k).addEventListener("change", () => { save({ [k]: $(k).checked }); refreshCards(); });
}

$("mode").addEventListener("change", () => save({ mode: $("mode").value }));

const textTimers = {};
for (const k of TEXTS) {
  $(k).addEventListener("input", () => {
    clearTimeout(textTimers[k]);
    textTimers[k] = setTimeout(() => {
      const v = $(k).value.trim();
      save({ [k]: v || (k === "apiKey" ? "" : YTGS_DEFAULTS[k]) });
    }, 600);
  });
}

$("fwKey").addEventListener("keydown", (e) => {
  if (e.key === "Tab") return;
  e.preventDefault();
  if (e.key === "Escape" || (e.key.length > 1 && !/^F\d+$/.test(e.key))) return flash("Pick a letter, symbol or F-key");
  $("fwKey").value = showKey(e.key);
  save({ fwKey: e.key }, `Shortcut set to ${showKey(e.key)} ✓`);
});

$("reset").onclick = () => { $("prompt").value = YTGS_DEFAULTS.prompt; save({ prompt: YTGS_DEFAULTS.prompt }, "Prompt reset ✓"); };

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
  flash(`${names.length} models, pick one in the Model box`);
};

load();
