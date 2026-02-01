"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useGameSessionStore } from "@/stores/gameSession.store";
import { usePlayer } from "@/contexts/PlayerContext";
import { MatchmakingScreen } from "@/components/game/MatchmakingScreen";
import { ShowdownScreen } from "@/components/game/ShowdownScreen";
import { RankedCategoryBlockingScreen } from "@/features/play/RankedCategoryBlockingScreen";
import { RoundIntroScreen } from "@/components/game/RoundIntroScreen";
import { RoundResultScreen } from "@/components/game/RoundResultScreen";
import { QuizBallGameScreen } from "@/components/game/QuizBallGameScreen";
import { QuizBallResultsScreen } from "@/components/game/QuizBallResultsScreen";
import { getQuestionsListQuery } from "@/lib/queries/questions.queries";
import { queryKeys } from "@/lib/queries/queryKeys";
import { QUESTION_COUNT } from "@/lib/constants/game";
import type { Question } from "@/types/game";
import type { GameMode as LegacyGameMode } from "@/types/game";
import type { CategorySummary, GameQuestion } from "@/lib/domain";
import type { ListQuestionsQuery } from "@/lib/repositories/questions.repo";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

type OpponentInfo = {
  id: string;
  username: string;
  avatar: string;
  tier?: string;
};

type LastGameStats = {
  playerScore: number;
  opponentScore: number;
  correctAnswers: number;
  playerAnswers: (number | null)[];
};

const toLegacyMode = (mode: string | undefined): LegacyGameMode => {
  if (mode === "buzzer") return "buzzer";
  if (mode === "ranked") return "timeAttack";
  if (mode === "quizball") return "categories";
  return "timeAttack";
};

const toLegacyQuestions = (questions: GameQuestion[]): Question[] => {
  return questions.map((q) => ({
    id: q.id,
    question: q.prompt,
    options: q.options,
    correctAnswer: q.correctIndex,
    difficulty: (q.difficulty || "medium") as Question["difficulty"],
    category: q.categoryName || "General",
    clue: q.explanation || "",
  }));
};

