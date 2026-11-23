'use client';

/**
 * /dev/orshabatoba-live?s=<state>: the ორშაბათობა show stage driven by a fake WL live stream, one frozen moment per
 * state, so every screen can be eyeballed (and screenshotted) without a server. States: lobby, host, countdown, tf,
 * mcq, zoom, evo, odd, fake, reveal, intro, final, spectator.
 */

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { WlBoardRow, WlDispatchEventPayload, WlRevealEventPayload } from '@/lib/realtime/socket.types';
import type { WlLiveScreen } from '@/features/weekend-league/live/useWlLive';
import { LiveShowStage, type LiveShowPhase } from '@/features/live-show/live/LiveShowStage';
import type { ShowRound } from '@/features/live-show/live/showLive.adapter';
import { EventLobby, KickoffCountdown } from '@/features/live-event/LiveEventScreen';
import { NoLiveEvent } from '@/features/live-event/NoLiveEvent';
import { liveEventCopy } from '@/features/live-event/liveEvent.copy';

// Invented universe only (no real question or answer in this public repo); the picture is a neutral stand-in.
const ART = { url: '/assets/orshabatoba/events/studio-wide.webp', fit: 'cover' };
const ka = (t: string) => ({ en: t, ka: t });
const CLUBS = [ka('ატლეტიკო ავრორა'), ka('რეალ ბრიზა'), ka('დეპორტივო ნუბე'), ka('პუერტო აზული')];
const clubOptions = CLUBS.map((text, i) => ({ id: 'abcd'[i]!, text }));

const ROUNDS: ShowRound[] = [
  { kind: 'true_false', count: 4 },
  { kind: 'mcq', count: 4 },
  { kind: 'zoom_out', count: 4 },
  { kind: 'evolution', count: 2 },
  { kind: 'odd_one_out', count: 3 },
  { kind: 'fake_fact', count: 3 },
];

const QUESTIONS: Record<string, { round: number; kind: 'mcq' | 'true_false'; question: Record<string, unknown> }> = {
  tf: { round: 0, kind: 'true_false', question: { prompt: ka('ტომას ვარელო რეალ ბრიზაში თამაშობდა.'), show: { kind: 'true_false' } } },
  mcq: { round: 1, kind: 'mcq', question: { prompt: ka('რომელმა კლუბმა მოიგო ჩრდილოეთის ლიგა ზედიზედ სამჯერ?'), options: clubOptions, show: { kind: 'mcq' } } },
  zoom: { round: 2, kind: 'mcq', question: { prompt: ka('რა არის სურათზე?'), image: ART, options: clubOptions, show: { kind: 'zoom_out', focus: { x: 0.5, y: 0.35 } } } },
  evo: { round: 3, kind: 'mcq', question: { prompt: ka('ვისი ემბლემის ისტორიაა?'), options: clubOptions, show: { kind: 'evolution', eras: [
    { year: 1903, image: ART }, { year: 1951, image: ART }, { year: 1988, image: ART }, { year: 2019, image: ART },
  ] } } },
  odd: { round: 4, kind: 'mcq', question: { prompt: ka('ვის არასდროს უთამაშია რეალ ბრიზაში?'), options: [
    { id: 'a', text: ka('იკერ მონტანიესი') }, { id: 'b', text: ka('ბრუნო სალსედალი') }, { id: 'c', text: ka('დანტე ფეროლო') }, { id: 'd', text: ka('ლუკას ოიარსაბალი') },
  ], show: { kind: 'odd_one_out' } } },
  fake: { round: 5, kind: 'mcq', question: { prompt: ka('რომელი ფაქტია ტყუილი?'), options: [
    { id: 'a', text: ka('ორი ჩრდილოეთის ლიგა აქვს') }, { id: 'b', text: ka('პუერტო აზულში დაიწყო') }, { id: 'c', text: ka('ნორტე იუნაიტედში თამაშობდა') },
  ], show: { kind: 'fake_fact', subject: { name: ka('ტომას ვარელო') } } } },
};

const NAMES = ['Talakha', 'FleetChamp1', 'gio_10', 'nino', 'luka.k', 'sandro', 'tatia', 'beqa', 'mari', 'dato', 'ana', 'levani'];
const BOARD: WlBoardRow[] = NAMES.map((n, i) => ({ user_id: `u${i}`, nickname: n, points: 2100 - i * 140, time_ms_total: 30_000 + i * 900, rank: i + 1 }));

function dispatch(key: string, now: number, playableIn: number): WlDispatchEventPayload {
  const q = QUESTIONS[key]!;
  return {
    type: 'dispatch', tournamentId: 'dev', seq: 10, serverNowAtEmit: now,
    attempt_id: `att-${key}`, game_index: 0, round_index: q.round, question_index: 1,
    kind: q.kind, question: q.question, evaluation: {},
    playableAt: now + playableIn, deadlineAt: now + playableIn + 10_000,
  } as unknown as WlDispatchEventPayload;
}

