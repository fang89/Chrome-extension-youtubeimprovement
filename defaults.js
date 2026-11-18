// Shared defaults (loaded by background.js and options.js).
var YTGS_DEFAULTS = {
  apiKey: "",
  model: "gemini-flash-latest",
  autoRun: true,
  mode: "youtube", // "youtube" = YouTube's own Ask -> Summarize (API fallback if a key is set); "api" = Gemini API with the prompt below
  prompt:
    'Summarise the YouTube video "{title}" in 3 to 4 short paragraphs of plain prose (no bullet points, no headings).\n' +
    "Paragraph 1: what the video is about and its main conclusion.\n" +
    "Middle paragraphs: the key ideas, arguments or steps, in the order they come up.\n" +
    "Last paragraph: any notable takeaway, caveat, or who would get the most from watching it in full.\n" +
    "When you mention a specific moment, you may cite its timestamp like [m:ss]. Write in English.",
};
