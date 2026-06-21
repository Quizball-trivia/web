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
  CLUE_REVEAL_INTERVAL_MS,
  MIN_BID_INCREMENT,
  OPENING_TURN_MS,
  RAISE_TURN_MS,
  POSITION_ORDER,
  getMinBid,
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

export type AuctionPendingTurnAction =
  | { kind: 'bid'; amount: number; matchId: string; roundId: string | null }
  | { kind: 'fold'; matchId: string; roundId: string | null };

export interface AuctionActions {
  startGame: (playerCount?: number) => void;
  placeBid: (amount: number) => void;
  fold: () => void;
  confirmReveal: () => void;
  pickSoloOption: (option: 'A' | 'B') => void;
  setPhase: (phase: AuctionPhase) => void;
  cancelSearch?: () => void;
  pendingTurnAction?: AuctionPendingTurnAction | null;
}

const HUMAN_PLAYER_ID = 'human-player';

/** Players still in the running for this round: in turn order, not folded,
 *  not eliminated, and still need the position. */
function remainingBidders(round: AuctionRound, players: AuctionPlayer[]): AuctionPlayer[] {
  return round.turnOrder
    .filter((id) => !round.foldedIds.includes(id))
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is AuctionPlayer => !!p && !p.isEliminated && needsPosition(p, round.positionGroup));
}

/** The next player to act after `currentTurnId`: the next in turn order who is
 *  still in (not folded) and is NOT the current high bidder (you don't bid
 *  against yourself). When there's no standing bid yet, the next player is a
 *  *forced opener* who must afford the starting price — anyone who can't is
 *  skipped. Returns null if nobody else can act. */
function nextBidderId(round: AuctionRound, players: AuctionPlayer[]): string | null {
  const order = round.turnOrder;
  const startIdx = round.currentTurnId ? order.indexOf(round.currentTurnId) : -1;
  const noBidYet = !round.highestBidderId;
  for (let step = 1; step <= order.length; step++) {
    const id = order[(startIdx + step) % order.length];
    if (round.foldedIds.includes(id)) continue;
    if (id === round.highestBidderId) continue; // skip the leader — no self-bidding
    const p = players.find((x) => x.id === id);
    if (!p || p.isEliminated || !needsPosition(p, round.positionGroup)) continue;
    // Forced opener must be able to afford the starting price; skip if not.
    if (noBidYet && getMaxBid(p) < round.startingPrice) continue;
    return id;
  }
  return null;
}

