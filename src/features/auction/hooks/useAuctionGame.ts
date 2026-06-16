import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  AuctionGameState,
  AuctionPhase,
  AuctionPlayer,
  AuctionRound,
  Footballer,
  PositionGroup,
} from '../types';
import {
  BOT_PLAYERS,
  FOOTBALLERS,
  STARTING_BUDGET,
  MIN_PLAYER_COST,
  BID_COUNTDOWN_MS,
  CLUE_REVEAL_INTERVAL_MS,
  MIN_BID_INCREMENT,
  createBotPlayer,
  createEmptyTeam,
  getRandomFormation,
  getMaxBid,
  needsPosition,
  isTeamComplete,
  getRemainingSlots,
} from '../data';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface AuctionActions {
  startGame: (playerCount?: number) => void;
  placeBid: (amount: number) => void;
  skipBid: () => void;
  confirmReveal: () => void;
  pickSoloOption: (option: 'A' | 'B') => void;
  setPhase: (phase: AuctionPhase) => void;
}

const HUMAN_PLAYER_ID = 'human-player';

export function useAuctionGame(humanUsername: string, humanAvatarSeed: string) {
  const [state, setState] = useState<AuctionGameState>({
    phase: 'lobby',
    players: [],
    formation: getRandomFormation(),
    currentRound: null,
    roundIndex: 0,
    totalRounds: 0,
    completedRounds: [],
    soloPick: null,
  });

  const poolRef = useRef<Record<PositionGroup, Footballer[]>>({
    GK: [],
    DEF: [],
    MID: [],
    FWD: [],
  });
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clueRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (clueRevealTimerRef.current) {
      clearTimeout(clueRevealTimerRef.current);
      clueRevealTimerRef.current = null;
    }
    botTimersRef.current.forEach(clearTimeout);
    botTimersRef.current = [];
  }, []);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  const popFootballer = useCallback((pos: PositionGroup): Footballer | null => {
    const pool = poolRef.current[pos];
    return pool.length > 0 ? pool.shift()! : null;
  }, []);

  const assignPlayer = useCallback(
    (
      players: AuctionPlayer[],
      playerId: string,
      footballer: Footballer,
      price: number,
      pos: PositionGroup,
    ): AuctionPlayer[] => {
      return players.map((p) => {
        if (p.id !== playerId) return p;
        const newBudget = p.budget - price;
        const newSlots = { ...p.team.slots };
        newSlots[pos] = [...newSlots[pos], footballer];
        const newTeam = { ...p.team, slots: newSlots };
        const remaining = getRemainingSlots(newTeam);
        const emptySlots = Object.values(remaining).reduce((s, v) => s + v, 0);
        const isEliminated = emptySlots > 0 && newBudget < emptySlots * MIN_PLAYER_COST;
        return { ...p, budget: newBudget, team: newTeam, isEliminated };
      });
    },
    [],
  );

  const advanceToNextRound = useCallback(
    (prev: AuctionGameState): AuctionGameState => {
      const active = prev.players.filter((p) => !p.isEliminated && !isTeamComplete(p.team));
      if (active.length === 0) {
        return { ...prev, phase: 'results', currentRound: null, soloPick: null };
      }

      const positions = (['GK', 'DEF', 'MID', 'FWD'] as PositionGroup[]).filter(
        (pos) =>
          active.some((p) => needsPosition(p, pos)) && poolRef.current[pos].length > 0,
      );
      if (positions.length === 0) {
        return { ...prev, phase: 'results', currentRound: null, soloPick: null };
      }

      const pos = positions[Math.floor(Math.random() * positions.length)];
      const needers = active.filter((p) => needsPosition(p, pos));
      const footballer = popFootballer(pos);
      if (!footballer) {
        return { ...prev, phase: 'results', currentRound: null, soloPick: null };
      }

      if (needers.length === 1) {
        const optionB = popFootballer(pos);
        return {
          ...prev,
          phase: 'solo-pick',
          currentRound: null,
          soloPick: {
            playerId: needers[0].id,
            positionGroup: pos,
            optionA: { type: 'revealed', footballer },
            optionB: optionB
              ? { type: 'mystery', footballer: optionB, clues: optionB.clues }
              : { type: 'revealed', footballer },
          },
        };
      }

      return {
        ...prev,
        phase: 'clue-reveal',
        roundIndex: prev.roundIndex + 1,
        currentRound: {
          positionGroup: pos,
          footballer,
          clues: footballer.clues,
          clueRevealIndex: 0,
          bids: [],
          highestBidderId: null,
          highestBid: 0,
          startingPrice: footballer.startingPrice,
          winnerId: null,
          winningBid: 0,
          revealed: false,
          countdownEndsAt: null,
        },
        soloPick: null,
      };
    },
    [popFootballer],
  );

  const endRound = useCallback(() => {
    clearAllTimers();
    setState((prev) => {
      if (prev.phase !== 'bidding' || !prev.currentRound) return prev;
      if (
        prev.currentRound.countdownEndsAt &&
        prev.currentRound.countdownEndsAt > Date.now()
      ) {
        return prev;
      }

      const round = prev.currentRound;
      if (!round.highestBidderId) {
        return advanceToNextRound({
          ...prev,
          completedRounds: [...prev.completedRounds, { ...round, revealed: true }],
        });
      }

      const updatedPlayers = assignPlayer(
        prev.players,
        round.highestBidderId,
        round.footballer,
        round.highestBid,
        round.positionGroup,
      );

      return {
        ...prev,
        phase: 'reveal' as AuctionPhase,
        players: updatedPlayers,
        currentRound: {
          ...round,
          winnerId: round.highestBidderId,
          winningBid: round.highestBid,
          revealed: true,
        },
      };
    });
  }, [clearAllTimers, advanceToNextRound, assignPlayer]);

  // --- Clue reveal effect ---
  useEffect(() => {
    if (state.phase !== 'clue-reveal' || !state.currentRound) return;
    const { clueRevealIndex, clues } = state.currentRound;

    if (clueRevealIndex < clues.length) {
      const delay = clueRevealIndex === 0 ? 800 : CLUE_REVEAL_INTERVAL_MS;
      clueRevealTimerRef.current = setTimeout(() => {
        setState((prev) => {
          if (prev.phase !== 'clue-reveal' || !prev.currentRound) return prev;
          return {
            ...prev,
            currentRound: {
              ...prev.currentRound,
              clueRevealIndex: prev.currentRound.clueRevealIndex + 1,
            },
          };
        });
      }, delay);
      return () => {
        if (clueRevealTimerRef.current) {
          clearTimeout(clueRevealTimerRef.current);
          clueRevealTimerRef.current = null;
        }
      };
    }

    const timer = setTimeout(() => {
      setState((prev) => {
        if (prev.phase !== 'clue-reveal' || !prev.currentRound) return prev;
        return {
          ...prev,
          phase: 'bidding',
          currentRound: {
            ...prev.currentRound,
            countdownEndsAt: Date.now() + BID_COUNTDOWN_MS,
          },
        };
      });
    }, CLUE_REVEAL_INTERVAL_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.currentRound?.clueRevealIndex]);

  // --- Countdown + bot bids effect (enhanced with snipe bids + counter-bids) ---
  useEffect(() => {
    if (state.phase !== 'bidding' || !state.currentRound?.countdownEndsAt) return;

    const timeLeft = state.currentRound.countdownEndsAt - Date.now();
    if (timeLeft <= 0) {
      endRound();
      return;
    }

    countdownTimerRef.current = setTimeout(endRound, timeLeft);

    const round = state.currentRound;
    const bots = state.players.filter(
      (p) =>
        p.isBot &&
        !p.isEliminated &&
        needsPosition(p, round.positionGroup) &&
        p.id !== round.highestBidderId,
    );

    const isHighValue = round.footballer.value >= 200_000_000;

    const makeBotBid = (bot: AuctionPlayer, aggressive: boolean) => {
      setState((prev) => {
        if (prev.phase !== 'bidding' || !prev.currentRound) return prev;
        const r = prev.currentRound;
        const currentBot = prev.players.find((p) => p.id === bot.id);
        if (
          !currentBot ||
          currentBot.isEliminated ||
          !needsPosition(currentBot, r.positionGroup)
        )
          return prev;
        if (currentBot.id === r.highestBidderId) return prev;

        const maxBid = getMaxBid(currentBot);
        const minBid =
          r.highestBid > 0 ? r.highestBid + MIN_BID_INCREMENT : r.startingPrice;
        if (maxBid < minBid) return prev;

        const valueFactor = aggressive
          ? 0.85 + Math.random() * 0.55
          : isHighValue
            ? 0.8 + Math.random() * 0.5
            : 0.7 + Math.random() * 0.6;
        const targetBid = Math.round(r.footballer.value * valueFactor);
        if (minBid > targetBid) return prev;

        if (!aggressive && r.highestBid > 0 && Math.random() < 0.12) return prev;

        const bidAmount = Math.min(maxBid, Math.max(minBid, targetBid));

        return {
          ...prev,
          currentRound: {
            ...r,
            bids: [...r.bids, { playerId: bot.id, amount: bidAmount }],
            highestBidderId: bot.id,
            highestBid: bidAmount,
            countdownEndsAt: Date.now() + BID_COUNTDOWN_MS,
          },
        };
      });
    };

    for (const bot of bots) {
      const wasOutbid = round.bids.some((b) => b.playerId === bot.id);

      // Counter-bid: faster reaction when previously outbid
      const normalDelay = wasOutbid
        ? 600 + Math.random() * 1800
        : 1200 + Math.random() * 3500;

      if (normalDelay < timeLeft - 300) {
        const timer = setTimeout(() => makeBotBid(bot, wasOutbid), normalDelay);
        botTimersRef.current.push(timer);
      }

      // Snipe bid: 30% chance, fires 1-2.5s before end for dramatic last-second bids
      if (Math.random() < 0.3 && timeLeft > 4000) {
        const snipeDelay = timeLeft - (1000 + Math.random() * 1500);
        if (snipeDelay > normalDelay + 800) {
          const timer = setTimeout(() => makeBotBid(bot, true), snipeDelay);
          botTimersRef.current.push(timer);
        }
      }
    }

    return () => clearAllTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.currentRound?.countdownEndsAt]);

  const startGame = useCallback(
    (playerCount = 3) => {
      clearAllTimers();
      const formation = getRandomFormation();
      const bots = shuffle(BOT_PLAYERS)
        .slice(0, playerCount - 1)
        .map((b) => createBotPlayer(b, formation));
      const humanPlayer: AuctionPlayer = {
        id: HUMAN_PLAYER_ID,
        username: humanUsername,
        avatarSeed: humanAvatarSeed,
        budget: STARTING_BUDGET,
        team: createEmptyTeam(formation),
        isBot: false,
        isEliminated: false,
      };

      poolRef.current = {
        GK: shuffle(FOOTBALLERS.filter((f) => f.positionGroup === 'GK')),
        DEF: shuffle(FOOTBALLERS.filter((f) => f.positionGroup === 'DEF')),
        MID: shuffle(FOOTBALLERS.filter((f) => f.positionGroup === 'MID')),
        FWD: shuffle(FOOTBALLERS.filter((f) => f.positionGroup === 'FWD')),
      };

      setState({
        phase: 'formation',
        players: [humanPlayer, ...bots],
        formation,
        currentRound: null,
        roundIndex: 0,
        totalRounds: 11 * playerCount,
        completedRounds: [],
        soloPick: null,
      });
    },
    [humanUsername, humanAvatarSeed, clearAllTimers],
  );

  const setPhase = useCallback(
    (phase: AuctionPhase) => {
      setState((prev) => {
        if (phase === 'bidding') return advanceToNextRound(prev);
        return { ...prev, phase };
      });
    },
    [advanceToNextRound],
  );

  const placeBid = useCallback(
    (amount: number) => {
      clearAllTimers();
      setState((prev) => {
        if (!prev.currentRound || prev.phase !== 'bidding') return prev;
        const round = prev.currentRound;
        const human = prev.players.find((p) => p.id === HUMAN_PLAYER_ID);
        if (!human || human.isEliminated) return prev;
        if (!needsPosition(human, round.positionGroup)) return prev;
        if (human.id === round.highestBidderId) return prev;

        const maxBid = getMaxBid(human);
        if (amount > maxBid) return prev;

        const minBid =
          round.highestBid > 0 ? round.highestBid + MIN_BID_INCREMENT : round.startingPrice;
        if (amount < minBid) return prev;

        return {
          ...prev,
          currentRound: {
            ...round,
            bids: [...round.bids, { playerId: HUMAN_PLAYER_ID, amount }],
            highestBidderId: HUMAN_PLAYER_ID,
            highestBid: amount,
            countdownEndsAt: Date.now() + BID_COUNTDOWN_MS,
          },
        };
      });
    },
    [clearAllTimers],
  );

  const skipBid = useCallback(() => {}, []);

  const confirmReveal = useCallback(() => {
    setState((prev) => {
      if (!prev.currentRound) return prev;
      return advanceToNextRound({
        ...prev,
        completedRounds: [...prev.completedRounds, prev.currentRound],
      });
    });
  }, [advanceToNextRound]);

  const pickSoloOption = useCallback(
    (option: 'A' | 'B') => {
      setState((prev) => {
        if (!prev.soloPick) return prev;
        const { playerId, positionGroup, optionA, optionB } = prev.soloPick;
        const chosen = option === 'A' ? optionA : optionB;
        const cost = chosen.footballer.startingPrice;

        const updatedPlayers = assignPlayer(
          prev.players,
          playerId,
          chosen.footballer,
          cost,
          positionGroup,
        );

        const round: AuctionRound = {
          positionGroup,
          footballer: chosen.footballer,
          clues: chosen.footballer.clues,
          clueRevealIndex: chosen.footballer.clues.length,
          bids: [{ playerId, amount: cost }],
          highestBidderId: playerId,
          highestBid: cost,
          startingPrice: chosen.footballer.startingPrice,
          winnerId: playerId,
          winningBid: cost,
          revealed: true,
          countdownEndsAt: null,
        };

        return advanceToNextRound({
          ...prev,
          players: updatedPlayers,
          completedRounds: [...prev.completedRounds, round],
          soloPick: null,
        });
      });
    },
    [advanceToNextRound, assignPlayer],
  );

  return {
    state,
    actions: { startGame, placeBid, skipBid, confirmReveal, pickSoloOption, setPhase },
    humanPlayerId: HUMAN_PLAYER_ID,
  };
}
