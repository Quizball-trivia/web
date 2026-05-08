import { describe, expect, it } from 'vitest';
import { computeMyPossessionPct, toAnswerStates, toRevealAnswerStates } from '../realtimePossession.helpers';

describe('realtimePossession.helpers', () => {
  it('returns 4 answer states for standard multiple-choice questions', () => {
    expect(toAnswerStates(4, 1, true)).toEqual(['disabled', 'correct', 'disabled', 'disabled']);
    expect(toRevealAnswerStates(4, 2, 1)).toEqual(['disabled', 'wrong', 'correct', 'disabled']);
  });

  it('throws when a multiple-choice question does not have exactly 4 options', () => {
    expect(() => toAnswerStates(3, null, null)).toThrow('Expected exactly 4 multiple-choice options');
    expect(() => toRevealAnswerStates(5, 2, 1)).toThrow('Expected exactly 4 multiple-choice options');
  });

  it('computes seat-based possession percentages with server clamping', () => {
    expect(computeMyPossessionPct(40, 1)).toBe(70);
    expect(computeMyPossessionPct(40, 2)).toBe(30);
    expect(computeMyPossessionPct(200, 1)).toBe(100);
    expect(computeMyPossessionPct(-200, 2)).toBe(100);
  });

  it('applies offsets and field clamping separately from server clamping', () => {
    expect(computeMyPossessionPct(0, 1, 15)).toBe(65);
    expect(computeMyPossessionPct(200, 1, 15)).toBe(100);
    expect(computeMyPossessionPct(200, 1, 15, 'field')).toBe(90);
    expect(computeMyPossessionPct(-200, 1, -15, 'field')).toBe(10);
  });
});
