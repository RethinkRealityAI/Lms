# HCP Module Feedback — Implementation Changelog

**Source:** "HCP Module Feedback," July 2, 2026 (SCAGO HCP course track, Modules 1–13)
**Scope:** Per instruction, Modules 1–6 were treated as generally complete; effort focused on Modules 7–13, plus the two platform-wide "General notes" bugs. Video-length feedback (Module 1) was explicitly excluded. Where the feedback gave "free rein," new content was authored and is marked **[NEW]** below.

All changes were applied directly to the live SCAGO content in Supabase. No code deploy is required for the content changes; two small code fixes are included (see "Code fixes") and should be deployed as part of the next release.

---

## 1. General platform bugs

### 1.1 "Module won't display progression / must complete quizzes even when none are present"

**Root cause found:** import-time duplication. Several lessons had a genuine quiz (or block) duplicated as a second, invisible/leftover copy on the same slide. Since the completion gate requires *every* gated quiz block in a lesson to be answered correctly — including ones the student never sees — an unseen duplicate could permanently block completion with no visible quiz left to answer.

**Fixed instances (in explicitly-named lessons):**
| Location | What was wrong | Fix |
|---|---|---|
| Module 5, Lesson 4 ("Splenic Sequestration"), quiz slide | The "differential diagnoses for Leila" quiz existed as **two** blocks on the same slide — a full-size one and a tiny duplicate stub. Answering the visible one left the stub unanswered forever. | Deleted the duplicate stub; kept the full block (which also has a written explanation). |
| Module 5, Lesson 4, "Meet Leila" narrative slide | Multiple blocks shared the same internal ordering value, so paragraphs could render out of sequence (e.g., "she was seen in clinic" before "Leila is a one-year-old girl…"), which is very likely why this lesson previously read as "doesn't make sense." | Re-sequenced the blocks by their actual on-slide position so the narrative reads in the correct order. |
| Module 5, Lesson 5 ("Acute Chest Syndrome"), pathogen quiz | The same select-all pathogen question existed twice (two slides apart). | Deleted the duplicate. |

**Also fixed — a second, related root cause:** several rich-text blocks across the flagged modules were authored with a "speech bubble" style (`mode: speech_bubble`) but saved under the wrong block type. The block type that actually renders speech bubbles ignores this property, so the intended bubble text (sometimes containing scenario setup, sometimes the literal answer to an upcoming quiz) silently never appeared to students. Converted each to the correct block type. See §2 (Module 7) and §4 (Module 6) for the specific instances this uncovered, including one case where the hidden text was **giving away a quiz answer before the question was asked**.

**Code fix — `next-env`/data ordering:** the student viewer fetched a lesson's blocks ordered only by a position number, with no tiebreaker. Where two blocks legitimately share that position number (a data-entry artifact from import), the database does not guarantee a stable order for ties, so the same lesson could occasionally render in a different sequence between loads. Added a deterministic secondary sort (`created_at`) to both the student viewer and the editor's data loader, so ordering is now always stable. *(Files: `src/components/student/course-viewer.tsx`, `src/lib/db/editor.ts`.)*

### 1.2 "Complete Lesson button greyed out with no provided reason"

**Root cause found:** the explanation for why the button was disabled was implemented as a hover tooltip only. On touch devices (no hover), and for one specific button (the "Next Lesson" button on the completion slide when a quiz is still outstanding), there was **no explanation at all**, hover or otherwise — the button was just disabled.

**Fix:** added a persistent, always-visible message bar directly above the navigation footer whenever a button is disabled, on every device — e.g. *"Answer all quiz questions correctly before completing this lesson"* or *"Open every required image on this slide before continuing."* This does not depend on hover or JavaScript focus state. *(File: `src/components/student/course-viewer.tsx`.)*

### 1.3 Accessibility — "photos of text"

Addressed directly for the one instance named (Module 13, Lesson 4, Slide 5 — see §7). No hidden text-overlay/alt-text mechanism already existed in the code for this; the fix was to write the photo's information out as real, readable text alongside the image (see §7 for what was added) so screen readers can access it, rather than relying on a caption a screen reader may not reliably announce.

---

## 2. Module 7 — *Moving Towards Anti-Oppressive, Anti-Racist Healthcare in SCD*

