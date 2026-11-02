'use client';

/**
 * Zone match prototype — the whole ranked flow against a scripted opponent, no backend:
 *
 *   loadout (3 playstyles) → search → showdown → playstyles reveal → 5 random categories each → kick-off
 *   → 10 rounds, one continuous match (5 attacks each, in turn; the attacker picks one of their categories per
 *     attack; energy is only the loadout budget, spent before the search)
 *   → full time
 *
 * Rules: `zoneMatch.rules.ts` (zones), `zoneMatch.cards.ts` (cards), `zoneMatch.machine.ts` (flow). The screens are the
 * live ranked match's: ShowdownScreen, NumericDraftView, KickoffCountdownOverlay, the possession viewport/HUD/pitch/
 * question panel (ZoneMatchStage) and the results hero. Multiple-choice questions come from the
 * drafted categories via the questions API, with the training/demo questions as a fallback.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { FastForward, FlaskConical, RefreshCw, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAllCategoriesList } from '@/lib/queries/categories.queries';
import { getQuestionsListQuery } from '@/lib/queries/questions.queries';
import { isMuted as readMuted, playSfx, stopBgm, toggleMute } from '@/lib/sounds/gameSounds';
import type { GameQuestion } from '@/lib/domain';
import type { Locale } from '@/lib/i18n/locale-config';
import type { AvatarCustomization } from '@/types/game';
import { tierFromRp } from '@/utils/rankedTier';
import { TRAINING_PENALTY_QUESTIONS, TRAINING_QUESTIONS, localizeTrainingQuestion } from '@/features/training/data/trainingQuestions';
import { getDemoGameQuestions } from '@/features/demos/data/demoQuestions';
import { ShowdownScreen } from '@/components/ShowdownScreen';
import { MatchmakingMapScreen } from '@/components/match/MatchmakingMapScreen';
import type { OpponentInfo } from '@/lib/realtime/socket.types';
import { KickoffCountdownOverlay } from '@/features/possession/components/KickoffCountdownOverlay';
import { ResultsHero } from '@/features/game/results/ResultsHero';
import { MatchStatsDropdown } from '@/features/game/results/ResultsStatsPanel';
import type { DuelSide } from '@/features/numeric-question/numericDuel';
import type { SampleNumericQuestion } from '@/features/numeric-question/sampleNumericQuestions';
import { CARD_BY_ID, FLOODLIGHT_MS, deckBlocker, randomDeck, type CardId } from './zoneMatch.cards';
import {
  CATEGORY_COUNT,
  IDLE,
  cardBlocker,
  reactionBlocker,
  reducer,
  revealedCard,
  sabotageOn,
  type CardWindowMode,
  type Category,
  type Content,
  type MatchState,
  type Mcq,
  unusedCategories,
} from './zoneMatch.machine';
import { DeckReveal } from './ZoneMatchCards';
import { DeckPicker } from './ZoneMatchLoadout';
import { LAB_TOUR, LabBar, LabPicker, labDuelAction, useLabDriver, type LabRun, type LabSetup } from './ZoneMatchCardLab';
import { PhaseCurtain } from './ZoneMatchCurtain';
import { CategoriesReveal, KickoffBoard } from './ZoneMatchCategories';
import { ZoneMatchStage, type ZoneMatchSeat } from './ZoneMatchStage';

const MCQ_FETCH_LIMIT = 30;
/** A category reaches the draft board only with this many playable ranked MCQs (a round can take several duels). */
const MIN_CATEGORY_MCQS = 6;
/** Stop checking once this many categories qualify — plenty for two different 12-card boards. */
const CHECKED_POOL_TARGET = 36;
const CHECK_BATCH = 8;
/** How long the scripted search takes to find someone, then the live "match found" hold before the showdown. */
const SEARCH_MS: [number, number] = [3500, 6000];
const MATCH_FOUND_HOLD_MS = 2000;
const KICKOFF_COUNTDOWN_S = 3;
/** The profile has no country; the prototype flags the player as Georgian. */
const PLAYER_COUNTRY = 'ge';

// ── Scripted opponent ────────────────────────────────────────────────────────

type Skill = 'sharp' | 'average' | 'wild';

const SKILLS: Record<Skill, { label: string; mcq: number; error: [number, number]; delayMs: [number, number]; noAnswer: number }> = {
  sharp: { label: 'Sharp', mcq: 0.85, error: [0, 0.08], delayMs: [1500, 4500], noAnswer: 0 },
  average: { label: 'Average', mcq: 0.65, error: [0.05, 0.3], delayMs: [2500, 7000], noAnswer: 0.05 },
  wild: { label: 'Wild', mcq: 0.45, error: [0.2, 0.7], delayMs: [3500, 10000], noAnswer: 0.15 },
};

