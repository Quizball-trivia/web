import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type {
  WlAnswerAck,
  WlDispatchEventPayload,
  WlSubscribeSnapshot,
} from '@/lib/realtime/socket.types';

// ── Fake socket ─────────────────────────────────────────────────────────────

type Handler = (...args: unknown[]) => void;

class FakeSocket {
  connected = true;
  handlers = new Map<string, Set<Handler>>();
  /** Captured wl:answer sends: [payload, cb] with timeout-style callbacks. */
  answerSends: Array<{ data: Record<string, unknown>; cb: (err: Error | null, ack?: WlAnswerAck) => void }> = [];
  subscribeAck: { ok: boolean; seq?: number; reason?: string; snapshot?: WlSubscribeSnapshot | null } = { ok: true, seq: 0 };
  /** When true, subscribe acks are held until releaseSubscribeAck(). */
  deferSubscribeAck = false;
  pendingSubscribeAcks: Array<(r: unknown) => void> = [];

  on(event: string, h: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(h);
    return this;
  }
  off(event: string, h: Handler) {
    this.handlers.get(event)?.delete(h);
    return this;
  }
  emit(event: string, ...args: unknown[]) {
    if (event === 'wl:subscribe') {
      const ack = args[1] as (r: unknown) => void;
      if (this.deferSubscribeAck) this.pendingSubscribeAcks.push(ack);
      else ack?.(this.subscribeAck);
    }
    return this;
  }
  releaseSubscribeAck() {
    const acks = this.pendingSubscribeAcks;
    this.pendingSubscribeAcks = [];
    for (const ack of acks) ack(this.subscribeAck);
  }
  timeout(timeoutMs: number) {
    void timeoutMs;
    return {
      emit: (event: string, data: Record<string, unknown>, cb: (err: Error | null, ack?: WlAnswerAck) => void) => {
        if (event === 'wl:answer') this.answerSends.push({ data, cb });
      },
    };
  }
  fire(event: string, payload: unknown) {
    for (const h of this.handlers.get(event) ?? []) h(payload);
  }
}

let fakeSocket = new FakeSocket();

vi.mock('@/lib/realtime/socket-client', () => ({
  connectSocket: () => fakeSocket,
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (s: { user: { id: string } }) => unknown) =>
    selector({ user: { id: 'me' } }),
}));

import { useWlLive } from '../live/useWlLive';

const TID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function dispatch(seq: number, over: Partial<WlDispatchEventPayload> = {}): WlDispatchEventPayload {
  return {
    type: 'dispatch',
    tournamentId: TID,
    seq,
    serverNowAtEmit: Date.now(),
    attempt_id: `attempt-${seq}`,
    game_index: 0,
    round_index: 0,
    question_index: 0,
    kind: 'mcq',
    question: { prompt: { en: 'Q' }, options: [{ id: 'a', text: { en: 'A' } }] },
    evaluation: { correct_id: 'a' },
    playableAt: Date.now() - 100,
    deadlineAt: Date.now() + 10_000,
    ...over,
  };
}

beforeEach(() => {
  fakeSocket = new FakeSocket();
});