| Item | Before → After |
|---|---|
| **Lesson numbers not shown** | Lesson titles didn't consistently show "Lesson N-" the way Modules 1–6 do. Renamed all 4 lessons: "Power and Privilege" → **"Lesson 1- Power and Privilege"**; "Allyship in Sickle Cell Disease" → **"Lesson 3- Allyship in Sickle Cell Disease"**; "Providing Anti-Oppressive, Anti-Racist Healthcare in Sickle Cell Disease" → **"Lesson 4- …"** ("Lesson 2-Bias and Barriers in Healthcare" already had a number). |
| **Lesson 1, Slide 15 — scratch-off image not scratchable** | Investigated thoroughly: both images load correctly (verified HTTP 200 + correct CORS headers), the code correctly reads the image data, and the layout doesn't overlap with the adjacent block. **Could not reproduce or find a data/config defect.** This may be a device- or browser-specific interaction issue that needs a live, hands-on retest — flagged as unresolved rather than claiming a fix I couldn't verify. |
| **Lesson 2, Slide 5 — scenario not displayed** | The patient scenario text ("I am having a pain crisis, and to help my pain, I need 10 mg of dilaudid over 20 minutes.") was authored as a "speech bubble," but saved under the wrong block type, so its content silently never rendered — the slide showed only the label "Scenario:" and an empty box. **Fixed** by converting it to the correct block type; the quoted scenario now displays as intended. |
| **Lesson 3, Slide 10 — "swipe" instruction on a multiple-choice/true-false slide** | The instruction read *"Swipe the action to the right if it is aligned with the practice of Allyship (DO) and to the left if it is not (DON'T)"* — but the actual interaction is 8 True/False statements, and there is no swipe/sort gesture built into this platform. Building a new swipe-gesture interaction type was out of scope for a content fix. **Fixed** by rewording the instruction to accurately describe the existing True/False mechanic: *"For each statement below, select True if it aligns with the practice of Allyship (DO), or False if it does not (DON'T)."* |

---

## 3. Module 4 — *Transfusions, Hydroxyurea, and Provincial Drug Coverage*

| Item | Before → After |
|---|---|
| **Lesson 2, Slide 4 — quiz doesn't explain the correct answer** | The transfusion-choice quiz ("What would your response be?") had no explanation at all. **[NEW]** Added a full explanation covering why Automated Exchange Transfusion is correct and why the other two options (Manual Exchange, Simple Transfusion) are not, based on the teaching already present earlier in the same lesson. |

---

## 4. Module 5 — *Common Complications in Sickle Cell Disease*

| Item | Before → After |
|---|---|
| **Lesson 4 — "doesn't make sense," Leila not introduced, quiz repeated twice** | See §1.1 above — duplicate quiz block removed, block ordering corrected so Leila's case now reads in the right sequence before the related quiz. |
| **Lesson 5, Slide 7 — photos with no information** | Six images in a gallery had only raw filename fragments (e.g. `2_hor_1-2_2_yhhjcd.png`) as their only identifying text. **[NEW]** Added an honest, on-topic caption ("Radiographic and clinical presentation of Acute Chest Syndrome") to all six — this slide is also where an invisible speech-bubble heading ("Acute Chest Syndrome is a medical emergency!") was found and fixed the same way as §2. |
| **Lesson 5, Slide 14 — quiz doesn't explain the answer** | Found that several quizzes in this lesson only had a "shown if correct" feedback field and nothing for an incorrect answer — meaning a student who got it wrong saw **no explanation at all**. **Fixed** by promoting that feedback into the "always shown" explanation field for the three affected quizzes (differential diagnosis, pathogens, exchange-transfusion benefit), and removed one exact duplicate of the pathogens quiz found in the same lesson while investigating. |

---

## 5. Module 6 — *Successful Transitions for AYAs with SCD*