/** 30s for the opening turn (no bid on the table yet), 10s for every raise. */
function turnMsFor(round: AuctionRound): number {
  return round.highestBidderId ? RAISE_TURN_MS : OPENING_TURN_MS;
}

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
  const turnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clueRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (turnTimerRef.current) {
      clearTimeout(turnTimerRef.current);
      turnTimerRef.current = null;
    }
    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
    if (clueRevealTimerRef.current) {
      clearTimeout(clueRevealTimerRef.current);
      clueRevealTimerRef.current = null;
    }
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

      const positions = POSITION_ORDER.filter(
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
          // Random turn order among the players who need this position.
          turnOrder: shuffle(needers.map((p) => p.id)),
          currentTurnId: null,
          foldedIds: [],
          turnEndsAt: null,
        },
        soloPick: null,
      };
    },
    [popFootballer],
  );

  // Win → reveal the sold player.
  const resolveWin = useCallback(
    (prev: AuctionGameState, round: AuctionRound): AuctionGameState => {
      const winnerId = round.highestBidderId!;
      const updatedPlayers = assignPlayer(prev.players, winnerId, round.footballer, round.highestBid, round.positionGroup);
      return {
        ...prev,
        phase: 'reveal' as AuctionPhase,
        players: updatedPlayers,
        currentRound: { ...round, currentTurnId: null, turnEndsAt: null, winnerId, winningBid: round.highestBid, revealed: true },
      };
    },
    [assignPlayer],
  );

  // After a bid or fold: decide the round's next state.
  //   • someone bid + everyone else folded → that high bidder wins.
  //   • nobody left who can act + no bid → player unsold, advance.
  //   • else → hand the turn to the next eligible bidder.
  const resolveOrAdvanceTurn = useCallback(
    (prev: AuctionGameState, round: AuctionRound): AuctionGameState => {
      const remaining = remainingBidders(round, prev.players);

      // Win: a bid exists and at most one bidder remains in (the high bidder).
      if (round.highestBidderId && remaining.length <= 1) {
        return resolveWin(prev, round);
      }

      const nextId = nextBidderId(round, prev.players);

      // Nobody else can act.
      if (!nextId) {
        if (round.highestBidderId) return resolveWin(prev, round);
        // Everyone folded with no bid → unsold, move on.
        return advanceToNextRound({
          ...prev,
          completedRounds: [...prev.completedRounds, { ...round, currentTurnId: null, turnEndsAt: null, revealed: true }],
        });
      }

      return {
        ...prev,
        currentRound: { ...round, currentTurnId: nextId, turnEndsAt: Date.now() + turnMsFor(round) },
      };
    },
    [resolveWin, advanceToNextRound],
  );

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
        // Open bidding: hand the first turn to the first eligible player in order.
        const round = prev.currentRound;
        const firstId = nextBidderId({ ...round, currentTurnId: round.turnOrder[round.turnOrder.length - 1] ?? null }, prev.players);
        if (!firstId) {
          // No one needs the player → unsold, advance.
          return advanceToNextRound({
            ...prev,
            completedRounds: [...prev.completedRounds, { ...round, revealed: true }],
          });
        }
        return {
          ...prev,
          phase: 'bidding',
          currentRound: { ...round, currentTurnId: firstId, turnEndsAt: Date.now() + turnMsFor(round) },
        };
      });
    }, CLUE_REVEAL_INTERVAL_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.currentRound?.clueRevealIndex]);

  // --- Turn timer: when a turn's clock runs out, the player auto-folds. ---
  useEffect(() => {
    if (state.phase !== 'bidding' || !state.currentRound?.turnEndsAt || !state.currentRound.currentTurnId) return;
    const delay = Math.max(0, state.currentRound.turnEndsAt - Date.now());
    turnTimerRef.current = setTimeout(() => {
      setState((prev) => {
        if (prev.phase !== 'bidding' || !prev.currentRound?.currentTurnId) return prev;
        const round = prev.currentRound;
        const turnId = round.currentTurnId!;
        // Forced opener (no standing bid) can't fold on timeout — auto-bid the
        // starting price (nextBidderId guaranteed they can afford it).
        if (!round.highestBidderId) {
          const bidded = {
            ...round,
            bids: [...round.bids, { playerId: turnId, amount: round.startingPrice }],
            highestBidderId: turnId,
            highestBid: round.startingPrice,
          };
          return resolveOrAdvanceTurn(prev, bidded);
        }
        // Otherwise timeout = auto-fold.
        const folded = { ...round, foldedIds: [...round.foldedIds, turnId] };
        return resolveOrAdvanceTurn(prev, folded);
      });
    }, delay);
    return () => {
      if (turnTimerRef.current) { clearTimeout(turnTimerRef.current); turnTimerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.currentRound?.currentTurnId, state.currentRound?.turnEndsAt]);

  // --- Bot turn: when it's a bot's turn, after a short think it bids or folds. ---
  useEffect(() => {
    if (state.phase !== 'bidding' || !state.currentRound?.currentTurnId) return;
    const turnId = state.currentRound.currentTurnId;
    if (turnId === HUMAN_PLAYER_ID) return;

    const think = 800 + Math.random() * 2000; // 0.8–2.8s, well within the turn window
    botTimerRef.current = setTimeout(() => {
      setState((prev) => {
        if (prev.phase !== 'bidding' || !prev.currentRound || prev.currentRound.currentTurnId !== turnId) return prev;
        const r = prev.currentRound;
        const bot = prev.players.find((p) => p.id === turnId);
        if (!bot) return prev;

        const maxBid = getMaxBid(bot);
        const minBid = getMinBid(r);

        // Bot's max willingness: a fraction of the footballer's value (placeholder
        // heuristic; replaced by the real AI difficulty system later).
        const willingness = Math.round(r.footballer.value * (0.75 + Math.random() * 0.55));

        // Forced opener (no standing bid) must bid — can't fold.
        const mustOpen = !r.highestBidderId;
        const canAfford = maxBid >= minBid;
        const wantsIt = minBid <= willingness;
        const randomFold = Math.random() < 0.12;

        if (!mustOpen && (!canAfford || !wantsIt || randomFold)) {
          const folded = { ...r, foldedIds: [...r.foldedIds, turnId] };
          return resolveOrAdvanceTurn(prev, folded);
        }
        // (A forced opener always reaches here; nextBidderId guarantees they can
        //  afford the starting price, so the bid below is valid.)

        // Bid: minimum raise most of the time, sometimes a bump.
        const bump = Math.random() < 0.35 ? MIN_BID_INCREMENT * (1 + Math.floor(Math.random() * 4)) : 0;
        const bidAmount = Math.min(maxBid, willingness, minBid + bump);
        const finalBid = Math.max(minBid, bidAmount);
        const bidded = {
          ...r,
          bids: [...r.bids, { playerId: turnId, amount: finalBid }],
          highestBidderId: turnId,
          highestBid: finalBid,
        };
        return resolveOrAdvanceTurn(prev, bidded);
      });
    }, think);

    return () => {
      if (botTimerRef.current) { clearTimeout(botTimerRef.current); botTimerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.currentRound?.currentTurnId]);

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
        // Only the human, only on their turn.
        if (round.currentTurnId !== HUMAN_PLAYER_ID) return prev;
        const human = prev.players.find((p) => p.id === HUMAN_PLAYER_ID);
        if (!human || human.isEliminated) return prev;

        const maxBid = getMaxBid(human);
        if (amount > maxBid) return prev;
        const minBid = getMinBid(round);
        if (amount < minBid) return prev;

        const bidded = {
          ...round,
          bids: [...round.bids, { playerId: HUMAN_PLAYER_ID, amount }],
          highestBidderId: HUMAN_PLAYER_ID,
          highestBid: amount,
        };
        return resolveOrAdvanceTurn(prev, bidded);
      });
    },
    [clearAllTimers, resolveOrAdvanceTurn],
  );

  const fold = useCallback(() => {
    clearAllTimers();
    setState((prev) => {
      if (!prev.currentRound || prev.phase !== 'bidding') return prev;
      const round = prev.currentRound;
      if (round.currentTurnId !== HUMAN_PLAYER_ID) return prev;
      // The forced opener (no standing bid) cannot fold — they must bid.
      if (!round.highestBidderId) return prev;
      const folded = { ...round, foldedIds: [...round.foldedIds, HUMAN_PLAYER_ID] };
      return resolveOrAdvanceTurn(prev, folded);
    });
  }, [clearAllTimers, resolveOrAdvanceTurn]);

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
          turnOrder: [playerId],
          currentTurnId: null,
          foldedIds: [],
          turnEndsAt: null,
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
    actions: { startGame, placeBid, fold, confirmReveal, pickSoloOption, setPhase },
    humanPlayerId: HUMAN_PLAYER_ID,
  };
}