export function GameStageRouter() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { player } = usePlayer();
  const stage = useGameSessionStore((state) => state.stage);
  const config = useGameSessionStore((state) => state.config);
  const questions = useGameSessionStore((state) => state.questions);
  const setStage = useGameSessionStore((state) => state.setStage);
  const setQuestions = useGameSessionStore((state) => state.setQuestions);
  const updateConfig = useGameSessionStore((state) => state.updateConfig);
  const reset = useGameSessionStore((state) => state.reset);

  const [opponent, setOpponent] = useState<OpponentInfo>({
    id: "opponent",
    username: "TriviaKing",
    avatar: "👑",
    tier: "Silver",
  });
  const [lastGameStats, setLastGameStats] = useState<LastGameStats>({
    playerScore: 0,
    opponentScore: 0,
    correctAnswers: 0,
    playerAnswers: [],
  });
  const [roundNumber, setRoundNumber] = useState(1);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const totalRounds = 3;

  // Fetch questions for selected categories after blocking
  const handleCategoriesSelected = useCallback(
    async (selectedCategories: CategorySummary[]) => {
      setIsLoadingQuestions(true);

      try {
        // Invalidate cache to ensure fresh questions
        await queryClient.invalidateQueries({
          queryKey: queryKeys.questions.all,
        });

        // Fetch questions from each category (5 from each for 10 total)
        const questionsPerCategory = Math.ceil(
          QUESTION_COUNT / selectedCategories.length
        );
        const allQuestions: GameQuestion[] = [];

        for (const category of selectedCategories) {
          const filters: ListQuestionsQuery = {
            category_id: category.id,
            status: "published",
            page: "1",
            limit: String(questionsPerCategory),
          };

          const result = await queryClient.fetchQuery(
            getQuestionsListQuery(filters)
          );

          const categoryQuestions = result.items
            .slice(0, questionsPerCategory)
            .map((q) => ({
              ...q,
              categoryName: category.name,
            }));

          allQuestions.push(...categoryQuestions);
        }

        if (allQuestions.length === 0) {
          const categoryNames = selectedCategories.map((c) => c.name).join(", ");
          toast.error(`No questions found for: ${categoryNames}`);
          reset();
          router.push("/play");
          return;
        }

        // Shuffle all questions together
        const shuffledQuestions = shuffleArray(allQuestions);
        setQuestions(shuffledQuestions);

        // Update config with category info (use first category as primary)
        const primaryCategory = selectedCategories[0];
        updateConfig({
          categoryId: primaryCategory.id,
          categoryIds: selectedCategories.map((c) => c.id),
          categoryName: selectedCategories.map((c) => c.name).join(" & "),
          categoryIcon: primaryCategory.icon || "⚽",
        });

        setStage("showdown");
      } catch {
        toast.error("Failed to load questions. Please try again.");
        reset();
        router.push("/play");
      } finally {
        setIsLoadingQuestions(false);
      }
    },
    [queryClient, reset, router, setQuestions, setStage, updateConfig]
  );

  useEffect(() => {
    if (stage === "idle") {
      router.replace("/play");
    }
  }, [stage, router]);

  const legacyQuestions = useMemo(
    () => toLegacyQuestions(questions),
    [questions],
  );

  if (stage === "idle") {
    return null;
  }

  const matchType = config?.matchType || "casual";
  const showdownType = matchType === "ranked" ? "ranked" : "friendly";
  const legacyMode = toLegacyMode(config?.mode);

  if (stage === "matchmaking") {
    return (
      <MatchmakingScreen
        matchType={matchType}
        onCancel={() => {
          reset();
          router.push("/play");
        }}
        onMatchFound={(nextOpponent) => {
          setOpponent(nextOpponent);
          // For ranked matches, go to category blocking first
          if (matchType === "ranked") {
            setStage("categoryBlocking");
          } else {
            setStage("showdown");
          }
        }}
      />
    );
  }

  if (stage === "categoryBlocking") {
    if (isLoadingQuestions) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading questions...</p>
          </div>
        </div>
      );
    }

    return (
      <RankedCategoryBlockingScreen
        opponent={opponent}
        onCategoriesSelected={handleCategoriesSelected}
        onBack={() => {
          reset();
          router.push("/play");
        }}
      />
    );
  }

  if (stage === "showdown") {
    return (
      <ShowdownScreen
        matchType={showdownType}
        playerUsername={player.username}
        playerAvatar={player.avatar}
        opponentUsername={opponent.username}
        opponentAvatar={opponent.avatar}
        onComplete={() => setStage("roundIntro")}
      />
    );
  }

  if (stage === "roundIntro") {
    return (
      <RoundIntroScreen
        roundNumber={roundNumber}
        totalRounds={totalRounds}
        mode={legacyMode}
        playerUsername={player.username}
        opponentUsername={opponent.username}
        playerAvatar={player.avatar}
        opponentAvatar={opponent.avatar}
        playerRoundsWon={0}
        opponentRoundsWon={0}
        onReady={() => setStage("playing")}
      />
    );
  }

  if (stage === "playing") {
    return (
      <QuizBallGameScreen
        questions={legacyQuestions}
        category={config?.categoryName || "General"}
        categoryIcon={config?.categoryIcon || "⚽"}
        playerAvatar={player.avatar}
        playerUsername={player.username}
        opponentAvatar={opponent.avatar}
        opponentUsername={opponent.username}
        onGameEnd={(playerScore, opponentScore, correctAnswers, playerAnswers) => {
          setLastGameStats({
            playerScore,
            opponentScore,
            correctAnswers,
            playerAnswers,
          });
          setStage("roundResult");
        }}
        onQuit={() => {
          reset();
          router.push("/play");
        }}
      />
    );
  }

  if (stage === "roundResult") {
    const playerWonRound = lastGameStats.playerScore >= lastGameStats.opponentScore;
    return (
      <RoundResultScreen
        roundNumber={roundNumber}
        totalRounds={totalRounds}
        mode={legacyMode}
        playerScore={lastGameStats.playerScore}
        opponentScore={lastGameStats.opponentScore}
        playerUsername={player.username}
        opponentUsername={opponent.username}
        playerAvatar={player.avatar}
        opponentAvatar={opponent.avatar}
        playerRoundsWon={playerWonRound ? 1 : 0}
        opponentRoundsWon={!playerWonRound ? 1 : 0}
        isRanked={matchType === "ranked"}
        onReady={() => {
          if (roundNumber < totalRounds) {
            setRoundNumber((prev) => prev + 1);
            setStage("roundIntro");
            return;
          }
          setStage("finalResults");
        }}
      />
    );
  }

  return (
    <QuizBallResultsScreen
      categoryName={config?.categoryName || "General"}
      categoryIcon={config?.categoryIcon || "⚽"}
      playerScore={lastGameStats.playerScore}
      opponentScore={lastGameStats.opponentScore}
      playerUsername={player.username}
      opponentUsername={opponent.username}
      playerAvatar={player.avatar}
      opponentAvatar={opponent.avatar}
      oldRank={120}
      newRank={125}
      correctAnswers={lastGameStats.correctAnswers}
      totalQuestions={legacyQuestions.length}
      coinsEarned={150}
      questions={legacyQuestions}
      playerAnswers={lastGameStats.playerAnswers}
      onPlayAgain={() => {
        reset();
        router.push("/play");
      }}
      onMainMenu={() => {
        reset();
        router.push("/play");
      }}
    />
  );
}