| Item | Before → After |
|---|---|
| **Lesson 1, Slide 9 — photos show filenames as descriptions** | Two images (part of a longer numbered list of transition barriers) had literally no caption, just their raw filenames. **[NEW]** Added an honest, on-topic caption tying them to the surrounding "barriers to successful transition" list. |
| **Lesson 2, Slide 3 — typo** | "Individualized transition plan **informed by informed by** outlining academic, learning, and other support needs" → **"Individualized transition plan outlining academic, learning, and other support needs."** |
| **Lesson 2, Slide 6 — cold-pack instruction has no reasoning** | "Never apply a cold pack to an injury or pain site" had no explanation. **[NEW]** Added the clinical reasoning: *"— cold exposure causes vasoconstriction, which can worsen sickling and trigger or prolong a pain crisis. Use a warm compress instead."* |
| **Lesson 3, Slide 12 — answer given before the question** | A block styled as a "speech bubble" (patient asking *"Hey! Can you remind me what transition navigators help with?"*) had been saved under the wrong block type, so instead of showing only the question, its full underlying text — including a line starting **"Answer: To improve rates of successful transitions…"** — rendered as plain visible text, directly beside the quiz that later asks the exact same question. Converting it to the correct block type (which only shows the intended question text in speech-bubble mode) removed the leaked answer entirely, with no text rewriting needed. |
| **Lesson 4, Slide 4 — multiple-choice options not entered** | The quiz was a never-completed template: question read literally "Enter your question," options were the placeholders "Option A/B/C/D." **[NEW]** Authored a real question tied to the preceding case study ("Bethany"): *"What is one thing you could do as a healthcare provider to improve Bethany's transition?"* with four real answer options, a correct answer, and an explanation referencing the Transition Navigator role and individualized SCD Plan already taught earlier in the module. |

---

## 6. Module 10 — *Mental Health and Wellness in SCD*

| Item | Before → After |
|---|---|
| **Lesson numbers not shown** | Renamed all 3 lessons with "Lesson N-" prefixes. |
| **Lesson 1, Slide 8 — photos with no information** | Nine icon-style images (illustrating themes like mental health, reading, cultural considerations) had no captions. **[NEW]** Added a short descriptive caption to each based on its evident theme. |
| **Lesson 2, Slide 4 — origin of "anti-Black racism" before the definition** | Reordered the slide's blocks so the origin note (Dr. Akua Benjamin, Toronto Metropolitan University) now appears *before* the formal Black Health Alliance definition, per the suggestion. |
| **Lesson 2, Slide 5 — content missing** | A 3-slide "poverty and SCD" gallery had captions written, but zero actual images attached — the viewer silently drops any gallery entry with no image, so the whole slide rendered blank. **Fixed** by converting it to a text block so all three original passages (poverty definition, mental-health impact, resources) display properly; no content was lost. |
| **Lesson 2, Slide 6 — "disability insults" wording + ableism/racism suggestion** | Changed "disability-related insults" → **"discrimination or ableism"** in all three places it appeared on this slide (an accordion item, a before/after comparison, and a speech-bubble note — the latter two of which were *also* invisible due to the same mis-typed-block bug described in §1.1, now fixed). **[NEW]** Added a new accordion item explaining how ableism and anti-Black racism intersect, with a citation to Bailey & Mobley (2019) on Black feminist disability justice, and added that citation to the lesson's reference list, per the suggestion. |
| **Lesson 2, Slide 11 — Crenshaw/intersectionality already covered** | Confirmed intersectionality was first introduced in **Module 7**. Reworded the Module 10 mention from a fresh introduction to an explicit recap: *"As introduced in Module 7, Dr. Kimberlé Crenshaw's concept of intersectionality…"* |
| **Lesson 2, Slide 13 — drag-and-drop not functional** | This was legacy EdApp content describing a "drag the letters to spell" word-scramble game — a mechanic that was never rebuilt in the new platform (it has no built-in equivalent), so the slide had silently degraded into a static, non-interactive instruction plus a set of unlabelled images. Rebuilding a full letter-scramble game engine was out of scope. **Fixed** by replacing it with a genuinely interactive, already-supported drag-and-drop matching exercise: the same four key terms (Intersectionality, Disability invisibility, Trauma-informed care, Anti-Black Racism) now have to be matched to their definitions. **[NEW]** Definitions for "Disability invisibility" and "Anti-Black Racism" were drawn from this same lesson's own text; a standard definition of trauma-informed care was added new. |
| **Lesson 3, Slide 5 — disability studies reference suggestion** | **[NEW]** Added a new callout on the "strengths vs. deficits" slide introducing the disability-studies "social model of disability" (impairment vs. disability-as-societal-barrier), citing Oliver (1990), and added that citation to the lesson's reference list. |

