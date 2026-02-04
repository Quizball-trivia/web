"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MatchHeader, DraftPhase } from './components/MatchHeader';
import { CategoryGameCard } from './components/CategoryGameCard';
import { useCategoriesList } from '@/lib/queries/categories.queries';
import { CategorySummary } from '@/lib/domain';
import { usePlayer } from '@/contexts/PlayerContext';
import { LoadingScreen } from '@/components/shared/LoadingScreen';

export function DraftPhaseScreen() {
  const router = useRouter();
  const { player } = usePlayer();
  
  // Game State
  const [phase, setPhase] = useState<DraftPhase>('ban');
  const [timeLeft, setTimeLeft] = useState(15);
  const [timerExpired, setTimerExpired] = useState(false);
  const [currentActor, setCurrentActor] = useState<'player' | 'opponent'>('player');
  
  // Selections
  const [playerBannedId, setPlayerBannedId] = useState<string | null>(null);
  const [opponentBannedId, setOpponentBannedId] = useState<string | null>(null);
  const [playerPickedIds, setPlayerPickedIds] = useState<string[]>([]);
  
  // Fetch Categories
  const { data, isLoading } = useCategoriesList({ limit: 6, is_active: "true" }); // Fetch 6 for a small draft pool
  
  // Derived Categories (Simulate a random pool if we get many, but for now take first 6)
  const poolCategories = useMemo(() => data?.items?.slice(0, 6) || [], [data?.items]);

  // Mock Opponent
  const opponent = {
    username: "Rival_X",
    avatar: "😈",
    rp: 1450
  };

  // Timer Logic
  const handleTimeExpired = useCallback(() => {
    // Determine next step based on phase and actor
    if (phase === 'ban') {
      if (currentActor === 'player' && !playerBannedId) {
        // Auto-ban random
        const available = poolCategories.filter(c => c.id !== opponentBannedId && c.id !== playerBannedId);
        if (available.length > 0) {
          const pick = available[0];
          setPlayerBannedId(pick.id);
          setCurrentActor('opponent');
          setTimeLeft(15);
        }
      } else if (currentActor === 'opponent') {
        // Opponent auto-ban
        const available = poolCategories.filter(c => c.id !== playerBannedId);
        const pick = available[0];
        if (!pick) return;
        setOpponentBannedId(pick.id);
        toast("Opponent banned " + pick.name);
        // Move to Pick phase
        setPhase('pick');
        setCurrentActor('player');
        setTimeLeft(30);
      }
    } else if (phase === 'pick') {
      // Logic for picking... simplified for this demo to just finish
      setPhase('ready');
    }
  }, [phase, currentActor, playerBannedId, opponentBannedId, poolCategories]);

  useEffect(() => {
    if (phase === 'ready') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimerExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (timerExpired) {
      // Handle timer expiration and reset flag - intentional sync pattern
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleTimeExpired();
      setTimerExpired(false);
    }
  }, [timerExpired, handleTimeExpired]);

  // Bot Opponent Logic Simulation
  useEffect(() => {
    if (currentActor === 'opponent' && timeLeft > 10) {
       // Simulate opponent thinking and acting quickly
       const reactionTime = Math.random() * 2000 + 1000;
       const timer = setTimeout(() => {
          if (phase === 'ban') {
             const available = poolCategories.filter(c => c.id !== playerBannedId);
             const random = available[Math.floor(Math.random() * available.length)];
             if (random) setOpponentBannedId(random.id);
             setPhase('pick');
             setCurrentActor('player');
             setTimeLeft(30);
          }
       }, reactionTime);
       return () => clearTimeout(timer);
    }
  }, [currentActor, phase, playerBannedId, poolCategories, timeLeft]);


  const handleCategoryClick = (category: CategorySummary) => {
    if (currentActor !== 'player') return;
    if (playerBannedId === category.id || opponentBannedId === category.id) return;

    if (phase === 'ban') {
      setPlayerBannedId(category.id);
      setCurrentActor('opponent');
      setTimeLeft(15); // Reset timer for opponent
    } else if (phase === 'pick') {
       if (playerPickedIds.includes(category.id)) {
          setPlayerPickedIds(prev => prev.filter(id => id !== category.id));
       } else if (playerPickedIds.length < 3) {
          setPlayerPickedIds(prev => [...prev, category.id]);
       }
    }
  };

  const handleConfirmFunction = () => {
     if (phase === 'pick' && playerPickedIds.length > 0) {
        setPhase('ready');
        // Navigate to game logic
        toast.success("Categories locked! Match starting...");
        setTimeout(() => router.push('/game'), 1500);
     }
  };


  if (isLoading || poolCategories.length === 0) {
     return <LoadingScreen text="Loading Categories..." />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
       
       <MatchHeader 
          player={{ username: player.username || "You", avatar: player.avatar || "😊", rp: player.rankPoints || 0 }}
          opponent={opponent}
          phase={phase}
          timeLeft={timeLeft}
          currentActor={currentActor}
       />

       <div className="flex-1 container mx-auto max-w-5xl p-4">
          <div className="text-center mb-6">
             <h2 className="text-2xl font-black uppercase italic tracking-tight">
                {phase === 'ban' ? "Ban a Category" : "Vote 3 Categories"}
             </h2>
             <p className="text-muted-foreground text-sm">
                {phase === 'ban' ? "The banned category will be removed from the match." : "Questions will be drawn from these categories."}
             </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
             {poolCategories.map(category => {
                let state: 'default' | 'selected' | 'banned' | 'opponent-banned' = 'default';
                
                if (category.id === playerBannedId) state = 'banned'; // You banned (red)
                else if (category.id === opponentBannedId) state = 'opponent-banned';
                else if (playerPickedIds.includes(category.id)) state = 'selected'; // You picked (green)

                // If picked or banned, allow no further interaction unless toggling pick
                const disabled = (!!playerBannedId && category.id !== playerBannedId && phase === 'ban') ||
                                 (!!opponentBannedId && category.id === opponentBannedId);

                return (
                   <CategoryGameCard 
                      key={category.id} 
                      category={category} 
                      state={state}
                      disabled={disabled || (currentActor !== 'player')}
                      onClick={() => handleCategoryClick(category)}
                   />
                );
             })}
          </div>
       </div>

       {/* Bottom Action Bar (Pick Phase) */}
       {phase === 'pick' && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur border-t border-border">
             <div className="container mx-auto max-w-md">
                <Button 
                   size="lg" 
                   className="w-full font-black text-lg uppercase"
                   disabled={playerPickedIds.length === 0}
                   onClick={handleConfirmFunction}
                >
                   Confirm Selection ({playerPickedIds.length}/3)
                </Button>
             </div>
          </div>
       )}
    </div>
  );
}
