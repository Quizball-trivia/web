"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, X, Check, Clock, User, Shuffle } from 'lucide-react';
import type { CategorySummary } from '@/lib/domain';
import { useCategoriesList } from '@/lib/queries/categories.queries';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { motion, AnimatePresence } from 'framer-motion';

interface RankedCategoryBlockingScreenProps {
  opponent: { id: string; username: string; avatar: string; tier?: string };
  onCategoriesSelected: (categories: CategorySummary[]) => void;
  onBack: () => void;
}

export function RankedCategoryBlockingScreen({
  opponent,
  onCategoriesSelected,
}: RankedCategoryBlockingScreenProps) {
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [playerBlockedCategory, setPlayerBlockedCategory] = useState<string | null>(null);
  const [opponentBlockedCategory, setOpponentBlockedCategory] = useState<string | null>(null);
  const [phase, setPhase] = useState<'player-selecting' | 'waiting' | 'complete'>('player-selecting');
  const [timeLeft, setTimeLeft] = useState(15);
  const [isShuffling, setIsShuffling] = useState(true);
  const [slotCategories, setSlotCategories] = useState<CategorySummary[][]>([[], [], [], []]);
  const [stoppedSlots, setStoppedSlots] = useState<boolean[]>([false, false, false, false]);
  const { data, isLoading, isError } = useCategoriesList({
    limit: 200,
    page: 1,
    is_active: "true",
  });

  const allCategories = useMemo(() => data?.items ?? [], [data?.items]);

  const handleBlockCategory = useCallback((categoryId: string) => {
    if (playerBlockedCategory || phase !== 'player-selecting') return;
    setPlayerBlockedCategory(categoryId);
    setPhase('waiting');
  }, [playerBlockedCategory, phase]);

  // Generate 4 random categories on mount with slot machine animation
  useEffect(() => {
    if (allCategories.length < 4) return;
    // Pick the final 4 categories
    const finalCategories = [...allCategories].sort(() => Math.random() - 0.5).slice(0, 4);
    
    // Initialize each slot with random cycling categories
    const initialSlots = [0, 1, 2, 3].map(() => 
      [...allCategories].sort(() => Math.random() - 0.5).slice(0, 5)
    );
    const initTimer = setTimeout(() => {
      setCategories(finalCategories);
      setSlotCategories(initialSlots);
    }, 0);
    
    // Cycle through categories for each slot
    const cycleIntervals = [0, 1, 2, 3].map((slotIndex) => {
      return setInterval(() => {
        setSlotCategories(prev => {
          const newSlots = [...prev];
          newSlots[slotIndex] = [...allCategories].sort(() => Math.random() - 0.5).slice(0, 1);
          return newSlots;
        });
      }, 100); // Cycle every 100ms
    });
    
    // Stop each slot one by one with delays
    const stopTimers = [0, 1, 2, 3].map((slotIndex) => {
      return setTimeout(() => {
        clearInterval(cycleIntervals[slotIndex]);
        
        // Set the final category for this slot
        setSlotCategories(prev => {
          const newSlots = [...prev];
          newSlots[slotIndex] = [finalCategories[slotIndex]];
          return newSlots;
        });
        
        // Mark this slot as stopped
        setStoppedSlots(prev => {
          const newStopped = [...prev];
          newStopped[slotIndex] = true;
          return newStopped;
        });
        
        // If this is the last slot, end shuffling
        if (slotIndex === 3) {
          setTimeout(() => {
            setIsShuffling(false);
          }, 400);
        }
      }, 1000 + (slotIndex * 600)); // Stop each slot 600ms after the previous
    });
    
    return () => {
      clearTimeout(initTimer);
      cycleIntervals.forEach(clearInterval);
      stopTimers.forEach(clearTimeout);
    };
  }, [allCategories]);

  // Timer countdown
  useEffect(() => {
    // Don't start timer until shuffling is complete
    if (isShuffling) return;
    
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (phase === 'player-selecting' && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && phase === 'player-selecting' && !playerBlockedCategory) {
      // Auto-select random category if time runs out
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      timer = setTimeout(() => {
        handleBlockCategory(randomCategory.id);
      }, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [timeLeft, phase, playerBlockedCategory, categories, isShuffling, handleBlockCategory]);

  // Simulate opponent blocking after player blocks
  useEffect(() => {
    if (phase === 'waiting') {
      const timer = setTimeout(() => {
        // Opponent blocks a random category (that player didn't block)
        const availableCategories = categories.filter(c => c.id !== playerBlockedCategory);
        const randomCategory = availableCategories[Math.floor(Math.random() * availableCategories.length)];
        setOpponentBlockedCategory(randomCategory.id);
        setPhase('complete');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, categories, playerBlockedCategory]);

  // Auto-proceed after both have blocked
  useEffect(() => {
    if (phase === 'complete') {
      const timer = setTimeout(() => {
        // Get the 2 remaining categories
        const remainingCategories = categories.filter(
          c => c.id !== playerBlockedCategory && c.id !== opponentBlockedCategory
        );
        onCategoriesSelected(remainingCategories);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, categories, playerBlockedCategory, opponentBlockedCategory, onCategoriesSelected]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading categories...</span>
      </div>
    );
  }

  if (isError || allCategories.length < 4) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Unable to load categories</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background football-pitch-bg flex flex-col dark">
      {/* Header */}
      <div className="border-b border-primary/20 bg-card/50 backdrop-blur-sm sticky top-0 z-10 stadium-glow">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl bg-gradient-to-r from-primary to-green-300 bg-clip-text text-transparent font-bold">
                Category Selection
              </h1>
              <p className="text-sm text-muted-foreground">Block one category</p>
            </div>
            {isShuffling ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/40">
                <Shuffle className="size-4 text-primary animate-pulse" />
                <span className="text-sm font-semibold text-primary">Randomizing...</span>
              </div>
            ) : phase === 'player-selecting' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40">
                <Clock className="size-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-300">{timeLeft}s</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Players Info */}
      {!isShuffling && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            {/* Player */}
            <div className="flex-1 bg-card/50 border border-primary/30 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">😊</span>
                <span className="text-sm font-semibold">You</span>
              </div>
              {playerBlockedCategory ? (
                <Badge className="bg-red-600 text-white text-xs">
                  <X className="size-3 mr-1" />
                  Blocked
                </Badge>
              ) : (
                <Badge className="bg-primary text-white text-xs">
                  <Shield className="size-3 mr-1" />
                  Selecting...
                </Badge>
              )}
            </div>

            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">VS</span>
            </div>

            {/* Opponent */}
            <div className="flex-1 bg-card/50 border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{opponent.avatar}</span>
                <span className="text-sm font-semibold truncate">{opponent.username}</span>
              </div>
              {opponentBlockedCategory ? (
                <Badge className="bg-red-600 text-white text-xs">
                  <X className="size-3 mr-1" />
                  Blocked
                </Badge>
              ) : phase === 'waiting' ? (
                <Badge className="bg-yellow-600 text-white text-xs">
                  <Shield className="size-3 mr-1 animate-pulse" />
                  Blocking...
                </Badge>
              ) : (
                <Badge className="bg-muted text-muted-foreground text-xs">
                  <User className="size-3 mr-1" />
                  Waiting
                </Badge>
              )}
            </div>
          </div>

          {/* Phase Message */}
          <div className="text-center py-2">
            {phase === 'player-selecting' && (
              <p className="text-sm text-muted-foreground">
                Choose a category to <span className="text-red-400 font-semibold">block</span>
              </p>
            )}
            {phase === 'waiting' && (
              <p className="text-sm text-muted-foreground">
                Waiting for <span className="text-primary font-semibold">{opponent.username}</span> to block...
              </p>
            )}
            {phase === 'complete' && (
              <div className="flex items-center justify-center gap-2 text-primary">
                <Check className="size-5" />
                <p className="text-sm font-semibold">Categories selected! Starting match...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Categories Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((slotIndex) => {
            const category = slotCategories[slotIndex]?.[0] || categories[slotIndex];
            const isStopped = stoppedSlots[slotIndex];
            const isPlayerBlocked = !isShuffling && playerBlockedCategory === category?.id;
            const isOpponentBlocked = !isShuffling && opponentBlockedCategory === category?.id;
            const isBlocked = isPlayerBlocked || isOpponentBlocked;
            const isSelectable = !isShuffling && phase === 'player-selecting' && !playerBlockedCategory;

            if (!category) return null;

            return (
              <motion.div
                key={slotIndex}
                className={`
                  relative overflow-hidden rounded-2xl h-[140px] transition-all
                  ${!isShuffling && isBlocked
                    ? 'opacity-50'
                    : !isShuffling && isSelectable
                    ? 'cursor-pointer active:scale-95 hover:shadow-xl hover:shadow-primary/30'
                    : 'opacity-60'
                  }
                `}
                onClick={() => !isShuffling && isSelectable && handleBlockCategory(category.id)}
                animate={!isStopped && isShuffling ? {
                  y: [0, -10, 0],
                } : {}}
                transition={!isStopped && isShuffling ? {
                  duration: 0.3,
                  repeat: Infinity,
                  ease: "linear"
                } : {
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }}
              >
                {/* Background Image */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="absolute inset-0"
                  >
                    {category.imageUrl ? (
                      <>
                        <ImageWithFallback 
                          src={category.imageUrl}
                          alt={category.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Border */}
                <div className={`absolute inset-0 border-2 ${
                  isBlocked
                    ? 'border-red-500/60'
                    : !isShuffling && isSelectable
                    ? 'border-primary/60'
                    : isShuffling && isStopped
                    ? 'border-primary/80 shadow-lg shadow-primary/30'
                    : 'border-primary/40'
                }`} />

                {/* Spinning overlay */}
                {isShuffling && !isStopped && (
                  <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px]">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Shuffle className="size-8 text-primary animate-spin" />
                    </div>
                  </div>
                )}

                {/* Stopped glow effect */}
                {isShuffling && isStopped && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 bg-primary/30"
                  />
                )}

                {/* Blocked overlay */}
                {!isShuffling && isBlocked && (
                  <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center backdrop-blur-[2px]">
                    <div className="text-center">
                      <X className="size-12 text-red-400 mx-auto mb-1" />
                      <span className="text-xs text-red-200 font-semibold">
                        {isPlayerBlocked ? 'You blocked' : `${opponent.username} blocked`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="relative h-full p-3 flex flex-col justify-between">
                  <div className="size-10 flex items-center justify-center rounded-lg bg-background/20 backdrop-blur-sm border border-white/20 text-xl">
                    {category.icon}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white line-clamp-2">
                      {category.name}
                    </h3>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Remaining Categories Preview */}
        {phase === 'complete' && (
          <div className="mt-6 p-4 bg-primary/10 border-2 border-primary/40 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Check className="size-5 text-primary" />
              <h3 className="font-semibold text-primary">Match Categories:</h3>
            </div>
            <div className="flex gap-2">
              {categories
                .filter(c => c.id !== playerBlockedCategory && c.id !== opponentBlockedCategory)
                .map((category) => (
                  <div
                    key={category.id}
                    className="flex-1 bg-primary/20 rounded-lg p-3 text-center"
                  >
                    <div className="text-2xl mb-1">{category.icon}</div>
                    <p className="text-xs font-medium">{category.name}</p>
                  </div>
                ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              5 questions from each category • 10 questions total
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