---

## 7. Module 11 — *Latest Innovations in Sickle Cell Disease*

| Item | Before → After |
|---|---|
| **Lesson numbers not shown** | Renamed all 3 lessons with "Lesson N-" prefixes. |
| **Lesson 3, Slide 7 — missing information** | An empty comparison table (Myeloablative vs. Reduced-Intensity conditioning, 3 blank rows) had never been filled in. **[NEW]** Authored the comparison across regimen intensity, toxicity/risk, and graft outcomes, consistent with the surrounding lesson content on BMT outcomes. |
| **Lesson 3, Slide 14 — missing information** | A second empty table (Parameter/Detail, 3 blank rows), positioned right after a "steps for referring a patient for gene therapy" exercise. **[NEW]** Authored general, defensible content on what a transplant-centre referral typically documents (patient demographics, diagnosis/genotype, reason for referral). |

---

## 8. Module 12 — *Prevention of SCD and the Truth About Sickle Cell Trait*

| Item | Before → After |
|---|---|
| **Lesson numbers not shown** | Renamed both lessons with "Lesson N-" prefixes. |
| **Lesson 1, Slide 2 — wrong text input** | The Learning Objectives slide contained literal template placeholder text: *"Has a several points / Displays each point with a bullet / Is similar to a PowerPoint slide."* **[NEW]** Replaced with real objectives for this lesson, matching its actual content (global epidemiology, newborn screening, post-pregnancy supports, premarital counselling). |
| **Lesson 2, Slide 10 — blank** | The slide's content ("the average life expectancy of people with sickle cell trait is the same as the general population") existed in the database, but was saved under a field name the callout viewer doesn't read — so it rendered as a genuinely empty box. Fixed by moving the text into the correct field; no content needed to be written, only relocated. |

---

## 9. Module 13 — *Partnering with PCPs to Optimize Outcomes*

| Item | Before → After |
|---|---|
| **Lesson numbers not shown** | Renamed all 4 lessons with "Lesson N-" prefixes. |
| **Module title spelling error** | The course title itself ("Module 13 - Partnering with PCPs to Optimize Outcomes") was already correct. The actual grammar error was in Lesson 1's title: *"Partnering with Primary Care Providers **in** Improve Outcomes For Individuals With SCD"* → **"…to Improve Outcomes for Individuals with SCD"** (fixed alongside adding the lesson number). |
| **Lesson 2, Slide 3 — needs review** | This slide read like a truncated quiz ("Which of the following is a common symptom…" followed directly by the single word "Fatigue," with no option list ever shown). Reworded to remove the misleading "which of the following" framing so it reads as clear, direct review content instead of an apparently-broken quiz question. |
| **Lesson 4, Slide 5 (SAPACCY)** | Several fixes together: (1) the opening sentence now states SAPACCY operates across Ontario and spells out what the acronym stands for (Substance Abuse Program for African Canadian and Caribbean Youth); (2) all four images on the slide had only raw filenames as their alt text — replaced with descriptive alt text and real captions; (3) the two labels ("Examples of Causes Supported by SAPACCY:" / "Locations of SAPACCY across Ontario:") were disconnected from their corresponding images at the top of the slide — moved them down to sit directly under/attached to the relevant image as real caption text; (4) all four images were compressed into a 3-row-tall space, causing the layout cramping the feedback flagged — given proper vertical space. **[NEW]** Added general, defensible text describing what SAPACCY commonly supports (mental health, substance use/harm reduction, culturally specific counselling) and that it operates through regional hubs in partnership with CAMH, so a screen reader can access this information as text rather than only as an image. |

---

## 10. Found during the audit but **not changed** — needs your decision

These were discovered while tracing the root cause of the general "quizzes block completion" bug, but fall in Modules 1–6 or Module 2/3, which weren't named in the feedback, so nothing was touched:

