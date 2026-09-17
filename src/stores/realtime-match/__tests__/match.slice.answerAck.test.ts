import { beforeEach, describe, expect, it } from 'vitest';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import type { MatchAnswerAckPayload, ResolvedMatchQuestionPayload } from '@/lib/realtime/socket.types';

const MATCH_ID = 'match-1';
const USER_A = 'user-a';
const USER_B = 'user-b';

function seedMatch() {
  const store = useRealtimeMatchStore.getState();
  store.setMatchStart({
    matchId: MATCH_ID,
    mode: 'ranked',
    variant: 'ranked_sim',
    mySeat: 1,
    opponent: { id: USER_B, username: 'opponent', avatarUrl: null },
    participants: [
      { userId: USER_A, username: 'me', avatarUrl: null, seat: 1 },
      { userId: USER_B, username: 'opponent', avatarUrl: null, seat: 2 },
    ],
  });
  store.setSelfUserId(USER_A);
}

function makeQuestion(qIndex: number): ResolvedMatchQuestionPayload {
  return {
    matchId: MATCH_ID,
    qIndex,
    total: 12,
    question: {
      kind: 'multipleChoice',
      id: `q-${qIndex}`,
      prompt: `Question ${qIndex}`,
      options: ['A', 'B', 'C', 'D'],
      categoryName: 'General',
    } as ResolvedMatchQuestionPayload['question'],
    deadlineAt: new Date(Date.now() + 10_000).toISOString(),
    phaseKind: 'normal',
  };
}

function makeAck(qIndex: number, extra: Partial<MatchAnswerAckPayload> = {}): MatchAnswerAckPayload {
  return {
    matchId: MATCH_ID,
    qIndex,
    questionKind: 'multipleChoice',
    selectedIndex: 1,
    isCorrect: true,
    correctIndex: 1,
    myTotalPoints: 70,
    oppAnswered: false,
    pointsEarned: 70,
    phaseKind: 'normal',
    ...extra,
  };
}

describe('match.slice — setAnswerAck opponent fields', () => {
  beforeEach(() => {
    useRealtimeMatchStore.getState().reset();
    seedMatch();
    useRealtimeMatchStore.getState().setMatchQuestion(makeQuestion(3));
  });

  it('ack-first ordering without opponent fields leaves opponent points unknown until opponent_answered', () => {
    const store = useRealtimeMatchStore.getState();

    // Older backend: the ack only says the opponent answered, nothing about
    // their points. The store must NOT invent a value (0 / correct) here.
    store.setAnswerAck(makeAck(3, { oppAnswered: true }));
    expect(useRealtimeMatchStore.getState().match).toMatchObject({
      opponentAnswered: true,
      opponentRecentPoints: 0,
      opponentAnsweredCorrectly: null,
      opponentSelectedIndex: null,
    });

    // The late opponent_answered event still applies the real values.
    store.setOpponentAnswered({
      matchId: MATCH_ID,
      qIndex: 3,
      opponentTotalPoints: 90,
      pointsEarned: 90,
      isCorrect: true,
      selectedIndex: 1,
    });
    expect(useRealtimeMatchStore.getState().match).toMatchObject({
      opponentAnswered: true,
      opponentRecentPoints: 90,
      oppTotalPoints: 90,
      opponentAnsweredCorrectly: true,
      opponentSelectedIndex: 1,
    });
  });

  it('applies opponent points carried on the ack exactly like opponent_answered', () => {
    const store = useRealtimeMatchStore.getState();

    store.setAnswerAck(
      makeAck(3, {
        oppAnswered: true,
        opponentPointsEarned: 90,
        opponentTotalPoints: 90,
        opponentIsCorrect: true,
        opponentSelectedIndex: 1,
      })
    );

    expect(useRealtimeMatchStore.getState().match).toMatchObject({
      opponentAnswered: true,
      opponentRecentPoints: 90,
      oppTotalPoints: 90,
      opponentAnsweredCorrectly: true,
      opponentSelectedIndex: 1,
      myTotalPoints: 70,
    });
  });

  it('applies a wrong opponent answer carried on the ack as known +0', () => {
    const store = useRealtimeMatchStore.getState();

    store.setAnswerAck(
      makeAck(3, {
        oppAnswered: true,
        opponentPointsEarned: 0,
        opponentTotalPoints: 40,
        opponentIsCorrect: false,
        opponentSelectedIndex: 2,
      })
    );

    expect(useRealtimeMatchStore.getState().match).toMatchObject({
      opponentAnswered: true,
      opponentRecentPoints: 0,
      oppTotalPoints: 40,
      opponentAnsweredCorrectly: false,
      opponentSelectedIndex: 2,
    });
  });

  it('does not touch opponent fields when the opponent has not answered', () => {
    const store = useRealtimeMatchStore.getState();

    store.setAnswerAck(makeAck(3, { oppAnswered: false }));

    expect(useRealtimeMatchStore.getState().match).toMatchObject({
      opponentAnswered: false,
      opponentRecentPoints: 0,
      opponentAnsweredCorrectly: null,
      opponentSelectedIndex: null,
    });
  });

  it('does not clear an already-true opponentAnswered when a delayed ack says oppAnswered=false', () => {
    const store = useRealtimeMatchStore.getState();

    // match:opponent_answered lands first (opponent was faster) ...
    store.setOpponentAnswered({
      matchId: MATCH_ID,
      qIndex: 3,
      opponentTotalPoints: 90,
      pointsEarned: 90,
      isCorrect: true,
      selectedIndex: 1,
    });
    // ... then our own ack, computed by the server BEFORE the opponent
    // answered, arrives late with oppAnswered=false. It must not regress the
    // newer flag for the same question.
    store.setAnswerAck(makeAck(3, { oppAnswered: false }));

    expect(useRealtimeMatchStore.getState().match).toMatchObject({
      opponentAnswered: true,
      opponentRecentPoints: 90,
      oppTotalPoints: 90,
      opponentAnsweredCorrectly: true,
      opponentSelectedIndex: 1,
    });
  });
});
