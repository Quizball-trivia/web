"use client";

import { useState, useCallback } from "react";
import {
  ArrowLeft,
  Calendar,
  Coins,
  CheckCircle2,
  XCircle,
  Trophy,
  GripVertical,
  ArrowUpDown,
  Sparkles,
} from "lucide-react";
import { QuitGameDialog } from "./QuitGameDialog";
import { DailyChallengeHeader } from "./components/DailyChallengeHeader";
import { useLocale } from "@/contexts/LocaleContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PutInOrderSession } from "@/lib/domain/dailyChallenge";
import { playSfx } from "@/lib/sounds/gameSounds";

interface PutInOrderGameProps {
  session: PutInOrderSession;
  onBack: () => void;
  onComplete: (score: number) => void;
}

type RoundItem = PutInOrderSession["rounds"][number]["items"][number];
type Round = PutInOrderSession["rounds"][number];

function getRoundInstruction(round: Round, fallback: string): string {
  return round.instruction ?? fallback;
}

function SortableItem({
  item,
  index,
  isRevealed,
  isCorrectPosition,
}: {
  item: RoundItem;
  index: number;
  isRevealed: boolean;
  isCorrectPosition?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`group relative ${isDragging ? "z-50" : "z-0"}`}
    >
      <div
        className={`bg-surface-card rounded-xl border-b-4 p-4 lg:p-5 transition-all ${
          !isRevealed ? "cursor-grab active:cursor-grabbing hover:bg-surface-card-tint border-b-[#0F1F26]" : ""
        } ${
          isRevealed && isCorrectPosition ? "border-b-[#46A302] bg-brand-green-light/10" : ""
        } ${
          isRevealed && !isCorrectPosition ? "border-b-[#CC3C3C] bg-brand-red-soft/10" : ""
        } ${isDragging ? "shadow-lg scale-105" : ""}`}
      >
        <div className="flex items-center gap-3 lg:gap-4">
          {!isRevealed ? (
            <div {...attributes} {...listeners} className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none">
              <GripVertical className="size-5 lg:size-6 text-brand-slate group-hover:text-brand-cyan transition-colors" />
            </div>
          ) : null}

          <div
            className={`flex-shrink-0 flex items-center justify-center size-8 lg:size-10 rounded-lg lg:rounded-xl text-sm lg:text-base font-black ${
              isRevealed && isCorrectPosition ? "bg-brand-green-light/20 text-brand-green-light" : ""
            } ${
              isRevealed && !isCorrectPosition ? "bg-brand-red-soft/20 text-brand-red-soft" : ""
            } ${!isRevealed ? "bg-surface-card-tint text-white" : ""}`}
          >
            {index + 1}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 lg:gap-3">
              {item.emoji ? <span className="text-xl lg:text-2xl">{item.emoji}</span> : null}
              <span className="text-sm lg:text-base truncate text-white">{item.label}</span>
            </div>
            {item.details ? <p className="text-xs lg:text-sm text-brand-slate mt-0.5 truncate">{item.details}</p> : null}
          </div>

          {isRevealed ? (
            <div className="flex-shrink-0 flex items-center gap-2 lg:gap-3">
              <span className="inline-flex items-center px-2 py-0.5 lg:px-3 lg:py-1 rounded-lg text-xs lg:text-sm font-bold bg-surface-card-tint text-white">
                {item.sortValue}
              </span>
              {isCorrectPosition ? (
                <CheckCircle2 className="size-5 lg:size-6 text-brand-green-light" />
              ) : (
                <XCircle className="size-5 lg:size-6 text-brand-red-soft" />
              )}
            </div>
          ) : (
            <div className="flex-shrink-0">
              <ArrowUpDown className="size-4 lg:size-5 text-brand-slate" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PutInOrderGame({ session, onBack, onComplete }: PutInOrderGameProps) {
  const { t } = useLocale();
  const [currentRound, setCurrentRound] = useState(0);
  const [userOrder, setUserOrder] = useState<RoundItem[]>(session.rounds[0]?.items ?? []);
  const [isRevealed, setIsRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showQuitDialog, setShowQuitDialog] = useState(false);

  const round = session.rounds[currentRound];
  const roundInstruction = round ? getRoundInstruction(round, t('dailyGames.lowestToHighest')) : t('dailyGames.lowestToHighest');
  // sort_value represents rank/position (1 = first in correct order).
  const correctOrder = [...(round?.items ?? [])].sort((a, b) => a.sortValue - b.sortValue);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const startRound = useCallback((roundIndex: number) => {
    const nextRound = session.rounds[roundIndex];
    if (!nextRound) return;
    setUserOrder(nextRound.items);
    setIsRevealed(false);
  }, [session.rounds]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setUserOrder((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const isCurrentOrderCorrect = (itemId: string, index: number) => correctOrder[index]?.id === itemId;

  const checkOrder = () => {
    const isCorrect = userOrder.every((item, index) => item.id === correctOrder[index]?.id);
    setIsRevealed(true);

    playSfx(isCorrect ? "dailyCorrect" : "wrongAnswer");
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
      setTotalCoins((prev) => prev + 20);
    }
  };

  const handleNextRound = () => {
    if (currentRound + 1 >= session.roundCount) {
      setShowResults(true);
      return;
    }

    const nextRoundIndex = currentRound + 1;
    setCurrentRound(nextRoundIndex);
    startRound(nextRoundIndex);
  };

  const handleComplete = () => {
    onComplete(correctCount);
  };

  if (!round) {
    return null;
  }

  if (showResults) {
    const isPerfect = correctCount === session.roundCount;

    return (
      <div className="fixed inset-0 z-40 bg-surface-deep font-fun flex flex-col">
        <div className="bg-surface-card border-b-[3px] border-surface-deep">
          <div className="max-w-2xl lg:max-w-3xl mx-auto px-3 md:px-4 lg:px-6 py-2.5 md:py-3 lg:py-4">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="flex items-center justify-center size-9 lg:size-11 rounded-xl hover:bg-surface-card-tint active:scale-95 transition-all text-white">
                <ArrowLeft className="size-5 lg:size-6" />
              </button>
              <div className="flex items-center gap-2">
                <Calendar className="size-6 lg:size-7 text-brand-cyan" />
                <h1 className="text-lg md:text-xl lg:text-2xl font-black uppercase text-white">{t('dailyGames.challengeComplete')}</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 lg:p-6 overflow-y-auto">
          <div className="bg-surface-card rounded-xl border-b-4 border-surface-card-deeper p-6 md:p-8 lg:p-10 w-full max-w-md lg:max-w-lg text-center">
            <div className={`inline-flex items-center justify-center size-20 lg:size-24 rounded-full mb-4 lg:mb-6 ${isPerfect ? "bg-brand-gold/20" : "bg-surface-card-tint"}`}>
              <Trophy className={`size-10 lg:size-12 ${isPerfect ? "text-brand-gold" : "text-brand-slate"}`} />
            </div>

            <h2 className="text-2xl lg:text-3xl font-black text-white mb-2">
              {isPerfect ? <span className="flex items-center justify-center gap-2">{t('dailyGames.perfectScore')} <Sparkles className="size-6 lg:size-7 text-brand-gold" /></span> : t('dailyGames.challengeComplete')}
            </h2>
            <p className="text-brand-slate lg:text-base mb-6">{session.title}</p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between p-3 lg:p-4 rounded-xl bg-surface-card-tint">
                <span className="text-sm lg:text-base text-brand-slate">{t("dailyGames.correctRounds")}</span>
                <span className="text-lg lg:text-xl font-black text-white">{correctCount}/{session.roundCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 lg:p-4 rounded-xl bg-surface-card-tint">
                <span className="text-sm lg:text-base text-brand-slate">{t("dailyGames.accuracy")}</span>
                <span className="text-lg lg:text-xl font-black text-white">{Math.round((correctCount / session.roundCount) * 100)}%</span>
              </div>
              <div className="flex items-center justify-between p-3 lg:p-4 rounded-xl bg-brand-cyan/10">
                <span className="text-sm lg:text-base font-bold text-white">{t("dailyGames.roundScore")}</span>
                <div className="flex items-center gap-1.5">
                  <Coins className="size-4 lg:size-5 text-brand-gold" />
                  <span className="text-lg lg:text-xl font-black text-white">{totalCoins}</span>
                </div>
              </div>
            </div>

            <button onClick={handleComplete} className="w-full py-3 lg:py-4 rounded-xl font-black text-white lg:text-lg bg-brand-green-light border-b-4 border-b-[#46A302] active:border-b-2 active:translate-y-[2px] transition-all">
              {t("dailyGames.collectRewards")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-page-alt bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat font-poppins text-white">
      <DailyChallengeHeader
        onQuit={() => setShowQuitDialog(true)}
        currentIndex={currentRound}
        total={session.roundCount}
        hideTimer
        centerLabel={`Round ${currentRound + 1}/${session.roundCount}`}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full p-3 md:p-4 lg:p-6 lg:flex lg:flex-col lg:justify-center">
          <div className="max-w-2xl lg:max-w-3xl mx-auto w-full">
            <div className="bg-surface-card rounded-xl border-b-4 border-surface-card-deeper p-4 lg:p-5 mb-4 lg:mb-5">
              <div className="flex items-start gap-2.5 lg:gap-3">
                <div className="p-2 lg:p-2.5 rounded-lg lg:rounded-xl bg-brand-cyan/15 shrink-0">
                  <ArrowUpDown className="size-4 lg:size-5 text-brand-cyan" />
                </div>
                <div className="text-sm lg:text-base">
                  <p className="mb-1 text-white">
                    {t('dailyGames.dragAndDropInstruction', { instruction: roundInstruction })}
                  </p>
                  <p className="text-xs lg:text-sm text-brand-slate">{round.prompt}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 lg:space-y-3 mb-4 lg:mb-5">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={userOrder.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                  {userOrder.map((item, index) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      index={index}
                      isRevealed={isRevealed}
                      isCorrectPosition={isRevealed ? isCurrentOrderCorrect(item.id, index) : undefined}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            {!isRevealed ? (
              <button onClick={checkOrder} className="w-full py-3 lg:py-4 rounded-xl font-black text-white lg:text-lg bg-brand-green-light border-b-4 border-b-[#46A302] active:border-b-2 active:translate-y-[2px] transition-all">
                {t("dailyGames.submitOrder")}
              </button>
            ) : (
              <div className="space-y-3 lg:space-y-4">
                <div className={`rounded-xl border-b-4 p-4 lg:p-5 text-center ${
                  userOrder.every((item, idx) => isCurrentOrderCorrect(item.id, idx))
                    ? "border-b-[#46A302] bg-brand-green-light/10"
                    : "border-b-[#CC3C3C] bg-brand-red-soft/10"
                }`}>
                  {userOrder.every((item, idx) => isCurrentOrderCorrect(item.id, idx)) ? (
                    <>
                      <CheckCircle2 className="size-8 lg:size-10 text-brand-green-light mx-auto mb-2" />
                      <p className="text-brand-green-light font-bold lg:text-lg mb-1">{t('dailyGames.perfectPointsAwarded')}</p>
                      <p className="text-xs lg:text-sm text-brand-slate">{t('dailyGames.chronologicalCorrect')}</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-8 lg:size-10 text-brand-red-soft mx-auto mb-2" />
                      <p className="text-brand-red-soft font-bold lg:text-lg mb-1">{t("dailyGames.notQuiteRight")}</p>
                      <p className="text-xs lg:text-sm text-brand-slate">{t('dailyGames.correctOrderRevealed')}</p>
                    </>
                  )}
                </div>

                <button onClick={handleNextRound} className="w-full py-3 lg:py-4 rounded-xl font-black text-white lg:text-lg bg-brand-green-light border-b-4 border-b-[#46A302] active:border-b-2 active:translate-y-[2px] transition-all">
                  {currentRound + 1 >= session.roundCount ? t('dailyGames.viewResults') : t('dailyGames.nextRound')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <QuitGameDialog open={showQuitDialog} onOpenChange={setShowQuitDialog} onQuit={onBack} />
    </div>
  );
}
