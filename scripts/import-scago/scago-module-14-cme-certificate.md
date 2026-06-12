# SCAGO Module 14: Request for Certificate of Completion for CME Credits

## Module Metadata

```yaml
module_number: 14
title: "Request for Certificate of Completion for CME Credits"
safetyculture_url: "https://app.safetyculture.com/training/course-preview/p/77dHvOZBCmInLtQRz5W0VrF2"
lesson_count: 1
purpose: "CME certificate request — not educational content"
```

---

## Important Note

**This is not an educational module.** Module 14 in SafetyCulture is a 2-slide administrative unit used to collect the learner's name and email so a Mainpro+ program certificate of completion can be issued.

In the SCAGO LMS, this functionality is replaced by the built-in certificate system (migration 036: `issue_course_certificate` RPC + `cme_certificate_requests` table from migration 034). **Module 14 does not need to be imported as course content.**

---

## Lesson 1: Request for Program Certificate of Completion

**Slide count:** 2

---

### Slide 1 — CME Certificate Request
**Type:** `free-text-survey`
**LMS block:** *(not applicable — replaced by LMS certificate system)*

**Prompt/Question:**

> "Please provide your full name and email. A program certificate of completion for your Mainpro+ Credits will become available for download upon successful completion of this section."

**Expected input:** Full name + email address (free text)

---

### Slide 2 — Exit
**Type:** `exit`
**LMS block:** `completion_slide` (auto-generated)

---

## LMS Implementation Notes

This module's purpose maps to existing LMS infrastructure:

| SafetyCulture Function | LMS Equivalent |
|---|---|
| Collect name + email for CME cert | User already authenticated — name + email on profile |
| Issue certificate on completion | `issue_course_certificate()` RPC (migration 036) auto-fires on lesson completion |
| Mainpro+ program certificate | `programs` table + `award_program_certificates()` trigger (migration 028/036) |
| CME certificate request queue | `cme_certificate_requests` table (migration 034) — admin reviews and issues |
| Legacy CME requests (EdApp Module 14 completions) | `materialize_legacy_completions()` auto-files PENDING CME request on claim (migration 044) |

**Action:** Do not import Module 14 as LMS course content. Ensure the SCAGO program (all Modules 1–13) is configured in the LMS `programs` table, and that completing all 13 courses triggers the program certificate via `award_program_certificates()`.
