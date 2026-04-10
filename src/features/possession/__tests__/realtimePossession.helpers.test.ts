import { describe, expect, it } from 'vitest';
import { toAnswerStates, toRevealAnswerStates } from '../realtimePossession.helpers';

describe('realtimePossession.helpers', () => {
  it('returns 4 answer states for standard multiple-choice questions', () => {
    expect(toAnswerStates(4, 1, true)).toEqual(['disabled', 'correct', 'disabled', 'disabled']);
    expect(toRevealAnswerStates(4, 2, 1)).toEqual(['disabled', 'wrong', 'correct', 'disabled']);
  });

  it('throws when a multiple-choice question does not have exactly 4 options', () => {
    expect(() => toAnswerStates(3, null, null)).toThrow('Expected exactly 4 multiple-choice options');
    expect(() => toRevealAnswerStates(5, 2, 1)).toThrow('Expected exactly 4 multiple-choice options');
  });
});
