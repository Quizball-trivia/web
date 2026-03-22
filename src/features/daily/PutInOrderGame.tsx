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

interface PutInOrderGameProps {
  session: PutInOrderSession;
  onBack: () => void;
  onComplete: (score: number) => void;
}

type RoundItem = PutInOrderSession["rounds"][number]["items"][number];
type Round = PutInOrderSession["rounds"][number];

function getRoundInstruction(round: Round): string {
  const instruction = round.instruction?.trim();
  if (instruction) {
    return instruction;
  }

  const direction = (round.direction as string | undefined)?.toLowerCase();
  return direction === "desc" ? "highest to lowest" : "lowest to highest";
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
        className={`bg-[#1B2F36] rounded-xl border-b-4 p-4 lg:p-5 transition-all ${
          !isRevealed ? "cursor-grab active:cursor-grabbing hover:bg-[#243B44] border-b-[#0F1F26]" : ""
        } ${
          isRevealed && isCorrectPosition ? "border-b-[#46A302] bg-[#58CC02]/10" : ""
        } ${
          isRevealed && !isCorrectPosition ? "border-b-[#CC3C3C] bg-[#FF4B4B]/10" : ""
        } ${isDragging ? "shadow-lg scale-105" : ""}`}
      >
        <div className="flex items-center gap-3 lg:gap-4">
          {!isRevealed ? (
            <div {...attributes} {...listeners} className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none">
              <GripVertical className="size-5 lg:size-6 text-[#56707A] group-hover:text-[#1CB0F6] transition-colors" />
            </div>
          ) : null}

          <div
            className={`flex-shrink-0 flex items-center justify-center size-8 lg:size-10 rounded-lg lg:rounded-xl text-sm lg:text-base font-black ${
              isRevealed && isCorrectPosition ? "bg-[#58CC02]/20 text-[#58CC02]" : ""
            } ${
              isRevealed && !isCorrectPosition ? "bg-[#FF4B4B]/20 text-[#FF4B4B]" : ""
            } ${!isRevealed ? "bg-[#243B44] text-white" : ""}`}
          >
            {index + 1}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 lg:gap-3">
              {item.emoji ? <span className="text-xl lg:text-2xl">{item.emoji}</span> : null}
              <span className="text-sm lg:text-base truncate text-white">{item.label}</span>
            </div>
            {item.details ? <p className="text-xs lg:text-sm text-[#56707A] mt-0.5 truncate">{item.details}</p> : null}
          </div>

          {isRevealed ? (
            <div className="flex-shrink-0 flex items-center gap-2 lg:gap-3">
              <span className="inline-flex items-center px-2 py-0.5 lg:px-3 lg:py-1 rounded-lg text-xs lg:text-sm font-bold bg-[#243B44] text-white">
                {item.sortValue}
              </span>
              {isCorrectPosition ? (
                <CheckCircle2 className="size-5 lg:size-6 text-[#58CC02]" />
              ) : (
                <XCircle className="size-5 lg:size-6 text-[#FF4B4B]" />
              )}
            </div>
          ) : (
            <div className="flex-shrink-0">
              <ArrowUpDown className="size-4 lg:size-5 text-[#56707A]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PutInOrderGame({ session, onBack, onComplete }: PutInOrderGameProps) {
  const [currentRound, setCurrentRound] = useState(0);
  const [userOrder, setUserOrder] = useState<RoundItem[]>(session.rounds[0]?.items ?? []);
  const [isRevealed, setIsRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showQuitDialog, setShowQuitDialog] = useState(false);

  const round = session.rounds[currentRound];
  const roundInstruction = round ? getRoundInstruction(round) : "lowest to highest";
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

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
      setTotalCoins((prev) => prev + 50);
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
    onComplete(correctCount * 100);
  };

  if (!round) {
    return null;
  }

  if (showResults) {
    const isPerfect = correctCount === session.roundCount;

    return (
      <div className="fixed inset-0 z-40 bg-[#131F24] font-fun flex flex-col">
        <div className="bg-[#1B2F36] border-b-[3px] border-[#131F24]">
          <div className="max-w-2xl lg:max-w-3xl mx-auto px-3 md:px-4 lg:px-6 py-2.5 md:py-3 lg:py-4">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="flex items-center justify-center size-9 lg:size-11 rounded-xl hover:bg-[#243B44] active:scale-95 transition-all text-white">
                <ArrowLeft className="size-5 lg:size-6" />
              </button>
              <div className="flex items-center gap-2">
                <Calendar className="size-6 lg:size-7 text-[#1CB0F6]" />
                <h1 className="text-lg md:text-xl lg:text-2xl font-black uppercase text-white">Challenge Complete!</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 lg:p-6 overflow-y-auto">
          <div className="bg-[#1B2F36] rounded-xl border-b-4 border-[#0F1F26] p-6 md:p-8 lg:p-10 w-full max-w-md lg:max-w-lg text-center">
            <div className={`inline-flex items-center justify-center size-20 lg:size-24 rounded-full mb-4 lg:mb-6 ${isPerfect ? "bg-[#FFD700]/20" : "bg-[#243B44]"}`}>
              <Trophy className={`size-10 lg:size-12 ${isPerfect ? "text-[#FFD700]" : "text-[#56707A]"}`} />
            </div>

            <h2 className="text-2xl lg:text-3xl font-black text-white mb-2">
              {isPerfect ? <span className="flex items-center justify-center gap-2">Perfect Score! <Sparkles className="size-6 lg:size-7 text-[#FFD700]" /></span> : "Challenge Complete!"}
            </h2>
            <p className="text-[#56707A] lg:text-base mb-6">{session.title}</p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between p-3 lg:p-4 rounded-xl bg-[#243B44]">
                <span className="text-sm lg:text-base text-[#56707A]">Correct Rounds</span>
                <span className="text-lg lg:text-xl font-black text-white">{correctCount}/{session.roundCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 lg:p-4 rounded-xl bg-[#243B44]">
                <span className="text-sm lg:text-base text-[#56707A]">Accuracy</span>
                <span className="text-lg lg:text-xl font-black text-white">{Math.round((correctCount / session.roundCount) * 100)}%</span>
              </div>
              <div className="flex items-center justify-between p-3 lg:p-4 rounded-xl bg-[#1CB0F6]/10">
                <span className="text-sm lg:text-base font-bold text-white">Round Score</span>
                <div className="flex items-center gap-1.5">
                  <Coins className="size-4 lg:size-5 text-[#FFD700]" />
                  <span className="text-lg lg:text-xl font-black text-white">{totalCoins}</span>
                </div>
              </div>
            </div>

            <button onClick={handleComplete} className="w-full py-3 lg:py-4 rounded-xl font-black text-white lg:text-lg bg-[#58CC02] border-b-4 border-b-[#46A302] active:border-b-2 active:translate-y-[2px] transition-all">
              Collect Rewards
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-[#131F24] font-fun flex flex-col">
      <div className="bg-[#1B2F36] border-b-[3px] border-[#131F24]">
        <div className="max-w-2xl lg:max-w-3xl mx-auto px-3 md:px-4 lg:px-6 py-2.5 md:py-3 lg:py-4">
          <div className="flex items-center gap-3 lg:gap-4 mb-3">
            <button onClick={() => setShowQuitDialog(true)} className="flex items-center justify-center size-9 lg:size-11 rounded-xl hover:bg-[#243B44] active:scale-95 transition-all text-white">
              <ArrowLeft className="size-5 lg:size-6" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Calendar className="size-5 lg:size-6 text-[#1CB0F6]" />
                <h1 className="text-lg lg:text-xl font-black uppercase text-white">Put in Order</h1>
              </div>
              <p className="text-xs lg:text-sm text-[#56707A] mt-0.5">{round.category}</p>
            </div>
            <span className="inline-flex items-center gap-1 lg:gap-1.5 px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-lg text-xs lg:text-sm font-bold bg-[#243B44] text-white">
              <Coins className="size-3 lg:size-4 text-[#FFD700]" />
              {totalCoins}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 lg:h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#58CC02] rounded-full transition-all duration-300" style={{ width: `${((currentRound + 1) / session.roundCount) * 100}%` }} />
            </div>
            <span className="text-xs lg:text-sm text-[#56707A] whitespace-nowrap font-bold">{currentRound + 1}/{session.roundCount}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full p-3 md:p-4 lg:p-6 lg:flex lg:flex-col lg:justify-center">
          <div className="max-w-2xl lg:max-w-3xl mx-auto w-full">
            <div className="bg-[#1B2F36] rounded-xl border-b-4 border-[#0F1F26] p-4 lg:p-5 mb-4 lg:mb-5">
              <div className="flex items-start gap-2.5 lg:gap-3">
                <div className="p-2 lg:p-2.5 rounded-lg lg:rounded-xl bg-[#1CB0F6]/15 shrink-0">
                  <ArrowUpDown className="size-4 lg:size-5 text-[#1CB0F6]" />
                </div>
                <div className="text-sm lg:text-base">
                  <p className="mb-1 text-white">
                    <span className="font-bold">Drag and drop</span> to arrange these items from <span className="font-bold">{roundInstruction}</span>.
                  </p>
                  <p className="text-xs lg:text-sm text-[#56707A]">{round.prompt}</p>
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
              <button onClick={checkOrder} className="w-full py-3 lg:py-4 rounded-xl font-black text-white lg:text-lg bg-[#58CC02] border-b-4 border-b-[#46A302] active:border-b-2 active:translate-y-[2px] transition-all">
                Submit Order
              </button>
            ) : (
              <div className="space-y-3 lg:space-y-4">
                <div className={`rounded-xl border-b-4 p-4 lg:p-5 text-center ${
                  userOrder.every((item, idx) => isCurrentOrderCorrect(item.id, idx))
                    ? "border-b-[#46A302] bg-[#58CC02]/10"
                    : "border-b-[#CC3C3C] bg-[#FF4B4B]/10"
                }`}>
                  {userOrder.every((item, idx) => isCurrentOrderCorrect(item.id, idx)) ? (
                    <>
                      <CheckCircle2 className="size-8 lg:size-10 text-[#58CC02] mx-auto mb-2" />
                      <p className="text-[#58CC02] font-bold lg:text-lg mb-1">Perfect! +50 round points</p>
                      <p className="text-xs lg:text-sm text-[#56707A]">You got the chronological order correct.</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-8 lg:size-10 text-[#FF4B4B] mx-auto mb-2" />
                      <p className="text-[#FF4B4B] font-bold lg:text-lg mb-1">Not quite right</p>
                      <p className="text-xs lg:text-sm text-[#56707A]">The correct order is revealed above.</p>
                    </>
                  )}
                </div>

                <button onClick={handleNextRound} className="w-full py-3 lg:py-4 rounded-xl font-black text-white lg:text-lg bg-[#58CC02] border-b-4 border-b-[#46A302] active:border-b-2 active:translate-y-[2px] transition-all">
                  {currentRound + 1 >= session.roundCount ? "View Results" : "Next Round"}
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