const OPPONENT_CUSTOMIZATION: AvatarCustomization = { skin: 'skin_male_dark', jersey: 'jersey_red', hair: 'hair_boy_basic' };
const OPPONENT_NAME = 'rustaveli99';
const FALLBACK_PLAYER_CUSTOMIZATION: AvatarCustomization = { skin: 'skin_male_white', jersey: 'jersey_green', hair: 'hair_boy_basic' };

const between = ([lo, hi]: [number, number]) => lo + Math.random() * (hi - lo);
const pickOne = <T,>(items: readonly T[]): T | undefined => items[Math.floor(Math.random() * items.length)];

function scriptedGuess(question: SampleNumericQuestion, skill: Skill): { value: number | null; delayMs: number } {
  const profile = SKILLS[skill];
  const delayMs = between(profile.delayMs);
  if (Math.random() < profile.noAnswer) return { value: null, delayMs };
  const off = question.value * between(profile.error) * (Math.random() < 0.5 ? -1 : 1);
  return { value: Math.max(0, Math.round((question.value + off) / question.step) * question.step), delayMs };
}

/** The scripted opponent's answer, after the sabotage it is under and its own 50/50. */
function scriptedAnswer(state: MatchState, mcq: Mcq, skill: Skill): number {
  const sabotage = sabotageOn(state, 'opponent');
  let accuracy = SKILLS[skill].mcq;
  if (sabotage.includes('floodlight-failure')) accuracy -= 0.05;
  if (sabotage.includes('muddy-pitch')) accuracy -= 0.08;
  if (mcq.hidden.opponent.length > 0) accuracy += 0.2;
  const { correctIndex, options } = mcq.question;
  if (Math.random() < accuracy && mcq.firstMiss.opponent !== correctIndex) return correctIndex;
  const wrong = options
    .map((_, i) => i)
    .filter((i) => i !== correctIndex && !mcq.hidden.opponent.includes(i) && i !== mcq.firstMiss.opponent);
  return pickOne(wrong) ?? correctIndex;
}

/** A blind card the scripted opponent plays now, or null. Reads the situation a little, otherwise picks at random. */
function scriptedBlindCard(state: MatchState): CardId | null {
  const usable = state.deck.opponent.filter((id) => cardBlocker(state, 'opponent', id, 'blind') === null);
  if (usable.length === 0 || Math.random() > 0.55) return null;
  const attacking = state.possession.attacker === 'opponent';
  const shotComing = !attacking && state.possession.zone === 'opponent';
  const prefer: CardId[] = shotComing
    ? ['goalkeeper-gloves', 'park-the-bus', 'offside-trap']
    : attacking && state.possession.zone === 'opponent'
      ? ['golden-boot']
      : attacking
        ? ['captains-armband', 'tiki-taka', 'long-ball']
        : ['counter-attack', 'offside-trap'];
  return prefer.find((id) => usable.includes(id)) ?? pickOne(usable) ?? null;
}

// ── Component ────────────────────────────────────────────────────────────────

const FALLBACK_CATEGORIES: Category[] = [
  ['Premier League', '🦁'], ['La Liga', '🇪🇸'], ['Serie A', '🇮🇹'], ['Bundesliga', '🇩🇪'], ['Ligue 1', '🇫🇷'],
  ['Champions League', '🏆'], ['World Cup', '🌍'], ['Euros', '🇪🇺'], ['Transfers', '💸'], ['Legends', '👑'],
  ['Goalkeepers', '🧤'], ['Stadiums', '🏟️'], ['Managers', '📋'], ['Derbies', '⚔️'], ['Ballon d’Or', '🥇'],
  ['Kits', '👕'], ['Records', '📈'], ['Copa América', '🌎'], ['Wonderkids', '⭐'], ['Finals', '🎯'],
  ['Strikers', '⚽'], ['Defenders', '🛡️'], ['Captains', '©️'], ['Nicknames', '🏷️'],
].map(([name, icon], i) => ({ id: `demo-${i}`, name, icon, imageUrl: null }));

