'use client';

/**
 * Zone match (Ranked 2.0 beta) as a room game: the server runs the match (backend games/zone-match) and sends each
 * seat its view, already turned round so this seat is always "player" and with what it can't know yet left out. The
 * screens are the prototype's own, drawn from that view; every action goes to the server as a command naming the
 * moment it is for (the duel, the question, the round).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ShowdownScreen } from '@/components/ShowdownScreen';
import type { RoomClientRules } from '@/features/room/useRoomConnection';
import type { RoomConnection, RoomGameScreens } from '@/features/wordgames/RoomGameShell';
import type { RoomStatePayload } from '@/lib/realtime/socket.types';
import { tierFromRp } from '@/utils/rankedTier';
import { CoinToss } from './ZoneMatchCoinToss';
import { DeckReveal } from './ZoneMatchCards';
import { CategoriesReveal } from './ZoneMatchCategories';
import { PhaseCurtain } from './ZoneMatchCurtain';
import { LoadoutSteps, RuleChips } from './ZoneMatchLoadout';
import { FullTime, ScreenFrame, showdownFullBody } from './ZoneMatchPrototype';
import { ZoneMatchShootout } from './ZoneMatchShootout';
import { ZoneMatchStage, type ZoneMatchSeat } from './ZoneMatchStage';
import { PlaystylePicker } from './picker/PickerLab';
import type { CardId } from './zoneMatch.cards';
import type { Category, MatchState } from './zoneMatch.machine';

/** The server's view of the match for this seat (backend zone-match.engine viewOf). */
export interface ZoneMatchServerView {
  phase: 'loadout' | 'match' | 'over' | 'cancelled';
  deadline: number;
  you: number;
  rounds: number;
  loadoutIn: { you: boolean; them: boolean };
  match: MatchState;
  opponentAnswered: boolean;
  opponentGuessed: boolean;
  question: { prompt: string; options: string[] } | null;
  categories: Category[];
  end: { winner: 'you' | 'them' | null; reason: 'score' | 'left' } | null;
}

export type ZoneMatchCommand =
  | { type: 'loadout'; cards: CardId[] }
  | { type: 'category'; round: number; categoryId: string }
  | { type: 'card'; duel: number; card: CardId | null }
  | { type: 'reaction'; duel: number; card: CardId }
  | { type: 'live'; duel: number; key: number; card: CardId }
  | { type: 'home'; duel: number; categoryId: string }
  | { type: 'answer'; key: number; index: number }
  | { type: 'guess'; key: number; value: number };

/**
 * One command per moment: settled once the view shows it or the moment has passed. An answer's slot carries the option,
 * so a Second Ball retry (a different option for the same question) is its own command.
 */
export const zoneMatchRoomRules: RoomClientRules<ZoneMatchCommand> = {
  slot: (c) => {
    switch (c.type) {
      case 'loadout':
        return 'loadout';
      case 'category':
        return `category:${c.round}`;
      case 'answer':
        return `answer:${c.key}:${c.index}`;
      case 'guess':
        // The value is part of the slot (like an answer's option): a guess re-entered after the optimistic window
        // is its own command, never a retry silently carrying the earlier number.
        return `guess:${c.key}:${c.value}`;
      case 'live':
        return `live:${c.key}:${c.card}`;
      default:
        return `${c.type}:${c.duel}`;
    }
  },
  settled: (raw, c) => {
    const v = raw as Partial<ZoneMatchServerView>;
    const m = v.match;
    if (c.type === 'loadout') return v.phase !== 'loadout' || !!v.loadoutIn?.you;
    if (!m || v.phase !== 'match') return true;
    switch (c.type) {
      case 'category':
        return m.round !== c.round || m.battleStep !== 'category';
      case 'card':
        return m.duelNo !== c.duel || m.battleStep !== 'cards' || m.choice.player !== undefined;
      case 'reaction':
        return m.duelNo !== c.duel || m.battleStep !== 'reveal' || m.played.player.includes(c.card);
      case 'home':
        return m.duelNo !== c.duel || m.battleStep !== 'reveal' || m.homeCategoryId === c.categoryId;
      case 'live':
        return m.duelNo !== c.duel || m.battleStep !== 'mcq' || !m.mcq || m.mcq.key !== c.key || m.mcq.answers.player !== null || m.played.player.includes(c.card);
      case 'answer':
        return m.battleStep !== 'mcq' || !m.mcq || m.mcq.key !== c.key || m.mcq.answers.player !== null || m.mcq.firstMiss.player === c.index;
      case 'guess':
        return !m.numeric || m.numeric.key !== c.key || !!m.numeric.result || m.numeric.guesses.player.value !== null;
    }
  },
};

