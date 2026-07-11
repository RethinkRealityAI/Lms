import { describe, it, expect } from 'vitest';
import {
  isRequiredInteractiveBlock,
  getRequiredInteractiveBlockIds,
  type InteractiveGateBlock,
} from './interactive-gating';

const block = (block_type: string, data: Record<string, unknown>, id = 'b1'): InteractiveGateBlock => ({
  id,
  block_type,
  data,
});

describe('isRequiredInteractiveBlock', () => {
  it('gates an image gallery only when requireAllClicked', () => {
    expect(isRequiredInteractiveBlock(block('image_gallery', { requireAllClicked: true }))).toBe(true);
    expect(isRequiredInteractiveBlock(block('image_gallery', { requireAllClicked: false }))).toBe(false);
    expect(isRequiredInteractiveBlock(block('image_gallery', {}))).toBe(false);
  });

  it('gates before/after only when require_interaction', () => {
    expect(isRequiredInteractiveBlock(block('image_compare', { require_interaction: true }))).toBe(true);
    expect(isRequiredInteractiveBlock(block('image_compare', {}))).toBe(false);
  });

  it('gates slider and scratch_reveal on the required flag', () => {
    expect(isRequiredInteractiveBlock(block('slider', { required: true }))).toBe(true);
    expect(isRequiredInteractiveBlock(block('slider', { required: false }))).toBe(false);
    expect(isRequiredInteractiveBlock(block('scratch_reveal', { required: true }))).toBe(true);
    expect(isRequiredInteractiveBlock(block('scratch_reveal', {}))).toBe(false);
  });

  it('gates match_pairs only when required AND it has pairs (never bricks an empty one)', () => {
    expect(isRequiredInteractiveBlock(block('match_pairs', { required: true, pairs: [{ id: 'p1' }] }))).toBe(true);
    expect(isRequiredInteractiveBlock(block('match_pairs', { required: true, pairs: [] }))).toBe(false);
    expect(isRequiredInteractiveBlock(block('match_pairs', { required: true }))).toBe(false);
  });

  it('gates word_bank fill_blank only when required AND the passage has a fillable [blank]', () => {
    expect(isRequiredInteractiveBlock(block('fill_blank', { required: true, text: 'Water is [oxygen].' }))).toBe(true);
    expect(isRequiredInteractiveBlock(block('fill_blank', { required: true, text: 'No blanks here.' }))).toBe(false);
    expect(isRequiredInteractiveBlock(block('fill_blank', { required: true }))).toBe(false);
    // A [word|] blank (empty correction) has no fillable answer in word_bank mode.
    expect(isRequiredInteractiveBlock(block('fill_blank', { required: true, text: 'A [word|] here.' }))).toBe(false);
  });

  it('gates strikeout fill_blank only when a blank has BOTH a wrong word and a correction (never bricks)', () => {
    // Completable: [wrong|correct].
    expect(isRequiredInteractiveBlock(block('fill_blank', { required: true, mode: 'strikeout', text: 'The sky is [gren|green].' }))).toBe(true);
    // Empty correction — StrikeoutViewer can never reveal it → must NOT gate.
    expect(isRequiredInteractiveBlock(block('fill_blank', { required: true, mode: 'strikeout', text: 'The sky is [gren|].' }))).toBe(false);
    // A word_bank-style [answer] passage switched to strikeout has no wrong word → must NOT gate.
    expect(isRequiredInteractiveBlock(block('fill_blank', { required: true, mode: 'strikeout', text: 'The sky is [green].' }))).toBe(false);
  });

  it('never treats a quiz or unknown block as an interactive gate (quizzes gate separately)', () => {
    expect(isRequiredInteractiveBlock(block('quiz_inline', { required: true }))).toBe(false);
    expect(isRequiredInteractiveBlock(block('rich_text', { required: true }))).toBe(false);
  });

  it('tolerates null data', () => {
    expect(isRequiredInteractiveBlock({ id: 'b', block_type: 'slider', data: null })).toBe(false);
  });
});

describe('getRequiredInteractiveBlockIds', () => {
  it('collects only required interactive block ids from page slides', () => {
    const ids = getRequiredInteractiveBlockIds([
      {
        kind: 'page',
        blocks: [
          block('slider', { required: true }, 's1'),
          block('match_pairs', { required: true, pairs: [{ id: 'p' }] }, 'm1'),
          block('rich_text', { required: true }, 'r1'),
          block('quiz_inline', { required: true }, 'q1'),
          block('fill_blank', { required: true, text: 'plain' }, 'f1'),
        ],
      },
      { kind: 'title' },
      { kind: 'completion' },
    ]);
    expect(ids).toEqual(['s1', 'm1']);
  });

  it('returns [] for non-page slides', () => {
    expect(getRequiredInteractiveBlockIds([{ kind: 'title' }, { kind: 'completion' }])).toEqual([]);
  });
});