describe('useWlLive', () => {
  it('subscribes on connect and dedups by seq', () => {
    const { result } = renderHook(() => useWlLive(TID, 'player'));
    expect(result.current.subscribed).toBe(true);

    act(() => fakeSocket.fire('wl:dispatch', dispatch(1)));
    expect(result.current.screen.kind).toBe('question');

    // Same seq replayed → ignored (no new attempt).
    act(() => fakeSocket.fire('wl:dispatch', dispatch(1, { attempt_id: 'other' })));
    expect(
      result.current.screen.kind === 'question' && result.current.screen.attempt.attempt_id,
    ).toBe('attempt-1');
  });

  it('hydrates the in-flight question, score and answered state from the snapshot', () => {
    fakeSocket.subscribeAck = {
      ok: true,
      seq: 41,
      snapshot: {
        status: 'game_live',
        server_now: Date.now(),
        game_index: 1,
        attempt: {
          attempt_id: 'attempt-live',
          game_index: 1,
          round_index: 2,
          question_index: 0,
          kind: 'mcq',
          question: { prompt: { en: 'Q' }, options: [] },
          evaluation: { correct_id: 'a' },
          playableAt: Date.now() - 500,
          deadlineAt: Date.now() + 5_000,
        },
        your_answer: { correct: true, points: 34, elapsedMs: 900 },
        your_last_answer: null,
        score: 120,
        board: [{ user_id: 'me', points: 120, time_ms_total: 4000, rank: 3 }],
      },
    };
    const { result } = renderHook(() => useWlLive(TID, 'player'));
    expect(result.current.score).toBe(120);
    expect(result.current.gameIndex).toBe(1);
    expect(result.current.board[0]?.rank).toBe(3);
    expect(result.current.screen.kind).toBe('question');
    if (result.current.screen.kind === 'question') {
      expect(result.current.screen.attempt.attempt_id).toBe('attempt-live');
      expect(result.current.screen.answer).toEqual({ accepted: true, correct: true, points: 34, elapsedMs: 900 });
    }
    // Already answered → further submits are refused.
    act(() => result.current.submitAnswer('a'));
    expect(fakeSocket.answerSends).toHaveLength(0);
  });

  it('scores an accepted ack once and refunds it when the attempt voids', () => {
    const { result } = renderHook(() => useWlLive(TID, 'player'));
    act(() => fakeSocket.fire('wl:dispatch', dispatch(1)));
    act(() => result.current.submitAnswer('a'));
    expect(fakeSocket.answerSends).toHaveLength(1);
    act(() => fakeSocket.answerSends[0].cb(null, { accepted: true, correct: true, points: 40, elapsedMs: 800 }));
    expect(result.current.score).toBe(40);

    act(() =>
      fakeSocket.fire('wl:void', {
        type: 'void', tournamentId: TID, seq: 2, serverNowAtEmit: Date.now(),
        attempt_id: 'attempt-1', game_index: 0, round_index: 0, question_index: 0,
      }),
    );
    expect(result.current.score).toBe(0);
    expect(result.current.screen.kind).toBe('waiting');
  });

  it('ignores a late ack for a previous attempt and keeps the next answerable', () => {
    const { result } = renderHook(() => useWlLive(TID, 'player'));
    act(() => fakeSocket.fire('wl:dispatch', dispatch(1)));
    act(() => result.current.submitAnswer('a'));
    const late = fakeSocket.answerSends[0];

    act(() => fakeSocket.fire('wl:dispatch', dispatch(2, { question_index: 1 })));
    act(() => late.cb(null, { accepted: true, correct: true, points: 40, elapsedMs: 800 }));
    expect(result.current.score).toBe(0); // late ack must not score attempt 2

    act(() => result.current.submitAnswer('a'));
    expect(fakeSocket.answerSends).toHaveLength(2); // attempt 2 still answerable
  });

  it('unlocks the question after a rejected ack and bumps retryNonce', () => {
    const { result } = renderHook(() => useWlLive(TID, 'player'));
    act(() => fakeSocket.fire('wl:dispatch', dispatch(1)));
    act(() => result.current.submitAnswer('a'));
    act(() => fakeSocket.answerSends[0].cb(null, { accepted: false, reason: 'closed' }));

    expect(result.current.retryNonce).toBe(1);
    expect(result.current.screen.kind === 'question' && result.current.screen.answer).toBeNull();
    act(() => result.current.submitAnswer('a'));
    expect(fakeSocket.answerSends).toHaveLength(2);
  });

  it('retries once when the ack times out, then unlocks', () => {
    const { result } = renderHook(() => useWlLive(TID, 'player'));
    act(() => fakeSocket.fire('wl:dispatch', dispatch(1)));
    act(() => result.current.submitAnswer('a'));
    act(() => fakeSocket.answerSends[0].cb(new Error('operation has timed out')));
    // auto-retry fired
    expect(fakeSocket.answerSends).toHaveLength(2);
    act(() => fakeSocket.answerSends[1].cb(null, { accepted: true, correct: false, points: 0, elapsedMs: 5000 }));
    expect(result.current.screen.kind === 'question' && result.current.screen.answer?.accepted).toBe(true);
  });

  it('resets the cursor and state when the tournament changes', () => {
    const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const { result, rerender } = renderHook(({ tid }) => useWlLive(tid, 'player'), {
      initialProps: { tid: TID },
    });
    act(() => fakeSocket.fire('wl:dispatch', dispatch(50)));
    expect(result.current.screen.kind).toBe('question');

    rerender({ tid: OTHER });
    expect(result.current.screen.kind).toBe('waiting');
    // The new tournament's low seq must be accepted despite the old 50.
    act(() => fakeSocket.fire('wl:dispatch', dispatch(1, { tournamentId: OTHER } as never)));
    expect(result.current.screen.kind).toBe('question');
  });

  it('rehydrates across a reconnect: dropped ack + authoritative score recovered', () => {
    const { result } = renderHook(() => useWlLive(TID, 'player'));
    act(() => fakeSocket.fire('wl:dispatch', dispatch(3)));
    act(() => result.current.submitAnswer('a')); // ack will be dropped
    expect(result.current.score).toBe(0);

    // Reconnect: the server-stored answer and score come back in the snapshot.
    fakeSocket.subscribeAck = {
      ok: true,
      seq: 3,
      snapshot: {
        status: 'game_live',
        server_now: Date.now(),
        game_index: 0,
        attempt: {
          attempt_id: 'attempt-3',
          game_index: 0,
          round_index: 0,
          question_index: 0,
          kind: 'mcq',
          question: { prompt: { en: 'Q' }, options: [] },
          evaluation: { correct_id: 'a' },
          playableAt: Date.now() - 500,
          deadlineAt: Date.now() + 5_000,
        },
        your_answer: { correct: true, points: 40, elapsedMs: 700 },
        your_last_answer: null,
        score: 40,
        board: [],
      },
    };
    act(() => {
      fakeSocket.fire('disconnect', 'transport close');
      fakeSocket.fire('connect', undefined);
    });
    expect(result.current.score).toBe(40);
    expect(result.current.screen.kind === 'question' && result.current.screen.answer?.accepted).toBe(true);
  });

  it('a re-broadcast of the same attempt keeps the given answer', () => {
    const { result } = renderHook(() => useWlLive(TID, 'player'));
    act(() => fakeSocket.fire('wl:dispatch', dispatch(1)));
    act(() => result.current.submitAnswer('a'));
    act(() => fakeSocket.answerSends[0].cb(null, { accepted: true, correct: true, points: 40, elapsedMs: 800 }));
    act(() => fakeSocket.fire('wl:dispatch', dispatch(2, { attempt_id: 'attempt-1' })));
    expect(result.current.screen.kind === 'question' && result.current.screen.answer?.accepted).toBe(true);
    expect(result.current.score).toBe(40);
  });

  it('unlocks after all ack retries are exhausted', () => {
    const { result } = renderHook(() => useWlLive(TID, 'player'));
    act(() => fakeSocket.fire('wl:dispatch', dispatch(1)));
    act(() => result.current.submitAnswer('a'));
    act(() => fakeSocket.answerSends[0].cb(new Error('timeout')));
    act(() => fakeSocket.answerSends[1].cb(new Error('timeout')));
    act(() => fakeSocket.answerSends[2].cb(new Error('timeout')));
    expect(result.current.retryNonce).toBe(1);
    act(() => result.current.submitAnswer('a'));
    expect(fakeSocket.answerSends).toHaveLength(4);
  });

  it('merges a dropped-ack recovery even when an event beats the subscribe ack', () => {
    const { result } = renderHook(() => useWlLive(TID, 'player'));
    act(() => fakeSocket.fire('wl:dispatch', dispatch(5)));
    act(() => result.current.submitAnswer('a')); // ack dropped

    fakeSocket.deferSubscribeAck = true;
    fakeSocket.subscribeAck = {
      ok: true,
      seq: 5,
      snapshot: {
        status: 'game_live',
        server_now: Date.now(),
        game_index: 0,
        attempt: {
          attempt_id: 'attempt-5',
          game_index: 0,
          round_index: 0,
          question_index: 0,
          kind: 'mcq',
          question: { prompt: { en: 'Q' }, options: [] },
          evaluation: { correct_id: 'a' },
          playableAt: Date.now() - 500,
          deadlineAt: Date.now() + 5_000,
        },
        your_answer: { correct: true, points: 40, elapsedMs: 700 },
        your_last_answer: null,
        score: 40,
        board: [],
      },
    };
    act(() => {
      fakeSocket.fire('disconnect', 'transport close');
      fakeSocket.fire('connect', undefined);
    });
    // A phase event lands BEFORE the ack callback runs.
    act(() =>
      fakeSocket.fire('wl:phase', {
        type: 'phase', tournamentId: TID, seq: 6, serverNowAtEmit: Date.now(), to: 'game_live',
      }),
    );
    act(() => fakeSocket.releaseSubscribeAck());
    expect(result.current.score).toBe(40);
    expect(result.current.screen.kind === 'question' && result.current.screen.answer?.accepted).toBe(true);
  });

  it('upgrades a reveal that beat the ack with the recovered answer', () => {
    const { result } = renderHook(() => useWlLive(TID, 'player'));
    act(() => fakeSocket.fire('wl:dispatch', dispatch(7)));
    act(() => result.current.submitAnswer('a')); // ack dropped

    fakeSocket.deferSubscribeAck = true;
    fakeSocket.subscribeAck = {
      ok: true,
      seq: 7,
      snapshot: {
        status: 'game_live',
        server_now: Date.now(),
        game_index: 0,
        attempt: {
          attempt_id: 'attempt-7',
          game_index: 0,
          round_index: 0,
          question_index: 0,
          kind: 'mcq',
          question: { prompt: { en: 'Q' }, options: [] },
          evaluation: { correct_id: 'a' },
          playableAt: Date.now() - 500,
          deadlineAt: Date.now() + 5_000,
        },
        your_answer: { correct: true, points: 40, elapsedMs: 700 },
        your_last_answer: null,
        score: 40,
        board: [],
      },
    };
    act(() => {
      fakeSocket.fire('disconnect', 'transport close');
      fakeSocket.fire('connect', undefined);
    });
    // The reveal for the same attempt lands BEFORE the ack callback runs.
    act(() =>
      fakeSocket.fire('wl:reveal', {
        type: 'reveal', tournamentId: TID, seq: 8, serverNowAtEmit: Date.now(),
        attempt_id: 'attempt-7', game_index: 0, round_index: 0, question_index: 0,
        kind: 'mcq', evaluation: { correct_id: 'a' }, answered: 5, distribution: {}, board: [],
      }),
    );
    expect(result.current.screen.kind).toBe('reveal');
    act(() => fakeSocket.releaseSubscribeAck());
    expect(result.current.score).toBe(40);
    expect(result.current.screen.kind === 'reveal' && result.current.screen.answer?.accepted).toBe(true);
  });

  it('recovers the verdict from your_last_answer when the attempt froze pre-snapshot', () => {
    const { result } = renderHook(() => useWlLive(TID, 'player'));
    act(() => fakeSocket.fire('wl:dispatch', dispatch(9)));
    act(() => result.current.submitAnswer('a')); // ack dropped

    fakeSocket.deferSubscribeAck = true;
    fakeSocket.subscribeAck = {
      ok: true,
      seq: 9,
      snapshot: {
        status: 'game_live',
        server_now: Date.now(),
        game_index: 0,
        attempt: null, // froze before the snapshot was built
        your_answer: null,
        your_last_answer: { attempt_id: 'attempt-9', correct: true, points: 40, elapsedMs: 700 },
        score: 40,
        board: [],
      },
    };
    act(() => {
      fakeSocket.fire('disconnect', 'transport close');
      fakeSocket.fire('connect', undefined);
    });
    // Reveal for the frozen attempt beats the ack.
    act(() =>
      fakeSocket.fire('wl:reveal', {
        type: 'reveal', tournamentId: TID, seq: 10, serverNowAtEmit: Date.now(),
        attempt_id: 'attempt-9', game_index: 0, round_index: 0, question_index: 0,
        kind: 'mcq', evaluation: { correct_id: 'a' }, answered: 5, distribution: {}, board: [],
      }),
    );
    act(() => fakeSocket.releaseSubscribeAck());
    expect(result.current.score).toBe(40);
    expect(result.current.screen.kind === 'reveal' && result.current.screen.answer?.accepted).toBe(true);
  });

  it('a void racing the snapshot blocks the stale score merge', () => {
    const { result } = renderHook(() => useWlLive(TID, 'player'));
    act(() => fakeSocket.fire('wl:dispatch', dispatch(11)));

    fakeSocket.deferSubscribeAck = true;
    fakeSocket.subscribeAck = {
      ok: true,
      seq: 11,
      snapshot: {
        status: 'game_live',
        server_now: Date.now(),
        game_index: 0,
        attempt: null,
        your_answer: null,
        your_last_answer: null,
        score: 40, // includes points the void below just took away
        board: [],
      },
    };
    act(() => {
      fakeSocket.fire('disconnect', 'transport close');
      fakeSocket.fire('connect', undefined);
    });
    act(() =>
      fakeSocket.fire('wl:void', {
        type: 'void', tournamentId: TID, seq: 12, serverNowAtEmit: Date.now(),
        attempt_id: 'attempt-11', game_index: 0, round_index: 0, question_index: 0,
      }),
    );
    act(() => fakeSocket.releaseSubscribeAck());
    expect(result.current.score).toBe(0);
  });

  it('remaps the spectator window onto the delayed emission time', () => {
    const { result } = renderHook(() => useWlLive(TID, 'spectator'));
    const emitNow = Date.now();
    act(() =>
      fakeSocket.fire('wl:dispatch', dispatch(1, {
        spectator: true,
        serverNowAtEmit: emitNow,
        playableAt: emitNow - 31_200, // original live window, long over
        deadlineAt: emitNow - 30_000,
      })),
    );
    expect(result.current.screen.kind).toBe('question');
    if (result.current.screen.kind === 'question') {
      expect(result.current.screen.attempt.playableAt).toBe(emitNow);
      expect(result.current.screen.attempt.deadlineAt).toBe(emitNow + 1_200);
    }
  });
});
