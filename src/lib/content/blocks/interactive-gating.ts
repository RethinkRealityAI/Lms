/**
 * Required-interactive gating for the student viewer.
 *
 * Non-quiz interactive blocks (Drag to Match, Fill in the Blank, Scratch to
 * Reveal, Before/After, Slider, and required-click image galleries) can be
 * marked "Required to continue" — the learner must finish the interaction
 * before the Next button unlocks on that slide.
 *
 * IMPORTANT — this is a CLIENT-ONLY navigation gate, exactly like the existing
 * image-gallery required-click gate. It is NOT persisted and is NOT read by
 * `issue_course_certificate` (which only verifies quiz answers server-side).
 * So deleting, re-doing, or misconfiguring an interactive block can never
 * strand a learner's certificate: an already-completed lesson bypasses every
 * client gate (see course-viewer `lessonAlreadyCompleted`), and the server
 * cert RPC never depends on these blocks. Keep it that way — only quizzes may
 * feed the certificate-bearing completion gate (see getGatingQuizBlockIds).
 *
 * Mirroring the quiz gate, a block only gates when it is actually satisfiable
 * (has content the learner can complete). A misconfigured block — no pairs, no
 * blanks — must NOT gate, or it would permanently brick the slide.
 */

import { getFillBlankAnswers, tokenizeFillBlank } from './fill-blank/schema';

export interface InteractiveGateBlock {
  id: string;
  block_type: string;
  data?: Record<string, unknown> | null;
}

export interface InteractiveGateSlideLike {
  kind: string;
  blocks?: InteractiveGateBlock[];
}

/**
 * Can a fill-blank block actually be completed (so it's safe to gate on)? This
 * MIRRORS the two viewers exactly so a required block always has a reachable
 * completion, never bricking the slide:
 * - word_bank: at least one `[answer]` blank (WordBankViewer completes when every
 *   blank is filled; `getFillBlankAnswers` counts only blanks with a correct answer).
 * - strikeout: at least one blank with BOTH a wrong word and a correction
 *   (`[wrong|correct]`) — StrikeoutViewer's `targetIndices` ignores `[word|]` or
 *   plain `[answer]` blanks, so a passage with only those can never fire onComplete.
 */
function fillBlankIsCompletable(d: Record<string, unknown>): boolean {
  const text = typeof d.text === 'string' ? d.text : '';
  if (!text) return false;
  if (d.mode === 'strikeout') {
    return tokenizeFillBlank(text).some((t) => t.kind === 'blank' && !!t.wrong && !!t.correct);
  }
  return getFillBlankAnswers(text).length > 0;
}

/**
 * True when a non-quiz interactive block is marked required AND has completable
 * content, so it should gate Next on its slide. Returns false for quiz blocks
 * (those gate via getGatingQuizBlockIds) and for any block that could never fire
 * its completion callback.
 */
export function isRequiredInteractiveBlock(block: InteractiveGateBlock): boolean {
  const d = (block.data ?? {}) as Record<string, unknown>;
  switch (block.block_type) {
    case 'image_gallery':
      // Existing behaviour: required only when the author asked for all-clicked.
      return d.requireAllClicked === true;
    case 'image_compare':
      return d.require_interaction === true;
    case 'slider':
      // A slider fires completion on any interaction — always satisfiable.
      return d.required === true;
    case 'scratch_reveal':
      // Always completable (the learner can always scratch).
      return d.required === true;
    case 'match_pairs':
      return d.required === true && Array.isArray(d.pairs) && d.pairs.length > 0;
    case 'fill_blank':
      return d.required === true && fillBlankIsCompletable(d);
    default:
      return false;
  }
}

/**
 * Ids of the required interactive (non-quiz) blocks across the given slides.
 * Sourced from the RENDERED slide set (course-viewer's currentSlides) for the
 * same reason as the quiz gate: only blocks the student can actually see may
 * gate — a block on a soft-deleted or draft-hidden slide never renders.
 */
export function getRequiredInteractiveBlockIds(slides: InteractiveGateSlideLike[]): string[] {
  return slides
    .flatMap((s) => (s.kind === 'page' ? s.blocks ?? [] : []))
    .filter(isRequiredInteractiveBlock)
    .map((b) => b.id);
}
