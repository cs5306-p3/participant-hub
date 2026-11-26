// Which description is the original? A two-choice task for Prolific.
// Depends on: config.js (CONFIG), stimuli.js (IMAGES, LISTS), jsPsych 8 + plugins.

(async function main() {
  // ---- Block phones / very small screens (also set Prolific's device filter to desktop) ----
  if (window.innerWidth < 700 || /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
    document.body.innerHTML =
      '<div class="blocked"><h2>Please use a computer</h2>' +
      "<p>This study needs a laptop or desktop screen. Please return it on Prolific, " +
      "or reopen the link on a computer.</p></div>";
    return;
  }

  // ---- Discourage copying text out (e.g. into a chatbot); allow it in text boxes ----
  const inTextBox = (e) => e.target && e.target.closest && e.target.closest("textarea, input");
  ["copy", "cut", "contextmenu", "dragstart"].forEach((ev) =>
    document.addEventListener(ev, (e) => { if (!inTextBox(e)) e.preventDefault(); })
  );

  // ---- Count how often the participant leaves the page (switches tab/window) ----
  let blurCount = 0;

  const jsPsych = initJsPsych({
    on_interaction_data_update: (d) => { if (d.event === "blur") blurCount++; },
    show_progress_bar: true,
    auto_update_progress_bar: false,
    message_progress_bar: "Progress",
  });

  // ---- Participant / session info from Prolific's URL parameters ----
  const PID = jsPsych.data.getURLVariable("PROLIFIC_PID");
  const STUDY_ID = jsPsych.data.getURLVariable("STUDY_ID") || "";
  const SESSION_ID = jsPsych.data.getURLVariable("SESSION_ID") || "";
  const isTest = !PID;
  const participantId = PID || "TEST_" + jsPsych.randomization.randomID(8);
  const pipeOn = CONFIG.DATAPIPE_EXPERIMENT_ID && CONFIG.DATAPIPE_EXPERIMENT_ID !== "REPLACE_ME";
  const completionUrl =
    "https://app.prolific.com/submissions/complete?cc=" + encodeURIComponent(CONFIG.PROLIFIC_COMPLETION_CODE);

  // ---- Assign one of the 6 lists ----
  let listId = null;
  let listSource = null;
  const urlList = parseInt(jsPsych.data.getURLVariable("list"), 10);
  if (urlList >= 1 && urlList <= LISTS.length) {
    listId = urlList;
    listSource = "url";
  } else if (CONFIG.LIST_ASSIGNMENT === "datapipe" && pipeOn) {
    try {
      const c = await jsPsychPipe.getCondition(CONFIG.DATAPIPE_EXPERIMENT_ID);
      if (Number.isInteger(c)) {
        listId = (c % LISTS.length) + 1;
        listSource = "datapipe";
      }
    } catch (e) {
      console.warn("DataPipe condition assignment failed; using random.", e);
    }
  }
  if (listId === null) {
    listId = jsPsych.randomization.randomInt(1, LISTS.length);
    listSource = "random";
  }
  const LIST = LISTS.find((L) => L.list_id === listId);

  jsPsych.data.addProperties({
    participant_id: participantId,
    prolific_pid: PID || "",
    study_id: STUDY_ID,
    session_id: SESSION_ID,
    is_test: isTest,
    list_id: listId,
    list_source: listSource,
    window_w: window.innerWidth,
    window_h: window.innerHeight,
  });

  // ---- Helpers ----
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const SIDES = ["A", "B"]; // A = left, B = right

  const ATTENTION_TEXT =
    "This is an attention check. To show you are reading carefully, " +
    "please select this description, then choose 2 for your confidence.";

  // ---- Build the trial list ----
  const mainTrials = jsPsych.randomization.shuffle(LIST.trials);
  // put the original on the left exactly half the time
  const origSides = jsPsych.randomization.shuffle(
    mainTrials.map((_, i) => (i < mainTrials.length / 2 ? "A" : "B"))
  );
  const items = mainTrials.map((t, i) => {
    const img = IMAGES[t.image_id];
    const origSide = origSides[i];
    const other = img[t.variant];
    return {
      kind: "main",
      image_id: t.image_id,
      category: img.category,
      file: img.file,
      variant: t.variant,
      original_side: origSide,
      texts: origSide === "A" ? [img.original, other] : [other, img.original],
    };
  });

  // attention checks spread through the study (after trials 8, 17, 26 of 30)
  const attPositions = [8, 17, 26];
  LIST.attention_images.forEach((imageId, k) => {
    const img = IMAGES[imageId];
    const side = SIDES[jsPsych.randomization.randomInt(0, 1)];
    const att = {
      kind: "attention",
      image_id: imageId,
      category: img.category,
      file: img.file,
      variant: "attention_check",
      original_side: side === "A" ? "B" : "A",
      target_side: side,
      texts: side === "A" ? [ATTENTION_TEXT, img.original] : [img.original, ATTENTION_TEXT],
    };
    items.splice(attPositions[k] + k, 0, att);
  });
  const totalItems = items.length;

  // ---- Screens ----
  const consent = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="page">
        <h2>About this study</h2>
        <p>This study is part of a class project at Cornell University,
        about how people read short
        descriptions of photos. It takes about ${CONFIG.ESTIMATED_MINUTES} minutes.</p>
        <p>Taking part is voluntary, and you can stop at any time by closing this window.
        We record your answers and your Prolific ID only, and no other identifying information.
        Results will be used for the class project and reported only as group summaries.</p>
        <p>Questions? Contact <a href="mailto:${CONFIG.CONTACT_EMAIL}">${CONFIG.CONTACT_EMAIL}</a>.</p>
        <p>Do you agree to take part?</p>
      </div>`,
    choices: ["I agree", "I do not agree"],
    data: { task: "consent" },
    on_finish: (d) => {
      d.consented = d.response === 0;
      if (!d.consented) {
        jsPsych.abortExperiment(
          '<div class="page"><h2>Thank you</h2><p>You chose not to take part. ' +
            "Please return this study on Prolific so it is offered to someone else.</p></div>"
        );
      }
    },
  };

  const instructions = {
    type: jsPsychHtmlButtonResponse,
    choices: ["Start"],
    data: { task: "instructions" },
    stimulus: `<div class="page"><h2>Instructions</h2>
        <p>In this study, you'll see a series of photos, each with two short descriptions.
        Both descriptions accurately describe the photo. One is the <strong>original</strong>,
        written by a person. The other was created by <strong>translating the original into another
        language and back into English</strong>.</p>
        <p>Text that has been translated sometimes reads a little differently from text written
        directly in English. This is called <em>translationese</em>.</p>
        <p>For each photo, choose the description you think is the original.
        Then rate how confident you are, from 1 (just guessing) to 5 (very sure).
        If you change your mind, you can go back and pick the other description before rating.</p>
        <p>There are ${LIST.trials.length} photos. Please read each description carefully. To give
        you time to read, the descriptions become clickable after about
        ${Math.round(CONFIG.MIN_VIEW_MS / 1000)} seconds. A few questions check attention, and submissions
        that fail them may not be approved.</p></div>`,
  };

  const preload = {
    type: jsPsychPreload,
    images: [...new Set(items.map((it) => it.file))],
    message: "<p>Loading images…</p>",
    max_load_time: 60000,
    on_error: () => {},
  };

  function choiceTrial(it, idx) {
    return {
      type: jsPsychHtmlButtonResponse,
      stimulus: `<img class="trial-img" src="${it.file}" alt="">
                 <p class="question">Which description is the original?</p>
                 <p id="lock-hint" class="lock-hint">&nbsp;</p>`,
      on_load: () => {
        const ms = it.n_changes ? 0 : CONFIG.MIN_VIEW_MS;
        const hint = document.getElementById("lock-hint");
        if (ms > 0 && hint) {
          hint.textContent = "Take a moment to read. You can choose in a few seconds…";
          setTimeout(() => { hint.innerHTML = "&nbsp;"; }, ms);
        }
      },
      choices: it.texts,
      button_html: (choice, i) =>
        `<button class="jspsych-btn desc-card"><span class="label">Description ${SIDES[i]}</span>${esc(choice)}</button>`,
      button_layout: "grid",
      grid_rows: 1,
      grid_columns: 2,
      // reading lock only on the first view, not when coming back to change an answer
      enable_button_after: () => (it.n_changes ? 0 : CONFIG.MIN_VIEW_MS),
      data: { task: "choice", item_index: idx },
      on_start: () => {
        if (it.blur_start === undefined) it.blur_start = blurCount;
        it.wants_change = false;
      },
      on_finish: (d) => {
        it.chosen_side = SIDES[d.response];
        if (it.first_choice_side === undefined) it.first_choice_side = it.chosen_side;
        it.rt_choice = (it.rt_choice || 0) + d.rt; // total time spent choosing, across any changes
      },
    };
  }

  const CHANGE_LABEL = "← Change my answer";

  function confidenceTrial(it, idx) {
    const labels = { 1: "Just guessing", 2: "", 3: "", 4: "", 5: "Very sure" };
    return {
      type: jsPsychHtmlButtonResponse,
      stimulus: () => {
        const cards = it.texts
          .map((t, i) => {
            const cls = SIDES[i] === it.chosen_side ? "chosen" : "not-chosen";
            return `<div class="desc-card ${cls}"><span class="label">Description ${SIDES[i]}</span>${esc(t)}</div>`;
          })
          .join("");
        return `<img class="trial-img" src="${it.file}" alt="">
                <div class="cards">${cards}</div>
                <p class="question" style="margin-top:20px">How confident are you that Description
                ${it.chosen_side} is the original?</p>`;
      },
      choices: ["1", "2", "3", "4", "5", CHANGE_LABEL],
      button_html: (c) =>
        c === CHANGE_LABEL
          ? `<button class="jspsych-btn change-btn">${c}</button>`
          : `<button class="jspsych-btn conf-btn">${c}<small>${labels[c] || "&nbsp;"}</small></button>`,
      button_layout: "grid",
      grid_rows: null,
      grid_columns: 5,
      data: { task: "response", item_index: idx },
      on_finish: (d) => {
        if (d.response === 5) {
          // participant wants to go back and pick the other description
          d.task = "change_answer";
          it.n_changes = (it.n_changes || 0) + 1;
          it.wants_change = true;
          return;
        }
        const confidence = d.response + 1;
        Object.assign(d, {
          trial_kind: it.kind,
          image_id: it.image_id,
          category: it.category,
          variant: it.variant,
          original_side: it.original_side,
          chosen_side: it.chosen_side,
          correct: it.kind === "main" ? it.chosen_side === it.original_side : null,
          confidence: confidence,
          rt_choice: it.rt_choice,
          rt_confidence: d.rt,
          n_changes: it.n_changes || 0,
          first_choice_side: it.first_choice_side,
          left_page_count: blurCount - it.blur_start,
          attention_pass: it.kind === "attention" ? it.chosen_side === it.target_side : null,
          attention_conf_pass: it.kind === "attention" ? confidence === 2 : null,
          text_A: it.texts[0],
          text_B: it.texts[1],
        });
        jsPsych.progressBar.progress = (idx + 1) / totalItems;
      },
    };
  }

  const breakAfter = Math.floor(totalItems / 2) - 1; // halfway through
  const breakScreen = {
    type: jsPsychHtmlButtonResponse,
    stimulus:
      '<div class="page"><h2>Halfway there</h2><p>You\'re halfway done. ' +
      "Take a short break if you'd like, then click Continue when you're ready.</p></div>",
    choices: ["Continue"],
    data: { task: "break" },
  };

  const trialNodes = items.flatMap((it, idx) => {
    const nodes = [
      {
        timeline: [choiceTrial(it, idx), confidenceTrial(it, idx)],
        loop_function: () => it.wants_change, // repeat if they clicked "Change my answer"
      },
    ];
    if (idx === breakAfter) nodes.push(breakScreen);
    return nodes;
  });

  const strategy = {
    type: jsPsychSurveyText,
    preamble: '<div class="page"><h2>Almost done</h2></div>',
    questions: [
      {
        prompt: "Optional: what clues, if any, did you use to tell which description was the original?",
        name: "strategy",
        rows: 4,
        columns: 70,
        required: false,
      },
    ],
    data: { task: "strategy" },
  };

  const effortOptions = ["Very carefully", "Mostly carefully", "Not very carefully", "I mostly guessed"];
  const effort = {
    type: jsPsychHtmlButtonResponse,
    stimulus:
      '<div class="page"><p class="question">Honestly, how carefully did you read the descriptions?</p>' +
      "<p>Your answer will <strong>not</strong> affect your payment. It just helps us understand our data.</p></div>",
    choices: effortOptions,
    data: { task: "effort" },
    on_finish: (d) => {
      d.effort = effortOptions[d.response];
      d.left_page_total = blurCount;
    },
  };

  // ---- Saving ----
  const fileTag = SESSION_ID || jsPsych.randomization.randomID(8);
  const filename = `${participantId}_${fileTag}.csv`;
  let saveOk = false;
  let saveAttempts = 0;

  const saveNodes = pipeOn
    ? [
        {
          timeline: [
            {
              type: jsPsychPipe,
              action: "save",
              experiment_id: CONFIG.DATAPIPE_EXPERIMENT_ID,
              filename: filename,
              data_string: () => jsPsych.data.get().csv(),
              data: { task: "save" },
              on_finish: (d) => {
                saveAttempts++;
                saveOk = d.success === true;
              },
            },
            {
              timeline: [
                {
                  type: jsPsychHtmlButtonResponse,
                  stimulus:
                    '<div class="page"><h2>Saving failed</h2><p>We could not save your answers. ' +
                    "Please check your internet connection and try again.</p></div>",
                  choices: ["Try again"],
                  data: { task: "save_failed" },
                },
              ],
              conditional_function: () => !saveOk && saveAttempts < 3,
            },
          ],
          loop_function: () => !saveOk && saveAttempts < 3,
        },
      ]
    : [];

  const finish = {
    type: jsPsychHtmlButtonResponse,
    stimulus: () => {
      if (isTest) {
        const rows = jsPsych.data.get().filter({ task: "response", trial_kind: "main" });
        const acc = rows.count() ? (rows.filter({ correct: true }).count() / rows.count()) * 100 : 0;
        const att = jsPsych.data.get().filter({ task: "response", trial_kind: "attention" });
        return `<div class="page"><h2>Test run finished</h2>
          <p>List ${listId} (assigned by ${listSource}). Accuracy on main trials: ${acc.toFixed(0)}%.
          Attention checks passed: ${att.filter({ attention_pass: true }).count()}/${att.count()}.</p>
          <p>${pipeOn ? `Data ${saveOk ? "was saved" : "FAILED to save"} to DataPipe as <code>${filename}</code>.`
                      : "DataPipe is not configured, so your data CSV is downloaded when you click below."}</p>
          <p>Prolific participants would now be redirected to Prolific.</p></div>`;
      }
      return `<div class="page"><h2>Thank you!</h2>
        <p>${saveOk || !pipeOn ? "Your answers were saved." : "There was a problem saving your answers. Please message the researchers on Prolific."}</p>
        <p>Click below to return to Prolific. If that doesn't work, use this completion code:
        <strong>${esc(CONFIG.PROLIFIC_COMPLETION_CODE)}</strong></p></div>`;
    },
    choices: () => [isTest ? (pipeOn ? "Done" : "Download CSV") : "Return to Prolific"],
    data: { task: "finish" },
    on_finish: () => {
      if (isTest) {
        if (!pipeOn) jsPsych.data.get().localSave("csv", filename);
      } else {
        window.location.href = completionUrl;
      }
    },
  };

  await jsPsych.run([consent, instructions, preload, ...trialNodes, strategy, effort, ...saveNodes, finish]);
})();
