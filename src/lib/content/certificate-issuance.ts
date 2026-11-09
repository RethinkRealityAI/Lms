/**
 * Shared helpers for interpreting the `issue_course_certificate` RPC result on
 * the client. Kept pure + framework-free so they're unit-testable and reused by
 * every issuance call site (course viewer completion, cert self-heal, survey page).
 */

export interface IssueCertResult {
  certificate_id?: string | null;
  certificate_number?: string | null;
  already_issued?: boolean;
  /** Program is certificate-only (migration 067): the per-course cert is hidden. */
  suppressed?: boolean;
  /** The program certificate the learner holds, if the program is complete. */
  program_certificate_id?: string | null;
}

/**
 * Which certificate (if any) should be surfaced to the student after an issuance
 * call — i.e. celebrated, PDF-pre-generated, emailed, and shown in their list.
 *
 * - Normal course (GANSID): the course certificate.
 * - Certificate-only program (SCAGO default): the per-course cert is hidden, so
 *   nothing is surfaced until the whole program is done — then the PROGRAM
 *   certificate is surfaced. Returns null for every course before the last.
 */
export function celebrationCertId(result: IssueCertResult | null | undefined): string | null {
  if (!result) return null;
  if (result.suppressed) return result.program_certificate_id ?? null;
  return result.certificate_id ?? null;
}
