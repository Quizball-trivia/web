"use client";

import { useState, useCallback } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  Coins,
  CheckCircle2,
  XCircle,
  Trophy,
  GripVertical,
  ArrowUpDown,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PutInOrderItem {
  id: string;
  name: { en: string };
  details?: { en: string };
  emoji?: string;
  year: number;
}

interface PutInOrderChallenge {
  id: string;
  category: { en: string };
  description: { en: string };
  totalQuestions: number;
  rewards: { perfect: number };
  items: PutInOrderItem[];
}

interface PutInOrderGameProps {
  onBack: () => void;
  onComplete: (coinsEarned: number) => void;
}

interface SortableItemProps {
  item: PutInOrderItem;
  index: number;
  isRevealed: boolean;
  isCorrectPosition?: boolean;
}

function SortableItem({
  item,
  index,
  isRevealed,
  isCorrectPosition,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative ${isDragging ? "z-50" : "z-0"}`}
    >
      <Card
        className={`transition-all ${
          !isRevealed
            ? "cursor-grab active:cursor-grabbing hover:border-primary/50"
            : ""
        } ${
          isRevealed && isCorrectPosition
            ? "border-green-500/50 bg-green-500/5"
            : ""
        } ${
          isRevealed && !isCorrectPosition ? "border-red-500/50 bg-red-500/5" : ""
        } ${isDragging ? "shadow-lg scale-105" : ""}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {!isRevealed && (
              <div
                {...attributes}
                {...listeners}
                className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
              >
                <GripVertical className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            )}

            <div
              className={`flex-shrink-0 flex items-center justify-center size-8 rounded-lg text-sm font-medium ${
                isRevealed && isCorrectPosition
                  ? "bg-green-500/20 text-green-600"
                  : ""
              } ${
                isRevealed && !isCorrectPosition ? "bg-red-500/20 text-red-600" : ""
              } ${!isRevealed ? "bg-secondary" : ""}`}
            >
              {index + 1}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {item.emoji && <span className="text-xl">{item.emoji}</span>}
                <span className="text-sm truncate">{item.name.en}</span>
              </div>
              {item.details && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {item.details.en}
                </p>
              )}
            </div>

            {isRevealed && (
              <div className="flex-shrink-0 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {item.year}
                </Badge>
                {isCorrectPosition ? (
                  <CheckCircle2 className="size-5 text-green-600" />
                ) : (
                  <XCircle className="size-5 text-red-600" />
                )}
              </div>
            )}

            {!isRevealed && (
              <div className="flex-shrink-0">
                <ArrowUpDown className="size-4 text-muted-foreground" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Mock challenge data
const MOCK_CHALLENGE: PutInOrderChallenge = {
  id: "pio-1",
  category: { en: "World Cup Finals" },
  description: { en: "Arrange these World Cup finals by year (oldest to newest)" },
  totalQuestions: 3,
  rewards: { perfect: 200 },
  items: [
    { id: "wc-1", name: { en: "Germany 1-0 Argentina" }, emoji: "🇩🇪", year: 2014 },
    { id: "wc-2", name: { en: "Spain 1-0 Netherlands" }, emoji: "🇪🇸", year: 2010 },
    { id: "wc-3", name: { en: "France 4-2 Croatia" }, emoji: "🇫🇷", year: 2018 },
    { id: "wc-4", name: { en: "Argentina 3-3 France (pen)" }, emoji: "🇦🇷", year: 2022 },
    { id: "wc-5", name: { en: "Italy 1-1 France (pen)" }, emoji: "🇮🇹", year: 2006 },
    { id: "wc-6", name: { en: "Brazil 2-0 Germany" }, emoji: "🇧🇷", year: 2002 },
    { id: "wc-7", name: { en: "France 3-0 Brazil" }, emoji: "🇫🇷", year: 1998 },
    { id: "wc-8", name: { en: "Brazil 0-0 Italy (pen)" }, emoji: "🇧🇷", year: 1994 },
  ],
};

function getRandomItems(challenge: PutInOrderChallenge, count: number): PutInOrderItem[] {
  const shuffled = [...challenge.items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function shuffleItems(items: PutInOrderItem[]): PutInOrderItem[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const INITIAL_ITEMS = getRandomItems(MOCK_CHALLENGE, 4);
const INITIAL_ORDER = shuffleItems(INITIAL_ITEMS);

export function PutInOrderGame({ onBack, onComplete }: PutInOrderGameProps) {
  const [challenge] = useState<PutInOrderChallenge>(MOCK_CHALLENGE);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundItems, setRoundItems] = useState<PutInOrderItem[]>(INITIAL_ITEMS);
  const [userOrder, setUserOrder] = useState<PutInOrderItem[]>(INITIAL_ORDER);
  const [isRevealed, setIsRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const startNewRound = useCallback(() => {
    const items = getRandomItems(challenge, 4);
    const shuffled = shuffleItems(items);
    setRoundItems(items);
    setUserOrder(shuffled);
    setIsRevealed(false);
  }, [challenge]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setUserOrder((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const checkOrder = () => {
    const correctOrder = [...roundItems].sort((a, b) => a.year - b.year);
    const isCorrect = userOrder.every(
      (item, index) => item.id === correctOrder[index].id
    );

    setIsRevealed(true);

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
      const coinsEarned = 50;
      setTotalCoins((prev) => prev + coinsEarned);
    }
  };

  const handleNextRound = () => {
    if (currentRound + 1 >= challenge.totalQuestions) {
      setShowResults(true);
    } else {
      setCurrentRound((prev) => prev + 1);
      startNewRound();
    }
  };

  const handleComplete = () => {
    const finalCoins =
      correctCount === challenge.totalQuestions
        ? challenge.rewards.perfect
        : totalCoins;
    onComplete(finalCoins);
  };

  const correctOrder = [...roundItems].sort((a, b) => a.year - b.year);
  const isCurrentOrderCorrect = (itemId: string, index: number) => {
    return correctOrder[index]?.id === itemId;
  };

  // Results Screen
  if (showResults) {
    const isPerfect = correctCount === challenge.totalQuestions;
    const finalCoins = isPerfect ? challenge.rewards.perfect : totalCoins;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="flex items-center justify-center size-9 rounded-xl hover:bg-secondary active:scale-95 transition-all"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="flex items-center gap-2">
                <Calendar className="size-6 text-primary" />
                <h1 className="text-xl font-bold">Challenge Complete!</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Results Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-8 pb-8 text-center">
              <div
                className={`inline-flex items-center justify-center size-20 rounded-full mb-4 ${
                  isPerfect ? "bg-primary/20" : "bg-secondary"
                }`}
              >
                <Trophy
                  className={`size-10 ${isPerfect ? "text-primary" : "text-muted-foreground"}`}
                />
              </div>

              <h2 className="text-2xl font-bold mb-2">
                {isPerfect ? "Perfect Score! 🎉" : "Challenge Complete!"}
              </h2>
              <p className="text-muted-foreground mb-6">{challenge.category.en}</p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <span className="text-sm text-muted-foreground">Correct Rounds</span>
                  <span className="text-lg font-bold">
                    {correctCount}/{challenge.totalQuestions}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                  <span className="text-lg font-bold">
                    {Math.round((correctCount / challenge.totalQuestions) * 100)}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                  <span className="text-sm font-medium">Coins Earned</span>
                  <div className="flex items-center gap-1.5">
                    <Coins className="size-4 text-primary" />
                    <span className="text-lg font-bold">{finalCoins}</span>
                  </div>
                </div>
              </div>

              <Button onClick={handleComplete} className="w-full" size="lg">
                Collect Rewards
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onBack}
              className="flex items-center justify-center size-9 rounded-xl hover:bg-secondary active:scale-95 transition-all"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Calendar className="size-5 text-primary" />
                <h1 className="text-lg font-bold">Put in Order</h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {challenge.category.en}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              <Coins className="size-3 mr-1" />
              {totalCoins}
            </Badge>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${((currentRound + 1) / challenge.totalQuestions) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {currentRound + 1}/{challenge.totalQuestions}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Instructions */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <ArrowUpDown className="size-4 text-primary" />
              </div>
              <div className="text-sm">
                <p className="mb-1">
                  <span className="font-medium">Drag and drop</span> to arrange these
                  items in chronological order from{" "}
                  <span className="font-medium">oldest to newest</span>.
                </p>
                <p className="text-xs text-muted-foreground">
                  {challenge.description.en}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sortable Items */}
        <div className="space-y-2 mb-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={userOrder.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {userOrder.map((item, index) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  index={index}
                  isRevealed={isRevealed}
                  isCorrectPosition={
                    isRevealed ? isCurrentOrderCorrect(item.id, index) : undefined
                  }
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Action Button */}
        {!isRevealed ? (
          <Button onClick={checkOrder} className="w-full" size="lg">
            Submit Order
          </Button>
        ) : (
          <div className="space-y-3">
            <Card
              className={`${
                userOrder.every((item, idx) => isCurrentOrderCorrect(item.id, idx))
                  ? "border-green-500/50 bg-green-500/5"
                  : "border-red-500/50 bg-red-500/5"
              }`}
            >
              <CardContent className="pt-4 pb-4 text-center">
                {userOrder.every((item, idx) =>
                  isCurrentOrderCorrect(item.id, idx)
                ) ? (
                  <>
                    <CheckCircle2 className="size-8 text-green-600 mx-auto mb-2" />
                    <p className="text-green-600 font-medium mb-1">
                      Perfect! +50 coins
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You got the chronological order correct!
                    </p>
                  </>
                ) : (
                  <>
                    <XCircle className="size-8 text-red-600 mx-auto mb-2" />
                    <p className="text-red-600 font-medium mb-1">Not quite right</p>
                    <p className="text-xs text-muted-foreground">
                      Check the correct years above
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Button onClick={handleNextRound} className="w-full" size="lg">
              {currentRound + 1 >= challenge.totalQuestions
                ? "View Results"
                : "Next Round"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
