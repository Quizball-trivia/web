import { describe, expect, it } from 'vitest';
import {
  computeMyPossessionPct,
  getPenaltyBothCorrectReasonKey,
  isOpponentPointsKnown,
  shouldShowOpponentScore,
  toAnswerStates,
  toRevealAnswerStates,
} from '../realtimePossession.helpers';

describe('realtimePossession.helpers', () => {
  it('treats opponent points as known only once correctness has arrived', () => {
    // answer_ack (oppAnswered: true) before match:opponent_answered
    expect(isOpponentPointsKnown({ opponentAnswered: true, opponentAnsweredCorrectly: null })).toBe(false);
    expect(isOpponentPointsKnown({ opponentAnswered: false, opponentAnsweredCorrectly: null })).toBe(false);
    expect(isOpponentPointsKnown({ opponentAnswered: true, opponentAnsweredCorrectly: true })).toBe(true);
    expect(isOpponentPointsKnown({ opponentAnswered: true, opponentAnsweredCorrectly: false })).toBe(true);
    // correctness without the answered flag (e.g. stale) is not "known"
    expect(isOpponentPointsKnown({ opponentAnswered: false, opponentAnsweredCorrectly: true })).toBe(false);
  });

  it('shows the opponent bar-battle score once points are known or from the round result', () => {
    expect(shouldShowOpponentScore({ opponentAnswered: true, opponentAnsweredCorrectly: null, hasRoundResult: false })).toBe(false);
    expect(shouldShowOpponentScore({ opponentAnswered: false, opponentAnsweredCorrectly: null, hasRoundResult: false })).toBe(false);
    expect(shouldShowOpponentScore({ opponentAnswered: true, opponentAnsweredCorrectly: false, hasRoundResult: false })).toBe(true);
    expect(shouldShowOpponentScore({ opponentAnswered: true, opponentAnsweredCorrectly: true, hasRoundResult: false })).toBe(true);
    // Authoritative round result always shows (bot penalties skip opponent_answered).
    expect(shouldShowOpponentScore({ opponentAnswered: false, opponentAnsweredCorrectly: null, hasRoundResult: true })).toBe(true);
  });

  it('maps a both-correct penalty reason to the explanation key for the losing seat', () => {
    // Keeper answered correctly but the shooter was faster → goal conceded.
    expect(getPenaltyBothCorrectReasonKey('shooter_faster', false)).toBe('possession.penaltyBothCorrectShooterFaster');
    // Shooter answered correctly but the keeper was faster → saved.
    expect(getPenaltyBothCorrectReasonKey('keeper_faster', true)).toBe('possession.penaltyBothCorrectKeeperFaster');
    // Winning seat gets no line.
    expect(getPenaltyBothCorrectReasonKey('shooter_faster', true)).toBeNull();
    expect(getPenaltyBothCorrectReasonKey('keeper_faster', false)).toBeNull();
    // Someone missed: outcome is self-explanatory.
    expect(getPenaltyBothCorrectReasonKey('shooter_missed', true)).toBeNull();
    expect(getPenaltyBothCorrectReasonKey('keeper_missed', false)).toBeNull();
    expect(getPenaltyBothCorrectReasonKey(undefined, false)).toBeNull();
    expect(getPenaltyBothCorrectReasonKey(null, true)).toBeNull();
  });

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
