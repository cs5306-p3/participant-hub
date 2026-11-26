# Photo Description Study (Prolific)

Participants see a photo and two descriptions: the human-written original and a back-translation (EN→ES→EN, EN→JA→EN, or EN→ES→JA→EN). They pick the one they think is original, then rate their confidence from 1 to 5.

Built with jsPsych 8.3 and hosted on GitHub Pages. Data goes to a private Google Drive folder through DataPipe. (OSF stopped allowing new projects on Nov 16, 2026, so DataPipe's Google Drive option is used instead.)

## Files

| File | What it is |
|---|---|
| `index.html` | Page that loads everything |
| `config.js` | **Edit before launch:** DataPipe ID, Prolific completion code, contact email |
| `experiment.js` | The study: consent, instructions, trials, attention checks, saving, redirect |
| `stimuli.js` | Generated from `translations.csv`. Don't edit by hand |
| `tools/build_stimuli.py` | Rebuilds `stimuli.js` and `tools/lists.csv` |
| `tools/lists.csv` | Which images and variants are in each of the 6 lists (for your records) |
| `images/` | The 60 photos |

## Design

- 60 images (5 categories × 12) are split into two halves of 30, with 6 per category in each half.
- In each half, the translation variant is rotated across images. That gives 3 lists per half, **6 lists** total.
- Each list has 30 trials: 10 per variant, 2 per variant per category. No participant sees an image twice.
- Across all 6 lists, every one of the 180 image–variant pairs appears exactly once. **36 participants, 6 per list, gives exactly 6 judgments per pair.**
- The original appears on the left in exactly 15 of a participant's 30 trials. Trial order is random.
- There are 3 attention checks, after trials 8, 17 and 26. Each tells the participant to pick a specific description and choose confidence 2. The images come from the other half, so they never repeat a trial image.
- Descriptions can't be clicked until 5 s after a trial appears (`MIN_VIEW_MS`); a hint says so on screen.
- Phones and screens narrower than 700 px are blocked.

If you change `translations.csv`, re-run:

```bash
python3 tools/build_stimuli.py ../study_samples/translations.csv
```

## Test it on your computer

```bash
cd study_app
python3 -m http.server 8000
# open http://localhost:8000/?list=1   (any list 1–6; leave it out for random)
```

Without a `PROLIFIC_PID` in the URL, it runs in **test mode**. At the end it shows your accuracy and the attention-check results. If DataPipe isn't set up yet, it also downloads the data CSV.

## Launch checklist

1. **GitHub:** create a free organization on github.com with a neutral name, and push this folder to a public repo. Then go to Settings → Pages → Deploy from branch → `main` / root. The URL will be `https://<org>.github.io/<repo>/`.
2. **Google Drive:** create a folder for the data (e.g. "CS5306 P3 Data") and share it with your teammates.
3. **DataPipe** (pipe.jspsych.org): log in, create an experiment with **Google Drive** as the storage, and connect it to that folder.
   - Turn on **data collection**.
   - Turn on **condition assignment** with **6** conditions.
   - Put the experiment ID in `config.js` → `DATAPIPE_EXPERIMENT_ID`.
4. **Prolific:**
   - Study URL: your GitHub Pages URL. Choose "I'll use URL parameters", which adds `PROLIFIC_PID`, `STUDY_ID` and `SESSION_ID`.
   - Completion: choose "redirect", and copy the code into `config.js` → `PROLIFIC_COMPLETION_CODE`.
   - Device: **desktop only**.
   - Prescreeners: fluent English (or first language English, per your protocol).
   - Places: 36, or a few more to cover rejections.
5. **Consent:** the consent screen in `experiment.js` uses wording for a class project. Confirm with your instructor that no IRB review is needed, and set `CONTACT_EMAIL`.
6. **Pilot:** use Prolific's preview, and check that a file appears in the Google Drive folder with your test ID. Then run about 3 real participants and check the timing. The estimate is 18 minutes (`ESTIMATED_MINUTES` in `config.js`). Set the Prolific time and pay to match what the pilot shows.

### Assigning lists: two options

- **DataPipe (default):** one Prolific study. DataPipe hands out lists 1→6 in rotation. People who start and then return still use up a slot, so counts may end up a little uneven.
- **Exact:** create 6 Prolific studies with 6 places each. Add `&list=1` … `&list=6` to each study URL. Use Prolific's "exclude participants from previous studies" so nobody takes two.

## Data

There is one CSV per participant: `<PROLIFIC_PID>_<SESSION_ID>.csv`. **Analyze rows where `task == "response"`**. Each one is a complete trial:

| Column | Meaning |
|---|---|
| `participant_id`, `prolific_pid`, `study_id`, `session_id` | IDs |
| `list_id`, `list_source` | Which list (1–6) and how it was assigned (`url` / `datapipe` / `random`) |
| `trial_kind` | `main` or `attention` |
| `item_index` | Position in the sequence (0–32) |
| `image_id`, `category`, `variant` | Stimulus (`variant` = `ver1_es` / `ver2_ja` / `ver3_es_ja`) |
| `original_side`, `chosen_side` | `A` (left) or `B` (right) |
| `correct` | Picked the original (main trials only) |
| `confidence` | 1–5 |
| `rt_choice`, `rt_confidence` | Response times in ms (choice time includes the 3 s lock) |
| `attention_pass`, `attention_conf_pass` | Picked the instructed description / chose confidence 2 |
| `n_changes`, `first_choice_side` | How many times they used "Change my answer" on this trial, and which side they picked first (`chosen_side` is the final answer; `rt_choice` is total choosing time across changes) |
| `left_page_count` | How many times the participant switched away from the tab/window during this trial |
| `text_A`, `text_B` | The exact text shown |

Other rows:
- `task == "strategy"`: the optional free-text answer about what clues the participant used.
- `task == "effort"`: the self-reported effort (`effort`: Very carefully / Mostly carefully / Not very carefully / I mostly guessed), and `left_page_total` for the whole session.

Copying, right-clicking and dragging are blocked on the trial screens, to discourage pasting descriptions into a chatbot. A suggested exclusion rule (decide **before** looking at results): fail 2 or more of the 3 attention checks, OR answer "I mostly guessed", OR leave the page during most trials.
