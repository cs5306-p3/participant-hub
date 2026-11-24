// ---------------------------------------------------------------------------
// Study settings: fill these in before launch. See README.md.
// ---------------------------------------------------------------------------
const CONFIG = {
  // From pipe.jspsych.org after you create the experiment (Google Drive storage).
  // While it is "REPLACE_ME", data is NOT uploaded; it downloads as a CSV
  // at the end instead (handy for local testing).
  DATAPIPE_EXPERIMENT_ID: "LsyYKTlBocih",

  // How participants are assigned to one of the 6 lists, if the URL has no ?list=N.
  //   "datapipe": balanced sequential assignment by DataPipe (turn on
  //               "condition assignment" with 6 conditions in DataPipe)
  //   "random":   random list per participant
  // A ?list=N in the study URL (N = 1..6) always wins. That lets you run 6
  // separate Prolific studies, one per list, for exact balance.
  LIST_ASSIGNMENT: "datapipe",

  // From the Prolific study setup page ("completion code").
  PROLIFIC_COMPLETION_CODE: "CE93667W",

  // Descriptions can't be chosen until this many ms after a trial appears.
  // Discourages clicking without reading.
  MIN_VIEW_MS: 3000,

  // Shown in the consent screen.
  CONTACT_EMAIL: "tr433@cornell.edu",
  ESTIMATED_MINUTES: 18,
};
