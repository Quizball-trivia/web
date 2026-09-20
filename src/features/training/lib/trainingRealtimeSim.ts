import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import type { MatchStatus } from "@/stores/realtime-match/types";
import type { GameQuestion } from "@/lib/domain";
import type { MatchPhaseKind } from "@/lib/realtime/socket.types";
import { BOT_AVATAR, BOT_NAME } from "../constants";

/**
 * The ranked bar-battle score flights (`usePossessionBarBattleFlights`) are
 * driven straight off `useRealtimeMatchStore` and only fire for
 * `variant === 'ranked_sim'` matches. Training has no socket, so it hydrates
 * the store with a synthetic MatchStatus and patches it per round — the
 * flight/battle pipeline then runs exactly as in ranked.
 */

export const TRAINING_MATCH_ID = "training";
export const TRAINING_OPPONENT_ID = "training-bot";
const FALLBACK_SELF_ID = "training-player";

export function trainingSelfId(): string {
  return useRealtimeMatchStore.getState().selfUserId ?? FALLBACK_SELF_ID;
}

function baseMatch(): MatchStatus {
  return {
    matchId: TRAINING_MATCH_ID,
    mode: "friendly",
    variant: "ranked_sim",
    mySeat: 1,
    opponent: {
      id: TRAINING_OPPONENT_ID,
      username: BOT_NAME,
      avatarUrl: BOT_AVATAR,
      isAiOpponent: true,
    },
    participants: [],
    countdownEndsAt: null,
    countdownReason: null,
    waitingForReady: null,
    currentQuestion: null,
    pendingQuestion: null,
    questions: {},
    answerAck: null,
    countdownGuessAck: null,
    opponentCountdownFoundCount: 0,
    cluesGuessAck: null,
    opponentAnswered: false,
    opponentSelectedIndex: null,
    myTotalPoints: 0,
    oppTotalPoints: 0,
    opponentRecentPoints: 0,
    lastRoundResult: null,
    finalResults: null,
    currentQuestionPhase: "playing",
    opponentAnsweredCorrectly: null,
    possessionState: null,
    partyState: null,
    stateVersion: 0,
  };
}

function isTrainingMatch(match: MatchStatus | null): boolean {
  return match?.matchId === TRAINING_MATCH_ID;
}

/** Mount the synthetic match (idempotent). */
export function hydrateTrainingMatch() {
  const state = useRealtimeMatchStore.getState();
  if (isTrainingMatch(state.match)) return;
  useRealtimeMatchStore.setState({
    match: baseMatch(),
    ...(state.selfUserId ? {} : { selfUserId: FALLBACK_SELF_ID }),
  });
}

export function patchTrainingMatch(patch: Partial<MatchStatus>) {
  const prev = useRealtimeMatchStore.getState().match;
  if (!isTrainingMatch(prev) || !prev) return;
  useRealtimeMatchStore.setState({ match: { ...prev, ...patch } });
}

/** New round: publish the question and clear the previous round's payloads. */
export function startTrainingRound(
  question: GameQuestion,
  qIndex: number,
  total: number,
  phaseKind: MatchPhaseKind = "normal",
) {
  hydrateTrainingMatch();
  patchTrainingMatch({
    currentQuestion: {
      matchId: TRAINING_MATCH_ID,
      qIndex,
      total,
      deadlineAt: "",
      phaseKind,
      question: {
        kind: "multipleChoice",
        id: question.id,
        prompt: question.prompt,
        options: question.options,
        categoryName: question.categoryName,
      },
    },
    currentQuestionPhase: "playing",
    answerAck: null,
    lastRoundResult: null,
    opponentAnswered: false,
    opponentAnsweredCorrectly: null,
    opponentRecentPoints: 0,
  });
}

/** Drop the synthetic match so nothing leaks into /play (keeps selfUserId). */
export function resetTrainingMatch() {
  const state = useRealtimeMatchStore.getState();
  if (!isTrainingMatch(state.match)) return;
  state.reset();
}
