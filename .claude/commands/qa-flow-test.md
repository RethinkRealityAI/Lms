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

## Email delivery check (`/qa-flow-test email`)

When `$ARGUMENTS` starts with `email`, run this instead of the course flow. Use it after any change to signup/password-reset emails, the Supabase SMTP settings, email rate limits, or auth redirect URLs. It sends REAL email through the live mail server.

1. **Send**: `node scripts/qa-flow-test.mjs email --to=<an inbox the user can read> --slug=scago --reset` (repeat with `--slug=gansid` when GANSID is affected). It signs up a fresh `+lmsqa<timestamp>` alias through the same public signup endpoint the website uses, then requests a password reset. Each line prints ✔ SENT or ✘ with the diagnosis: RATE LIMITED (hourly email cap) or MAIL SERVER ERROR (SMTP refused, e.g. a wrong password).
2. **On ✘**: read the Supabase auth logs (`query_logs`, source `auth_logs`, `level = 'error'`) for the exact SMTP reply, then fix it in Supabase → Authentication → Emails → SMTP Settings or → Rate Limits.
3. **Verify delivery** (Gmail connector if available, or ask the user): sender "HCP E-learning" <tech@sicklecellanemia.ca>, the right program's logo and colours, and the confirmation link returning to the portal's own domain (SCAGO → learn.sicklecellanemia.ca, GANSID → org-lms.netlify.app).
4. **Cleanup (mandatory)**: `node scripts/qa-flow-test.mjs email-cleanup`. Without a service-role key it prints the SQL to run with Supabase MCP `execute_sql` (`delete from auth.users where email like '%+lmsqa%'`).