function seatsOf(snapshot: RoomStatePayload, you: number): { player: ZoneMatchSeat; opponent: ZoneMatchSeat } {
  const at = (seat: number): ZoneMatchSeat => {
    const s = snapshot.seats.find((x) => x.seat === seat);
    return { name: s?.username ?? '—', avatarCustomization: s?.avatarCustomization ?? null, rankPoints: null };
  };
  return { player: at(you), opponent: at(you === 0 ? 1 : 0) };
}

/** The server's clock, ticking (the screens count down against it). */
function useServerNow(room: RoomConnection<ZoneMatchCommand>) {
  const [now, setNow] = useState(() => room.nowMs());
  useEffect(() => {
    const id = window.setInterval(() => setNow(room.nowMs()), 100);
    return () => window.clearInterval(id);
  }, [room]);
  return now;
}

function Board({ view, snapshot, room }: { view: ZoneMatchServerView; snapshot: RoomStatePayload; room: RoomConnection<ZoneMatchCommand> }) {
  const now = useServerNow(room);
  const seats = useMemo(() => seatsOf(snapshot, view.you), [snapshot, view.you]);
  const [deck, setDeck] = useState<CardId[]>([]);
  // Optimistic input: a tap shows at once; the server's snapshot (which carries the right answer once this seat is
  // locked) takes over a round-trip later. Keyed to the question so a Substitution or the next duel drops it, and
  // time-bound: a command the server never confirmed must not pin the controls — after the window the player can
  // simply tap again (the connection's own retry keeps the first command safe from double counting).
  const OPTIMISTIC_MS = 4_000;
  const [pendingAnswer, setPendingAnswer] = useState<{ key: number; index: number; at: number } | null>(null);
  const [pendingGuess, setPendingGuess] = useState<{ key: number; value: number; at: number } | null>(null);
  // Every other button gets the same instant feedback: a tap patches the view the way the server is about to, and
  // the snapshot takes over a round-trip later. All keyed to their moment and time-bound like the answer overlay.
  const [pendingCategory, setPendingCategory] = useState<{ round: number; id: string; at: number } | null>(null);
  const [pendingCard, setPendingCard] = useState<{ duel: number; card: CardId | null; at: number } | null>(null);
  const [pendingPlay, setPendingPlay] = useState<{ duel: number; card: CardId; at: number } | null>(null);
  const [pendingHome, setPendingHome] = useState<{ duel: number; id: string; at: number } | null>(null);
  const [pendingLoadout, setPendingLoadout] = useState<number | null>(null);
  const answerPending = !!(view.match.mcq && view.match.battleStep === 'mcq' && view.match.mcq.answers.player === null
    && pendingAnswer?.key === view.match.mcq.key && now - pendingAnswer.at < OPTIMISTIC_MS
    && pendingAnswer.index !== view.match.mcq.firstMiss.player
    // An option a 50/50 hid after the tap can never lock: the remaining options must stay tappable.
    && !view.match.mcq.hidden.player.includes(pendingAnswer.index));
  const state = useMemo(() => {
    let m = view.match;
    if (m.mcq && answerPending && pendingAnswer && !m.mcq.hidden.player.includes(pendingAnswer.index)) {
      m = { ...m, mcq: { ...m.mcq, answers: { ...m.mcq.answers, player: pendingAnswer.index } } };
    }
    if (m.numeric && !m.numeric.result && m.numeric.guesses.player.value === null && pendingGuess?.key === m.numeric.key
      && now - pendingGuess.at < OPTIMISTIC_MS) {
      m = { ...m, numeric: { ...m.numeric, guesses: { ...m.numeric.guesses, player: { value: pendingGuess.value, lockedAtMs: null } } } };
    }
    // The attacker's category tap: the tile grays at once (the component derives tiles from usedCategories).
    if (m.battleStep === 'category' && pendingCategory?.round === m.round && now - pendingCategory.at < OPTIMISTIC_MS
      && !m.usedCategories.player.includes(pendingCategory.id)) {
      m = { ...m, usedCategories: { ...m.usedCategories, player: [...m.usedCategories.player, pendingCategory.id] } };
    }
    // The blind pick: the hand closes at once (the hand shows while choice.player is undefined).
    if (m.battleStep === 'cards' && m.choice.player === undefined && pendingCard?.duel === m.duelNo && now - pendingCard.at < OPTIMISTIC_MS) {
      m = { ...m, choice: { ...m.choice, player: pendingCard.card } };
    }
    // A reaction or live card: played.player disables the hand at once (cardBlocker: one card per question).
    if ((m.battleStep === 'reveal' || m.battleStep === 'mcq') && pendingPlay?.duel === m.duelNo
      && now - pendingPlay.at < OPTIMISTIC_MS && !m.played.player.includes(pendingPlay.card)) {
      m = { ...m, played: { ...m.played, player: [...m.played.player, pendingPlay.card] } };
    }
    // Home Advantage's category choice shows at once.
    if (m.battleStep === 'reveal' && pendingHome?.duel === m.duelNo && now - pendingHome.at < OPTIMISTIC_MS && m.homeCategoryId === null) {
      m = { ...m, homeCategoryId: pendingHome.id };
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.match, pendingAnswer, pendingGuess, pendingCategory, pendingCard, pendingPlay, pendingHome, answerPending, Math.floor(now / 500)]);
  const timeLeft = state.advanceAt === null ? null : Math.max(0, Math.ceil((state.advanceAt - now) / 1000));
  const send = room.send;

  // A deck picked on the queue screen rides along in sessionStorage: submit it once and let the match start.
  const queueDeckSent = useRef(false);
  useEffect(() => {
    if (view.phase !== 'loadout' || view.loadoutIn.you || queueDeckSent.current) return;
    try {
      const raw = sessionStorage.getItem('zone-queue-deck');
      if (!raw) return;
      sessionStorage.removeItem('zone-queue-deck');
      // The deck is bound to the match it was picked for: a stale leftover must not auto-submit in a later room.
      const saved = JSON.parse(raw) as { matchId?: string; cards?: CardId[] };
      if (saved.matchId === snapshot.matchId && Array.isArray(saved.cards) && saved.cards.length > 0) {
        queueDeckSent.current = true;
        send({ type: 'loadout', cards: saved.cards.slice(0, 3) });
      }
    } catch { /* an unreadable saved deck: the picker stands in */ }
  }, [view.phase, view.loadoutIn.you, send, snapshot.matchId]);

  if (view.phase === 'loadout') {
    const secondsLeft = Math.max(0, Math.ceil((view.deadline - now) / 1000));
    const loadoutInYou = view.loadoutIn.you || (pendingLoadout !== null && now - pendingLoadout < OPTIMISTIC_MS);
    return (
      <ScreenFrame wide>
        <div className="flex min-h-[calc(100dvh-1.5rem)] flex-col gap-3" data-zm-room="loadout">
          {loadoutInYou ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <div className="text-2xl uppercase text-white" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800 }}>
                {view.loadoutIn.them ? 'Kick-off!' : `Waiting for ${seats.opponent.name}…`}
              </div>
              <div className="text-sm text-white/60">Their playstyles are revealed at the showdown · {secondsLeft}s</div>
            </div>
          ) : (
            <PlaystylePicker
              seat={seats.player}
              deck={deck}
              onDeckChange={setDeck}
              loading={false}
              onFindMatch={() => {
                setPendingLoadout(now);
                send({ type: 'loadout', cards: deck });
              }}
              steps={<LoadoutSteps ready={deck.length > 0} />}
              rules={<RuleChips />}
            />
          )}
        </div>
      </ScreenFrame>
    );
  }

  let body = null;
  if (state.stage === 'showdown' || state.stage === 'idle') {
    body = (
      <ShowdownScreen
        playerUsername={seats.player.name}
        playerAvatar=""
        opponentUsername={seats.opponent.name}
        opponentAvatar=""
        matchType="ranked"
        onComplete={() => {}}
        renderCharacter={showdownFullBody}
        playerInfo={{ username: seats.player.name, avatar: '', avatarCustomization: seats.player.avatarCustomization, tier: tierFromRp(0) }}
        opponentInfo={{ username: seats.opponent.name, avatar: '', avatarCustomization: seats.opponent.avatarCustomization, tier: tierFromRp(0) }}
      />
    );
  } else if (state.stage === 'deckReveal') {
    body = (
      <ScreenFrame wide>
        <DeckReveal decks={state.deck} seats={seats} timeLeft={timeLeft} />
      </ScreenFrame>
    );
  } else if (state.stage === 'categories') {
    body = (
      <ScreenFrame wide>
        <CategoriesReveal categories={state.categories} seats={seats} timeLeft={timeLeft} />
      </ScreenFrame>
    );
  } else if (state.stage === 'lineup') {
    body = (
      <ScreenFrame wide>
        <CoinToss kickoff={state.kickoff} seats={seats} timeLeft={timeLeft} />
      </ScreenFrame>
    );
  } else if (state.stage === 'shootout') {
    body = (
      <ZoneMatchShootout
        state={state}
        now={now}
        player={seats.player}
        opponent={seats.opponent}
        onQuit={() => room.leave()}
        onAnswer={(index, questionId) => {
          if (state.mcq?.question.id !== questionId || answerPending || state.mcq.hidden.player.includes(index)) return;
          setPendingAnswer({ key: state.mcq.key, index, at: now });
          send({ type: 'answer', key: state.mcq.key, index });
        }}
      />
    );
  } else if (state.stage === 'play') {
    body = (
      <ZoneMatchStage
        state={state}
        now={now}
        player={seats.player}
        opponent={seats.opponent}
        muted={false}
        onToggleMute={() => {}}
        onQuit={() => room.leave()}
        onAnswer={(index, questionId) => {
          // A second tap while the first is in flight is ignored (the server may already have locked the first);
          // a Second Ball retry, or an unconfirmed tap past the window, goes through.
          if (state.mcq?.question.id !== questionId || answerPending || state.mcq.hidden.player.includes(index)) return;
          setPendingAnswer({ key: state.mcq.key, index, at: now });
          send({ type: 'answer', key: state.mcq.key, index });
        }}
        onGuess={(value) => {
          if (!state.numeric || state.numeric.guesses.player.value !== null) return;
          setPendingGuess({ key: state.numeric.key, value, at: now });
          send({ type: 'guess', key: state.numeric.key, value });
        }}
        onChooseCard={(card) => {
          if (state.choice.player !== undefined) return;
          setPendingCard({ duel: state.duelNo, card, at: now });
          send({ type: 'card', duel: state.duelNo, card });
        }}
        onLiveCard={(card) => {
          if (!state.mcq || state.played.player.length > 0) return;
          setPendingPlay({ duel: state.duelNo, card, at: now });
          send({ type: 'live', duel: state.duelNo, key: state.mcq.key, card });
        }}
        onReaction={(card) => {
          if (state.played.player.length > 0) return;
          setPendingPlay({ duel: state.duelNo, card, at: now });
          send({ type: 'reaction', duel: state.duelNo, card });
        }}
        onHomeCategory={(categoryId) => {
          setPendingHome({ duel: state.duelNo, id: categoryId, at: now });
          send({ type: 'home', duel: state.duelNo, categoryId });
        }}
        onPickCategory={(categoryId) => {
          // One pick per round: the connection keeps the FIRST command for this round, so a second tap inside the
          // optimistic window must not re-gray a different tile the server will never receive.
          if (state.usedCategories.player.includes(categoryId)) return;
          if (pendingCategory?.round === state.round && now - pendingCategory.at < OPTIMISTIC_MS) return;
          setPendingCategory({ round: state.round, id: categoryId, at: now });
          send({ type: 'category', round: state.round, categoryId });
        }}
      />
    );
  }
  return (
    <div className="min-h-dvh bg-surface-page text-white" data-zm-stage={state.stage} data-zm-step={state.battleStep}>
      {body}
      <PhaseCurtain state={state} />
    </div>
  );
}

function Results({ view, snapshot, onRoom, onExit }: { view: ZoneMatchServerView; snapshot: RoomStatePayload; onRoom: () => void; onExit: () => void }) {
  const seats = seatsOf(snapshot, view.you);
  const verdict = view.end ? { winner: view.end.winner === 'you' ? ('player' as const) : view.end.winner === 'them' ? ('opponent' as const) : null, reason: view.end.reason } : undefined;
  return <FullTime state={view.match} player={seats.player} opponent={seats.opponent} onPlayAgain={onRoom} onChangeDeck={onExit} verdict={verdict} />;
}

export const zoneMatchScreens: RoomGameScreens<ZoneMatchServerView, ZoneMatchCommand> = {
  brand: () => ['Ranked 2.0', 'Beta'] as const,
  Board: ({ view, snapshot, room }) => <Board view={view} snapshot={snapshot} room={room} />,
  Results: (props) => <Results {...props} />,
  wide: () => true,
};