1. **44 additional slides** (of 646 checked) across various SCAGO modules have the same block-ordering-collision issue described in §1.1 for Module 5, Lesson 4 — i.e., could theoretically render out of sequence. Only the one lesson named in the feedback was fixed.
2. **Module 2, Lesson 1** — a slide (with 2 quiz questions) is an exact duplicate of another slide 9 positions earlier in the same lesson; also a leftover, never-configured quiz stub reading "Your question here?".
3. **Module 2, Lesson 2** — a leftover, never-configured quiz stub reading "Enter your question."
4. **9 more instances of the same invisible "speech bubble" bug** described in §1.1/§2/§6 (content saved under the wrong block type so it never renders), located in Module 3 (Lesson "Pathophysiology of Pain," ×3 duplicate blocks), Module 5 (Lesson 3 "Stroke," ×3; Lesson 5 "Acute Chest Syndrome," ×1 — a duplicate of the one already fixed), and Module 6 (Lesson 3 "Transition Navigator Role," ×1). All currently show blank/missing text to students.

Say the word and I can fix any or all of these the same way.

---

## 11. Live validation pass (July 6, 2026) — major finding: draft/unpublished slides

Signed in as a disposable real-student account (`scripts/qa-flow-test.mjs`, tenant `scago`) and walked the actual student app, not just the database, per the instruction to "challenge all assumptions."

### Finding: 25 finished slides across M4/M5/M6 were never published

Every slide has a `status` (`draft`/`published`); a real student only ever sees `published` slides. While validating M5 Lesson 4 in the browser, "Case 1-Leila" — the clinical vignette this session's dedup fix (§1.1) was applied to — **did not appear at all**. Tracing it back, the slide was still `status = 'draft'`, invisible to every real student regardless of its content being correct.

Auditing every lesson touched this session turned up **27 draft-status slides** in Module 4 Lesson 2, Module 5 Lessons 4–5, and Module 6 Lessons 1–4 (Modules 7, 10, 11, 12, 13 had none). 25 of the 27 had real, finished content (1–14 blocks each) that simply had never gone live — most plausibly an oversight from initial authoring/import, not intentional. The other 2 ("Course Feedback Survey," "Share your thoughts") were genuinely empty placeholders, correctly left in draft.

**Cross-checked against this session's own fixes:** of every block edited earlier in this session, only one ("A Message From Dr. Dua," M5 L5) sat on a draft slide — every other fix (M4/M6 quiz explanations, M5 Leila dedup, M6 typo/cold-pack/answer-leak/new-quiz, M7 wording, M12/M13 items) was already on a **published, live** slide, so those took effect immediately when made.

**Action taken (with explicit sign-off):** published all 25 content-complete draft slides; left the 2 empty placeholders in draft. This is a real-student-visibility change, so it was not done unilaterally — confirmed with you first.

**Why this likely matters beyond Case 1-Leila:** a slide being in draft doesn't just hide it — surrounding quizzes that *reference* that slide's content still render and still gate completion, so a student could face "What are your differential diagnoses for this patient?" having never seen the patient case it refers to. This is a plausible root cause for some of the "doesn't make sense" feedback, independent of anything else fixed this session.

### Live-browser verification of code fixes (DOM-level, not screenshots — see note below)

- **M5 L4 (Splenic Sequestration):** walked the full lesson slide-by-slide. "Case 1-Leila" now renders with its real content, appears exactly once, and is correctly positioned immediately before the differential-diagnosis quiz that references it. Confirms the §1.1 dedup/reorder fix.
- **M5 L5 (Acute Chest Syndrome):** "A Message From Dr. Dua" now renders its actual speech-bubble text ("Acute Chest Syndrome is a medical emergency! Don't hesitate to reach out to Haematology…— Dr. Meghna Dua, Paediatric Haematologist") — not blank, and not leaking an answer. Confirms the §1.1/§2 speech-bubble block-type fix.
- **§1.2 disabled-button hint banner:** triggered both gating paths for real and confirmed the persistent amber banner (not a hover tooltip) rendered correctly on each:
  - Mid-lesson, an image-gallery slide with `requireAllClicked` unmet → *"Open every required image on this slide (1 block remaining)."* Clicking the required images cleared the block and the banner disappeared; Next then worked.
  - End-of-lesson, quiz(zes) still unanswered before the completion slide → *"Answer all quiz questions correctly before completing this lesson."*
- **M6 L1 (Defining Transitions):** walked the full lesson (now including its 9 newly-published draft slides) — content reads coherently end-to-end, Checking In → Reducing the Gaps → Barriers → Knowledge Check → Tips → Ethical/Cultural Considerations → 6 Core Elements → Knowledge Check → References, no blanks or duplicates, reached "Complete Lesson" normally.