function DevOrshabatobaLive() {
  const copy = liveEventCopy('ka');
  const [s] = useState(() => (typeof window === 'undefined' ? 'lobby' : new URLSearchParams(window.location.search).get('s') ?? 'lobby'));
  const [width] = useState(() => {
    const w = typeof window === 'undefined' ? NaN : Number(new URLSearchParams(window.location.search).get('w'));
    return Number.isFinite(w) && w > 0 ? w : null;
  });
  const [t0] = useState(() => Date.now());
  const [now, setNow] = useState(t0);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, []);

  const { phase, screen, kickoff, canAnswer } = useMemo(() => {
    let phase: LiveShowPhase = 'game';
    let screen: WlLiveScreen = { kind: 'waiting' };
    let kickoff: number | null = null;
    let canAnswer = true;
    if (s === 'lobby' || s === 'host') phase = 'pregame';
    else if (s === 'countdown') { phase = 'countdown'; kickoff = t0 + 47_000; }
    else if (s === 'intro') screen = { kind: 'question', attempt: { ...dispatch('zoom', t0, 2_500), question_index: 0 }, answer: null };
    else if (s === 'reveal') {
      const attempt = dispatch('mcq', t0 - 12_000, 0);
      const reveal = { type: 'reveal', tournamentId: 'dev', seq: 11, attempt_id: attempt.attempt_id, game_index: 0, round_index: 1, question_index: 1, kind: 'mcq',
        evaluation: { correct_id: 'a' }, answered: 240, distribution: { a: 150, b: 40, c: 30, d: 20 }, board: BOARD } as unknown as WlRevealEventPayload;
      screen = { kind: 'reveal', attempt, reveal, answer: { accepted: true, correct: true, points: 90, elapsedMs: 2100 } };
    } else if (s === 'final') screen = { kind: 'final_result', result: { type: 'final_result', tournamentId: 'dev', seq: 99, board: BOARD, champion_user_id: 'u0' } as never, champion: true };
    else if (s === 'spectator') { canAnswer = false; screen = { kind: 'question', attempt: dispatch('tf', t0, 0), answer: null }; }
    else if (QUESTIONS[s]) screen = { kind: 'question', attempt: dispatch(s, t0 - (s === 'zoom' || s === 'evo' ? 4_500 : 1_000), 0), answer: null };
    return { phase, screen, kickoff, canAnswer };
  }, [s, t0]);

  if (s.startsWith('card-')) {
    const kind = s.slice(5);
    if (kind === 'empty') return <div className="min-h-screen bg-surface-page-alt"><NoLiveEvent /></div>;
    return (
      <div className="min-h-screen bg-surface-page-alt">
        {/* ?w=320 renders the card in a column that wide (title-fit checks). */}
        <div style={{ width: width ?? undefined }} className={width ? 'mx-auto' : undefined}>
        <EventLobby
          copy={copy}
          registered={kind === 'anon' ? null : 248}
          status={kind === 'live' ? 'game_live' : 'entry_open'}
          entered={kind === 'registered' || kind === 'host'}
          signedOut={kind === 'anon'}
          onSignIn={() => {}}
          onRegister={() => {}}
          host={kind === 'host' ? { busy: false, message: null, onStart: () => {} } : undefined}
        />
        </div>
      </div>
    );
  }

  return (
    <LiveShowStage
      locale="ka"
      title={copy.title}
      phase={phase}
      now={now}
      kickoffMs={kickoff}
      registered={248}
      screen={screen}
      board={s === 'lobby' || s === 'host' || s === 'countdown' ? [] : BOARD}
      score={s === 'final' ? 2100 : 1240}
      selfUserId="u0"
      canAnswer={canAnswer}
      onAnswer={() => {}}
      retryNonce={0}
      rounds={ROUNDS}
      lobbyLine={copy.startsWhenHostsSay}
      pregamePanel={(
        <EventLobby
          copy={copy}
          scheduledAt={null}
          registered={248}
          status="entry_open"
          entered={s === 'host'}
          onRegister={() => {}}
          host={s === 'host' ? { busy: false, message: null, onStart: () => {} } : undefined}
        />
      )}
      countdownPanel={<KickoffCountdown compact copy={copy} kickoffMs={kickoff} canJoin joining={false} onJoin={() => {}} />}
      onExit={() => {}}
    />
  );
}

/** Client-only: each frame reads the URL and the clock on first render. */
export default dynamic(() => Promise.resolve(DevOrshabatobaLive), { ssr: false });