export function ZoneMatchPrototype() {
  const { locale } = useLocale();
  const { player: profile } = usePlayer();
  // min_questions drops non-quiz and campaign-only categories; ranked question pools are checked below.
  const { data: categoriesData, isPending } = useAllCategoriesList({ min_questions: 1, is_active: 'true' });
  const [skill, setSkill] = useState<Skill>('average');
  // Playtesting: with timers off nothing moves on by itself; the Next button (or both sides acting) does.
  // Kept in localStorage so it survives a reload; the server render always has timers on.
  const timersOff = useSyncExternalStore(subscribeTimersOff, readTimersOff, () => false);
  // Playtest: with cards only at a round's start, live and shot cards went unused — one card per duel instead.
  const [windowMode, setWindowMode] = useState<CardWindowMode>('question');
  const [screen, setScreen] = useState<'deck' | 'search' | 'match'>('deck');
  const [search, setSearch] = useState<{ startedAt: number; found: boolean } | null>(null);
  const [myDeck, setMyDeck] = useState<CardId[]>([]);
  const [muted, setMuted] = useState(() => readMuted());
  const [state, dispatch] = useReducer(reducer, IDLE);
  const [now, setNow] = useState(() => Date.now());
  // Card Lab (dev): a staged duel around one card, played by the lab instead of the scripted opponent.
  const [lab, setLab] = useState<LabRun | null>(null);
  const [labPicker, setLabPicker] = useState<{ card: CardId | null } | null>(null);
  const scripted = lab === null;
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const playerRp = profile.rankPoints ?? 1200;
  const playerSeat: ZoneMatchSeat = useMemo(
    () => ({ name: profile.username || 'You', avatarCustomization: profile.avatarCustomization ?? FALLBACK_PLAYER_CUSTOMIZATION, rankPoints: playerRp }),
    [profile.avatarCustomization, profile.username, playerRp],
  );
  const opponentSeat: ZoneMatchSeat = useMemo(
    () => ({ name: OPPONENT_NAME, avatarCustomization: OPPONENT_CUSTOMIZATION, rankPoints: Math.max(0, playerRp - 40) }),
    [playerRp],
  );

  const queryClient = useQueryClient();
  const candidates = useMemo<Category[]>(
    () =>
      (categoriesData?.items ?? [])
        .filter((c) => c.imageUrl)
        .map((c) => ({ id: c.id, name: c.name, imageUrl: c.imageUrl ?? null, icon: c.icon ?? null })),
    [categoriesData],
  );

  // Only categories that really have ranked questions reach the board: a drafted category with an empty pool used to
  // serve general questions under its name. Checked in the background; the fetched pools stay cached for the match.
  const [checked, setChecked] = useState<{ pool: Category[] } | null>(null);
  useEffect(() => {
    if (candidates.length === 0) return;
    let cancelled = false;
    void (async () => {
      const order = [...candidates].sort(() => Math.random() - 0.5);
      const pool: Category[] = [];
      for (let i = 0; i < order.length && pool.length < CHECKED_POOL_TARGET; i += CHECK_BATCH) {
        const batch = order.slice(i, i + CHECK_BATCH);
        const counts = await Promise.all(
          batch.map((category) =>
            queryClient
              .fetchQuery({ ...categoryQuestionsQuery(category.id, locale), staleTime: Infinity, retry: false })
              .then((data) => data.items.filter(isPlayableMcq).length, () => 0),
          ),
        );
        if (cancelled) return;
        batch.forEach((category, j) => {
          if (counts[j] >= MIN_CATEGORY_MCQS) pool.push(category);
        });
      }
      if (!cancelled) setChecked({ pool });
    })();
    return () => {
      cancelled = true;
    };
  }, [candidates, locale, queryClient]);

  /** null while the check runs; the sample categories when the API has nothing usable (e.g. signed out). */
  const categoryPool = useMemo<Category[] | null>(() => {
    if (!checked) return candidates.length === 0 && !isPending ? FALLBACK_CATEGORIES : null;
    return checked.pool.length >= CATEGORY_COUNT * 2 ? checked.pool : FALLBACK_CATEGORIES;
  }, [candidates.length, checked, isPending]);

  // Every way out of a match also leaves the Card Lab, so the next real match gets its scripted opponent back.
  const findMatch = useCallback(() => {
    setLab(null);
    dispatch({ type: 'RESET' });
    setSearch({ startedAt: Date.now(), found: false });
    setScreen('search');
  }, []);

  const startMatch = useCallback(() => {
    stopBgm(300);
    setScreen('match');
    dispatch({ type: 'RESTART', categoryPool: categoryPool ?? FALLBACK_CATEGORIES, decks: { player: myDeck, opponent: randomDeck() }, windowMode, now: Date.now() });
  }, [categoryPool, myDeck, windowMode]);

  const toDeck = useCallback(() => {
    stopBgm(300);
    setLab(null);
    dispatch({ type: 'RESET' });
    setSearch(null);
    setScreen('deck');
  }, []);

  // The scripted queue: someone turns up after a few seconds (and once the category check is done), then the live
  // "match found" hold.
  const searchFound = search?.found ?? null;
  const searchStartedAt = search?.startedAt ?? null;
  const poolReady = categoryPool !== null;
  useEffect(() => {
    if (screen !== 'search' || searchFound === null || searchStartedAt === null) return;
    if (searchFound) {
      const id = window.setTimeout(startMatch, MATCH_FOUND_HOLD_MS);
      return () => window.clearTimeout(id);
    }
    if (!poolReady) return;
    const wait = Math.max(0, searchStartedAt + between(SEARCH_MS) - Date.now());
    const id = window.setTimeout(() => setSearch((s) => (s ? { ...s, found: true } : s)), wait);
    return () => window.clearTimeout(id);
  }, [screen, searchFound, searchStartedAt, poolReady, startMatch]);

  const toggleDeckCard = useCallback((id: CardId) => {
    setMyDeck((deck) => (deck.includes(id) ? deck.filter((c) => c !== id) : deckBlocker(deck, id) === null ? [...deck, id] : deck));
  }, []);

  const changeWindowMode = useCallback((mode: CardWindowMode) => {
    setWindowMode(mode);
    dispatch({ type: 'SET_WINDOW_MODE', windowMode: mode });
  }, []);

  const onToggleMute = useCallback(() => setMuted(toggleMute()), []);

  // Questions for both sides' categories (already cached by the pool check).
  const matchCategories = useMemo(() => [...state.categories.player, ...state.categories.opponent], [state.categories]);
  const questionQueries = useQueries({
    queries: matchCategories.map((category) => ({ ...categoryQuestionsQuery(category.id, locale), staleTime: Infinity, retry: false })),
  });
  const content = useMemo<Content>(() => {
    const mcqByCategory: Record<string, GameQuestion[]> = {};
    matchCategories.forEach((category, i) => {
      mcqByCategory[category.id] = (questionQueries[i]?.data?.items ?? []).filter(isPlayableMcq);
    });
    const fallbackMcqs = [
      ...[...TRAINING_QUESTIONS, ...TRAINING_PENALTY_QUESTIONS].map((q) => localizeTrainingQuestion(q, locale)),
      ...getDemoGameQuestions(locale as Locale),
    ];
    return { mcqByCategory, fallbackMcqs };
  }, [locale, questionQueries, matchCategories]);
  const contentRef = useRef(content);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // The clock that drives every timed transition (a lab duel holds on its result; dev "timers off" holds everything).
  const labHold = !scripted && state.battleStep === 'outcome';
  useEffect(() => {
    if (state.advanceAt === null || labHold || timersOff) return;
    const id = window.setTimeout(
      () => dispatch({ type: 'ADVANCE', content: contentRef.current, now: Date.now() }),
      Math.max(0, state.advanceAt - Date.now()),
    );
    return () => window.clearTimeout(id);
  }, [state.advanceAt, state.seq, labHold, timersOff]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  // ── Sounds (the live match's cues) ──

  const stageKey = screen === 'match' ? state.stage : screen;
  useEffect(() => {
    if (stageKey === 'play') {
      // The kickoff countdown's music hands over to the whistle.
      stopBgm(300);
      playSfx('whistle');
    } else if (stageKey === 'fulltime') {
      playSfx('whistle');
      stopBgm(300);
    }
  }, [stageKey]);
  useEffect(() => () => stopBgm(0), []);

  const answerRevealKey = state.battleStep === 'mcqReveal' ? state.duelNo : null;
  useEffect(() => {
    if (answerRevealKey === null) return;
    const mcq = stateRef.current.mcq;
    if (!mcq || mcq.answers.player === null) return;
    playSfx(mcq.answers.player === mcq.question.correctIndex ? 'correctRanked' : 'wrongAnswer');
  }, [answerRevealKey]);

  const outcomeKey = state.battleStep === 'outcome' && state.outcome ? state.duelNo : null;
  useEffect(() => {
    if (outcomeKey === null) return;
    playSfx(stateRef.current.outcome?.kind === 'goal' ? 'kick' : 'pass');
  }, [outcomeKey]);

  // ── Scripted opponent (decisions read the latest state when their timer fires) ──

  const openNumericKey = scripted && state.numeric && !state.numeric.result && state.numeric.guesses.opponent.value === null ? state.numeric.key : null;
  useEffect(() => {
    if (openNumericKey === null) return;
    const s = stateRef.current;
    const question = s.numeric?.question;
    if (!question) return;
    const { value, delayMs } = scriptedGuess(question, skill);
    if (value === null) return;
    // A Floodlight Failure carries into the number tiebreak: the first seconds are dark for them too.
    const dark = s.stage === 'play' && sabotageOn(s, 'opponent').includes('floodlight-failure') ? FLOODLIGHT_MS : 0;
    const id = window.setTimeout(() => dispatch({ type: 'GUESS', side: 'opponent', value, now: Date.now() }), delayMs + dark);
    return () => window.clearTimeout(id);
  }, [openNumericKey, skill]);

  const openMcqKey = scripted && state.battleStep === 'mcq' && state.mcq && state.mcq.answers.opponent === null
    ? `${state.mcq.key}-${state.mcq.firstMiss.opponent}`
    : null;
  useEffect(() => {
    if (openMcqKey === null) return;
    const s = stateRef.current;
    const timers: number[] = [];
    // A Second Ball retry re-arms this effect; only the first look at a question may open with a live card.
    const retry = !openMcqKey.endsWith('-null');
    if (!retry) {
      const live = (['fifty-fifty', 'first-touch'] as CardId[]).find((id) => cardBlocker(s, 'opponent', id, 'live') === null);
      if (live && Math.random() < (live === 'fifty-fifty' ? 0.4 : 0.25)) {
        timers.push(window.setTimeout(() => dispatch({ type: 'PLAY_LIVE', side: 'opponent', card: live, content: contentRef.current, now: Date.now() }), 700));
      }
    }
    const sabotage = sabotageOn(s, 'opponent');
    let delay = between(SKILLS[skill].delayMs) + (retry ? 1200 : 0);
    if (sabotage.includes('floodlight-failure')) delay += FLOODLIGHT_MS;
    if (sabotage.includes('fog')) delay += 900;
    const deadline = s.mcq?.deadline ?? Date.now() + delay;
    delay = Math.min(delay, Math.max(300, deadline - Date.now() - 300));
    timers.push(
      window.setTimeout(() => {
        const latest = stateRef.current;
        if (!latest.mcq || latest.battleStep !== 'mcq') return;
        dispatch({ type: 'ANSWER', side: 'opponent', index: scriptedAnswer(latest, latest.mcq, skill), now: Date.now() });
      }, delay),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [openMcqKey, skill]);

  // Their attack: they pick one of their categories after a moment.
  const opponentCategoryKey = scripted && state.stage === 'play' && state.battleStep === 'category' && state.possession.attacker === 'opponent' ? state.round : null;
  useEffect(() => {
    if (opponentCategoryKey === null) return;
    const id = window.setTimeout(() => {
      const s = stateRef.current;
      const choice = pickOne(unusedCategories(s, 'opponent'));
      if (choice) dispatch({ type: 'PICK_CATEGORY', side: 'opponent', categoryId: choice.id, content: contentRef.current, now: Date.now() });
    }, 1000 + Math.random() * 1000);
    return () => window.clearTimeout(id);
  }, [opponentCategoryKey]);

  const opponentCardKey = scripted && state.battleStep === 'cards' && state.choice.opponent === undefined ? state.duelNo : null;
  useEffect(() => {
    if (opponentCardKey === null) return;
    const id = window.setTimeout(
      () => dispatch({ type: 'CHOOSE_CARD', side: 'opponent', card: scriptedBlindCard(stateRef.current), now: Date.now() }),
      1000 + Math.random() * 2000,
    );
    return () => window.clearTimeout(id);
  }, [opponentCardKey]);

  const opponentReactionKey = scripted && state.battleStep === 'reveal' && state.choice.player && !state.cancelled.player ? state.duelNo : null;
  useEffect(() => {
    if (opponentReactionKey === null) return;
    const s = stateRef.current;
    const seen = revealedCard(s, 'player');
    const threat = seen ? CARD_BY_ID[seen].type === 'sabotage' : false;
    // Shin Pads answers sabotage cheaply; VAR is kept for the cards that hurt most.
    const card: CardId | null =
      reactionBlocker(s, 'opponent', 'shin-pads') === null && Math.random() < 0.75
        ? 'shin-pads'
        : reactionBlocker(s, 'opponent', 'var-review') === null && Math.random() < (threat ? 0.7 : 0.35)
          ? 'var-review'
          : null;
    if (!card) return;
    const id = window.setTimeout(() => dispatch({ type: 'PLAY_REACTION', side: 'opponent', card, now: Date.now() }), 900 + Math.random() * 700);
    return () => window.clearTimeout(id);
  }, [opponentReactionKey]);

  useLabDriver(lab, state, stateRef, contentRef, dispatch);

  const startLab = useCallback(
    (setup: LabSetup, tourIndex?: number) => {
      stopBgm(300);
      setLabPicker(null);
      setSearch(null);
      setScreen('match');
      setLab({ card: setup.card, owner: setup.owner, situation: setup.situation, ownerAnswer: setup.ownerAnswer, otherAnswer: setup.otherAnswer, runId: Date.now(), tourIndex });
      dispatch(labDuelAction(setup, categoryPool ?? FALLBACK_CATEGORIES, contentRef.current));
    },
    [categoryPool],
  );
  const exitLab = useCallback(() => {
    setLabPicker(null);
    toDeck();
  }, [toDeck]);

  // ── Render ──

  const timeLeft = state.advanceAt === null ? null : Math.max(0, Math.ceil((state.advanceAt - now) / 1000));
  const foundOpponent: OpponentInfo = useMemo(
    () => ({
      id: 'zone-match-bot',
      username: OPPONENT_NAME,
      avatarUrl: null,
      avatarCustomization: OPPONENT_CUSTOMIZATION,
      isAiOpponent: true,
      rp: opponentSeat.rankPoints ?? undefined,
      country: 'United States',
      countryCode: 'US',
      city: 'New York',
      lat: 40.71,
      lon: -74.01,
      recentForm: ['W', 'L', 'W'],
    }),
    [opponentSeat.rankPoints],
  );
  const noop = useCallback(() => {}, []);

  let body: ReactNode = null;
  if (screen === 'deck') {
    body = (
      <ScreenFrame wide>
        <DeckPicker
          deck={myDeck}
          seat={playerSeat}
          loading={isPending}
          onToggle={toggleDeckCard}
          onRandom={() => setMyDeck(randomDeck())}
          onFindMatch={findMatch}
        />
      </ScreenFrame>
    );
  } else if (state.stage === 'deckReveal') {
    body = (
      <ScreenFrame wide>
        <DeckReveal
          decks={state.deck}
          seats={{ player: playerSeat, opponent: opponentSeat }}
          timeLeft={timeLeft}
          onReady={() => {
            // The scripted opponent is always ready; only the reveal itself may be skipped.
            if (stateRef.current.stage === 'deckReveal') dispatch({ type: 'ADVANCE', content: contentRef.current, now: Date.now() });
          }}
        />
      </ScreenFrame>
    );
  } else if (screen === 'search' && search) {
    body = (
      <MatchmakingMapScreen
        matchType="ranked"
        rankedSearchStartedAt={search.startedAt}
        rankedFoundOpponent={search.found ? foundOpponent : null}
        selfUsername={playerSeat.name}
        selfAvatarCustomization={playerSeat.avatarCustomization}
        onCancel={toDeck}
        onRestart={findMatch}
      />
    );
  } else if (state.stage === 'showdown') {
    body = (
      <ShowdownScreen
        playerUsername={playerSeat.name}
        playerAvatar=""
        opponentUsername={opponentSeat.name}
        opponentAvatar=""
        matchType="ranked"
        onComplete={noop}
        playerInfo={{
          username: playerSeat.name,
          avatar: '',
          avatarCustomization: playerSeat.avatarCustomization,
          rankPoints: playerSeat.rankPoints ?? undefined,
          tier: tierFromRp(playerSeat.rankPoints ?? 0),
          countryCode: PLAYER_COUNTRY,
        }}
        opponentInfo={{
          username: opponentSeat.name,
          avatar: '',
          avatarCustomization: opponentSeat.avatarCustomization,
          rankPoints: opponentSeat.rankPoints ?? undefined,
          tier: tierFromRp(opponentSeat.rankPoints ?? 0),
          countryCode: 'us',
          recentForm: ['W', 'L', 'W'],
          isAi: true,
        }}
      />
    );
  } else if (state.stage === 'categories') {
    body = (
      <ScreenFrame wide>
        <CategoriesReveal
          categories={state.categories}
          seats={{ player: playerSeat, opponent: opponentSeat }}
          timeLeft={timeLeft}
          onReady={() => {
            if (stateRef.current.stage === 'categories') dispatch({ type: 'ADVANCE', content: contentRef.current, now: Date.now() });
          }}
        />
      </ScreenFrame>
    );
  } else if (state.stage === 'lineup') {
    body = (
      <>
        <ScreenFrame wide>
          <KickoffBoard kickoff={state.kickoff} seats={{ player: playerSeat, opponent: opponentSeat }} />
        </ScreenFrame>
        {timeLeft !== null && timeLeft <= KICKOFF_COUNTDOWN_S && (
          // Its own dark backdrop, over the kick-off board.
          <div className="fixed inset-0 z-[90] bg-surface-page/90 backdrop-blur-md">
            <KickoffCountdownOverlay
              countdownDisplay={Math.max(1, timeLeft)}
              durationMs={KICKOFF_COUNTDOWN_S * 1000}
              runKey={1}
              playerName={playerSeat.name}
              opponentName={opponentSeat.name}
              playerAvatarCustomization={playerSeat.avatarCustomization}
              opponentAvatarCustomization={opponentSeat.avatarCustomization}
              playerRankPoints={playerSeat.rankPoints}
              opponentRankPoints={opponentSeat.rankPoints}
            />
          </div>
        )}
      </>
    );
  } else if (state.stage === 'play') {
    body = (
      <ZoneMatchStage
        key={lab ? lab.runId : 'match'}
        state={state}
        now={now}
        player={playerSeat}
        opponent={opponentSeat}
        muted={muted}
        onToggleMute={onToggleMute}
        onQuit={toDeck}
        onAnswer={(index, questionId) => dispatch({ type: 'ANSWER', side: 'player', index, questionId, now: Date.now() })}
        onGuess={(value) => dispatch({ type: 'GUESS', side: 'player', value, now: Date.now() })}
        onChooseCard={(card) => dispatch({ type: 'CHOOSE_CARD', side: 'player', card, now: Date.now() })}
        onLiveCard={(card) => dispatch({ type: 'PLAY_LIVE', side: 'player', card, content: contentRef.current, now: Date.now() })}
        onReaction={(card) => dispatch({ type: 'PLAY_REACTION', side: 'player', card, now: Date.now() })}
        onHomeCategory={(categoryId) => dispatch({ type: 'CHOOSE_HOME_CATEGORY', categoryId })}
        onPickCategory={(categoryId) => dispatch({ type: 'PICK_CATEGORY', side: 'player', categoryId, content: contentRef.current, now: Date.now() })}
      />
    );
  } else if (state.stage === 'fulltime') {
    body = <FullTime state={state} player={playerSeat} opponent={opponentSeat} onPlayAgain={findMatch} onChangeDeck={toDeck} />;
  }

  return (
    <div className="min-h-dvh bg-surface-page text-white" data-zm-stage={screen === 'match' ? state.stage : screen} data-zm-step={state.battleStep}>
      {body}
      <DevPanel
        skill={skill}
        onSkill={setSkill}
        windowMode={windowMode}
        onWindowMode={changeWindowMode}
        feed={screen === 'match' ? state.feed : []}
        onNewMatch={toDeck}
        onSkip={screen === 'match' && state.advanceAt !== null ? () => dispatch({ type: 'ADVANCE', content: contentRef.current, now: Date.now() }) : null}
        timersOff={timersOff}
        onTimersOff={writeTimersOff}
        onCardLab={() => setLabPicker({ card: lab?.card ?? null })}
      />
      {screen === 'match' && !lab && <PhaseCurtain state={state} />}
      {lab && screen === 'match' && state.stage === 'play' && (
        <LabBar
          lab={lab}
          settled={state.battleStep === 'outcome'}
          onReplay={() => startLab(lab, lab.tourIndex)}
          onPick={() => setLabPicker({ card: lab.card })}
          onExit={exitLab}
          onStep={(index) => startLab(LAB_TOUR[index], index)}
        />
      )}
      {labPicker && (
        <LabPicker
          initial={labPicker.card}
          onPlay={(setup) => startLab(setup)}
          onTour={() => startLab(LAB_TOUR[0], 0)}
          onClose={() => setLabPicker(null)}
        />
      )}
    </div>
  );
}

/** Full-screen page frame on the live match background, for the card screens. */
function ScreenFrame({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat pb-12 text-white">
      <div className={cn('mx-auto w-full px-4 pt-6', wide ? 'max-w-5xl' : 'max-w-2xl')}>{children}</div>
    </div>
  );
}

/** The ranked MCQs of one category, as the player question list returns them (one cache entry per category). */
function categoryQuestionsQuery(categoryId: string, locale: string) {
  return getQuestionsListQuery({ category_id: categoryId, status: 'published', type: 'mcq_single', page: 1, limit: MCQ_FETCH_LIMIT }, locale);
}

function isPlayableMcq(question: GameQuestion): boolean {
  return question.options.length === 4 && question.correctIndex >= 0 && question.correctIndex < 4;
}

/** The live results hero + match stats, as the training match uses them. */
function FullTime({
  state,
  player,
  opponent,
  onPlayAgain,
  onChangeDeck,
}: {
  state: MatchState;
  player: ZoneMatchSeat;
  opponent: ZoneMatchSeat;
  onPlayAgain: () => void;
  onChangeDeck: () => void;
}) {
  const { t } = useLocale();
  const { player: mine, opponent: theirs } = state.score;
  const playerWon = mine > theirs;
  const isDraw = mine === theirs;
  const results = (side: DuelSide) => state.answerLog[side];
  const correct = (side: DuelSide) => results(side).filter((r) => r === 'correct').length;
  const total = Math.max(1, results('player').length);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-surface-page-alt p-3 md:p-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat" />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-full max-w-[1280px] space-y-4 font-poppins md:space-y-6">
        <ResultsHero
          playerWon={playerWon}
          isDraw={isDraw}
          isCancelledNoContest={false}
          resultHeading={playerWon ? 'Victory' : isDraw ? 'Draw' : 'Defeat'}
          playerUsername={player.name}
          playerAvatar=""
          playerAvatarCustomization={player.avatarCustomization}
          opponentUsername={opponent.name}
          opponentAvatar=""
          opponentAvatarCustomization={opponent.avatarCustomization}
          opponentId="zone-match-bot"
          playerScore={mine}
          opponentScore={theirs}
          totalGamesLabel={t('results.matchComplete')}
          preMatchRankedProfile={null}
          playerTier={tierFromRp(player.rankPoints ?? 0)}
          playerDisplayRp={player.rankPoints}
          opponentTier={tierFromRp(opponent.rankPoints ?? 0)}
          opponentDisplayRp={opponent.rankPoints}
        />
        <div className="mx-auto flex w-full max-w-[498px] flex-col items-stretch gap-3 pt-2 md:gap-4">
          <MatchStatsDropdown
            accuracy={Math.round((correct('player') / total) * 100)}
            playerCorrect={correct('player')}
            opponentCorrect={correct('opponent')}
            totalQuestions={results('player').length}
            playerScore={mine}
            opponentScore={theirs}
            playerQuestionResults={results('player')}
            opponentQuestionResults={results('opponent')}
            t={t}
          />
          <button
            onClick={onPlayAgain}
            className="flex h-[64px] w-full items-center justify-center rounded-[20px] bg-brand-green font-poppins text-[1.5rem] font-semibold uppercase text-white transition-colors hover:bg-brand-green-deep md:h-[80px] md:text-[28px]"
          >
            {t('results.playAgain')}
          </button>
          <button
            onClick={onChangeDeck}
            className="flex h-[64px] w-full items-center justify-center rounded-[20px] border-[3px] border-brand-green bg-transparent font-poppins text-[1.5rem] font-semibold uppercase text-white transition-colors hover:bg-brand-green/10 md:h-[80px] md:text-[28px]"
          >
            Change deck
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const TIMERS_OFF_KEY = 'zm-dev-timers-off';

let timersOffFallback = false;
const timersOffListeners = new Set<() => void>();

function readTimersOff(): boolean {
  try {
    return window.localStorage.getItem(TIMERS_OFF_KEY) === '1';
  } catch {
    return timersOffFallback;
  }
}

function writeTimersOff(off: boolean) {
  timersOffFallback = off;
  try {
    window.localStorage.setItem(TIMERS_OFF_KEY, off ? '1' : '0');
  } catch {
    // Storage unavailable: the in-memory value lasts for this visit.
  }
  timersOffListeners.forEach((listener) => listener());
}

function subscribeTimersOff(listener: () => void) {
  timersOffListeners.add(listener);
  return () => {
    timersOffListeners.delete(listener);
  };
}

/** Dev controls, folded into one button so they never cover the game. */
function DevPanel({
  skill,
  onSkill,
  windowMode,
  onWindowMode,
  feed,
  onNewMatch,
  onSkip,
  onCardLab,
  timersOff,
  onTimersOff,
}: {
  skill: Skill;
  onSkill: (skill: Skill) => void;
  windowMode: CardWindowMode;
  onWindowMode: (mode: CardWindowMode) => void;
  feed: string[];
  onNewMatch: () => void;
  /** Ends the current timed step now (playtesting); null when nothing is on a timer. */
  onSkip: (() => void) | null;
  onCardLab: () => void;
  timersOff: boolean;
  onTimersOff: (off: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    // Parked over the pitch's left edge: clear of the HUD, the answer grid and the docked hand.
    <div className="fixed left-1 top-[200px] z-[95] flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Dev controls"
        className="inline-flex size-7 items-center justify-center rounded-full bg-black/60 text-white/60 backdrop-blur hover:text-white"
      >
        <Settings2 className={cn('size-3.5 transition', open && 'rotate-90')} />
      </button>
      {/* Timers off: a small Next beside the gear, so it never covers the screen being reviewed. */}
      {timersOff && (
        <button
          type="button"
          onClick={onSkip ?? undefined}
          disabled={!onSkip}
          aria-label="Next step (timers off)"
          title="Timers off — next step"
          className="inline-flex size-7 items-center justify-center rounded-full bg-brand-yellow text-surface-page shadow-lg ring-2 ring-black/40 disabled:opacity-40"
        >
          <FastForward className="size-3.5" />
        </button>
      )}
      {open && (
        <div className="w-72 rounded-2xl bg-black/85 p-3 text-white shadow-2xl backdrop-blur">
          <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-white/50">Opponent</div>
          <div className="mb-3 flex gap-1.5">
            {(Object.keys(SKILLS) as Skill[]).map((value) => (
              <DevChip key={value} active={skill === value} onClick={() => onSkill(value)}>
                {SKILLS[value].label}
              </DevChip>
            ))}
          </div>
          <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-white/50">Timers</div>
          <div className="mb-3 flex gap-1.5">
            <DevChip active={!timersOff} onClick={() => onTimersOff(false)}>On</DevChip>
            <DevChip active={timersOff} onClick={() => onTimersOff(true)}>Off — I press Next</DevChip>
          </div>
          <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-white/50">Cards played</div>
          <div className="mb-3 flex gap-1.5">
            <DevChip active={windowMode === 'question'} onClick={() => onWindowMode('question')}>Every duel</DevChip>
            <DevChip active={windowMode === 'round'} onClick={() => onWindowMode('round')}>Round start</DevChip>
          </div>
          {feed.length > 0 && (
            <>
              <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-white/50">Match log</div>
              <ul className="mb-3 max-h-56 space-y-0.5 overflow-y-auto text-[11px] text-white/75">
                {feed.map((line, i) => (
                  <li key={`${i}-${line}`} className={i === 0 ? 'text-white' : undefined}>
                    {line}
                  </li>
                ))}
              </ul>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCardLab();
            }}
            className="mb-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-yellow px-3 py-2 text-[11px] font-black uppercase tracking-wide text-surface-page hover:bg-brand-yellow/90"
          >
            <FlaskConical className="size-3.5" /> Card Lab
          </button>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="mb-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-white hover:bg-white/20"
            >
              <FastForward className="size-3.5" /> Skip step
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onNewMatch();
            }}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-green px-3 py-2 text-[11px] font-black uppercase tracking-wide text-white hover:bg-brand-green-deep"
          >
            <RefreshCw className="size-3.5" /> New match
          </button>
        </div>
      )}
    </div>
  );
}

function DevChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors',
        active ? 'bg-brand-blue text-white' : 'bg-white/10 text-white/70 hover:bg-white/20',
      )}
    >
      {children}
    </button>
  );
}