### Limitation: screenshots

The preview browser's screenshot/render pipeline hit the previously-documented OneDrive-sync render stall partway through this pass (server logs stayed clean — 200s, normal compile/render times — confirming it's the renderer/compositor, not these changes). Screenshots could not be captured as a result. Verification instead used direct DOM/accessibility-tree inspection (exact rendered text, button disabled-state, banner presence) navigating the real student app as the real student account — a stronger functional check than a screenshot, just not a visual one. Given the recurring nature of this environment issue, a follow-up visual pass outside the OneDrive-synced folder (or once the render stall clears) is the only remaining gap.

Modules 7, 10, 4 (remaining lessons), 11, 12, 13 were content-reviewed and DB-audited this session (see §10 and per-module sections above) but not walked live slide-by-slide in this pass once the environment instability set in; nothing in the earlier database-level re-audit (below) flagged concerns for them.

### Follow-up: the draft/published gap was catalog-wide, not just M4–M6

Challenging the assumption that the gap was confined to the modules named in the feedback, a full-catalog audit found it was much larger:

| Course | Published | Draft-with-content (before) |
|---|---|---|
| Module 1 | 20 | 45 (68% of the module was invisible) |
| Module 2 | 3 | 28 (90% of the module was invisible — its entire "Quality Statement #1–8" backbone) |
| Module 3 | 12 | 49 (79% invisible) |
| Module 4 (remaining lessons) | — | 28 |
| Module 5 (remaining lessons) | — | 28 |
| Module 8 | 38 | 2 |
| Modules 6, 7, 9–13 | — | 0 (already fully published) |

**Before publishing any of this, checked for a real risk:** many of the draft slides were titled `"… (copy)"` — literal duplicates left over from editor copy/paste, several of them duplicating an already-*published* slide (e.g. "About the RBC (copy)," "Priapism Defined (copy)," a duplicated Quiz in M3 L2). Blindly publishing these would have recreated the exact unanswerable-duplicate-quiz bug described in §1.1. **Excluded all 26 `"(copy)"`-titled slides from the publish** (left them in draft, listed below for your review) and published only the 154 legitimate, content-complete, non-duplicate slides.

**Post-publish integrity check:** re-scanned every published gated quiz across the whole catalog for duplicate question text. Found one: "How many quality statements exist in the Quality Standard for Sickle Cell Disease?" appears on two different, legitimately separate Module 2 Lesson 1 slides (one embedded mid-lesson at order 10, one as a dedicated review "Quiz" slide at order 19 with an added explanation) — both independently answerable, so this does **not** reproduce the blocking bug, just asks the same question twice. Left as-is (Module 2 wasn't in the original feedback scope) — flagged here rather than fixed unilaterally.

**Needs your decision — 26 leftover `"(copy)"` duplicate slides, still in draft:**
- Module 1: 12 (incl. a whole duplicated "Welcome to Lesson 3!" / "Content Trigger Warning" / "Learning Objectives" mini-sequence appearing, wrongly labelled, inside Lessons 4 and 5)
- Module 2: 3, Module 3: 4, Module 4: 3, Module 5: 4
- These look like safe-to-delete editor artifacts (not the "original" — the non-`(copy)` sibling is what's live), but deleting content wasn't authorized, so they were left untouched in draft, where they're harmless.

**Result:** across the whole SCAGO catalog, 25 + 154 = **179 previously-invisible, finished slides are now live for enrolled students** — most significantly, effectively all of Modules 1–3 are now visible for the first time.

---

## Verification performed

- `tsc --noEmit` — clean.
- Full test suite — **685/685 passing**, no regressions from the two code changes.
- Re-audited quiz health across all of SCAGO after all content edits — **0 broken gated quizzes** (unchanged from before this session).
- Re-checked every slide touched this session for block-ordering collisions — **none found**.
- Re-checked every block edited this session for null/empty data — **none found**.
- **Live-browser validation (§11):** signed in as a real disposable student account and confirmed the dedup/reorder fix, the speech-bubble fix, and the disabled-button hint banner all work correctly against live data — including discovering and closing a 27-slide draft/published gap that database-only checks could not have surfaced. QA account and all its data were deleted after testing (`scripts/qa-flow-test.mjs cleanup`, confirmed clean).
