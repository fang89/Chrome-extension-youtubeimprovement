// Shared defaults (loaded by background.js and options.js).
var YTGS_DEFAULTS = {
  summaryEnabled: true,   // master switch for the summary card
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

  // Full-window mode (fullwindow.js): the player fills the browser tab.
  fwEnabled: true,        // master switch for full-window mode
  fwButton: true,         // show the button in the player bar
  fwKey: "`",             // toggle key
  fwAuto: false,          // turn it on for every video
  fwScroll: true,         // can still scroll down to the summary/comments
  fwHideScrollbar: false,
  fwTopBar: false,        // keep YouTube's top bar visible instead of hover-to-show
  fwShowTitle: false,     // keep the video title over the player
  fwMini: false,          // floating mini player once you scroll past the video
  fwEscExits: true,       // Esc leaves full-window
  fwPipKey: true,         // Alt+P = picture-in-picture
  fwHidePromo: false,     // hide "Includes paid promotion" overlay
  fwHideMiniBtn: false,   // hide YouTube's own miniplayer button
};
