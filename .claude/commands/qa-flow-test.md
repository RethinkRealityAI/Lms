---
description: End-to-end QA of the student completion → survey → certificate flow using a disposable student account in the preview browser
---

Run the full student completion-flow QA. This tests, as a REAL student (not admin preview mode), that: content completion works, the required completion survey gates the certificate with clear messaging, submitting the survey finalizes the module, and the animated certificate celebration fires with a real issued certificate. Writes to the LIVE Supabase project — cleanup is mandatory.

**Tenant/course:** default to the SCAGO **Test Course** `ba14c955-53de-4c61-974c-e35ff0e0e0a3` (lesson `fda91a6f-6dea-4ab7-a1d4-abbbe154825d`). NEVER use live courses. `$ARGUMENTS` may override the tenant slug (e.g. `gansid`, whose Test Course is `d264b895-c7d6-4342-a083-17c5182194fe`).

## Steps

1. **Setup**: Ensure the dev server is running (`preview_start`, port 3001). Warn the user that this flow will SIGN OUT whatever session is active in the preview browser, and that they'll need to sign back in afterward.
2. **Create the QA student**: `node scripts/qa-flow-test.mjs create --slug=scago` — note the printed email/password/user_id. If it says the user already exists, run `cleanup` first.
3. **Sign in as the QA student** in the preview browser: sign out any current session, go to `/scago/login`, fill the credentials. NOTE: the login inputs are React-controlled — set values via the native value setter + dispatch `input` events (plain `preview_fill` may not register).
4. **Walk the course** at `/scago/student/courses/<testCourseId>`: advance through all slides. Verify along the way:
   - Any gated quiz blocks must be answered correctly before "Complete Lesson" enables (quiz gate).
   - On the FINAL completion slide: hero reads "MODULE COMPLETE" + "To receive your certificate, please complete the module survey and click Submit"; the amber "Your certificate is one step away" card is present; the footer primary button is red "Complete Module Survey" (NOT "Back to Dashboard").
   - Course progress must still show the final lesson as INCOMPLETE (the survey gate withholds it — this is correct).
5. **Complete the survey**: click Complete Module Survey → verify the amber banner ("Submitting this survey finishes the module and issues your certificate") and the "Submit Survey & Get Certificate" button. Answer every required question (there may be multiple Yes/No questions — answer ALL of them), then submit.
6. **Verify the payoff**: the certificate celebration overlay must appear (Certificate Earned / Congratulations / the rendered certificate with the QA student's name + a SCAGO-YYYY-NNNNN number).
7. **Verify the DB chain** (Supabase MCP `execute_sql`): for the QA user_id — final lesson progress row completed, one `course_feedback_responses` row, one non-revoked `certificates` row.
8. **Cleanup (mandatory)**: `node scripts/qa-flow-test.mjs cleanup` — then confirm it prints "Clean." Leave the preview browser at `/scago/login` and remind the user to sign back in.

## Report

Summarize as a pass/fail table per step, including the issued certificate number, and call out any step where messaging or gating deviated from the expected behavior above.
