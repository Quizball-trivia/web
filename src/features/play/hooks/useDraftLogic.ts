import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { CategorySummary } from '@/lib/domain';
import { useCategoriesList } from '@/lib/queries/categories.queries';

export type DraftPhase = 'ban' | 'pick' | 'ready';

interface UseDraftLogicProps {
  onCategoriesSelected: (categories: CategorySummary[]) => void;
}

export function useDraftLogic({ onCategoriesSelected }: UseDraftLogicProps) {
  // Game State
  const [phase, setPhase] = useState<DraftPhase>('ban');
  const [timeLeft, setTimeLeft] = useState(15);
  const [currentActor, setCurrentActor] = useState<'player' | 'opponent'>('player');
  
  // Selections
  const [playerBannedId, setPlayerBannedId] = useState<string | null>(null);
  const [opponentBannedId, setOpponentBannedId] = useState<string | null>(null);
  
  // Fetch Categories
  const { data, isLoading } = useCategoriesList({
    limit: 20, 
    page: 1,
    is_active: "true",
  });

  const [poolCategories, setPoolCategories] = useState<CategorySummary[]>([]);
  const [isSpinning, setIsSpinning] = useState(true);

  const allCategories = data?.items ?? [];

  // Spin Effect
  useEffect(() => {
    if (allCategories.length === 0) return;

    let spins = 0;
    const maxSpins = 20;
    const interval = setInterval(() => {
       const shuffled = [...allCategories].sort(() => 0.5 - Math.random()).slice(0, 4);
       setPoolCategories(shuffled);
       spins++;

       if (spins >= maxSpins) {
          clearInterval(interval);
          setIsSpinning(false);
          setPoolCategories([...allCategories].sort(() => 0.5 - Math.random()).slice(0, 4));
       }
    }, 100);

    return () => clearInterval(interval);
  }, [allCategories.length]); 

  // Timer Logic
  useEffect(() => {
    if (timeLeft > 0 && phase !== 'ready') {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleTimeExpired();
    }
  }, [timeLeft, phase]);

  const handleTimeExpired = () => {
    if (phase === 'ban') {
      if (currentActor === 'player' && !playerBannedId) {
        // Auto-ban
        const available = poolCategories.filter(c => c.id !== opponentBannedId && c.id !== playerBannedId);
        if (available.length > 0) handleCategoryClick(available[0]);
      } else if (currentActor === 'opponent') {
        const available = poolCategories.filter(c => c.id !== playerBannedId);
        const random = available[Math.floor(Math.random() * available.length)];
        if (random) setOpponentBannedId(random.id);
        setPhase('ready');
      }
    }
  };

  // Bot Opponent Logic
  useEffect(() => {
    if (currentActor === 'opponent' && timeLeft > 10) {
       const reactionTime = Math.random() * 2000 + 1000;
       const timer = setTimeout(() => {
          if (phase === 'ban') {
             const available = poolCategories.filter(c => c.id !== playerBannedId);
             const random = available[Math.floor(Math.random() * available.length)];
             if (random) {
                 setOpponentBannedId(random.id);
                 toast(`Opponent banned ${random.name}`);
             }
             setPhase('ready');
          }
       }, reactionTime);
       return () => clearTimeout(timer);
    }
  }, [currentActor, phase, playerBannedId, poolCategories]);

  // Handle completion
  useEffect(() => {
     if (phase === 'ready') {
        const remainingCategories = poolCategories.filter(c => c.id !== playerBannedId && c.id !== opponentBannedId);
        if (remainingCategories.length > 0) {
           setTimeout(() => {
              onCategoriesSelected(remainingCategories);
           }, 1500);
        }
     }
  }, [phase, playerBannedId, opponentBannedId, poolCategories, onCategoriesSelected]);


  const handleCategoryClick = (category: CategorySummary) => {
    if (currentActor !== 'player') return;
    if (playerBannedId === category.id || opponentBannedId === category.id) return;

    if (phase === 'ban') {
      setPlayerBannedId(category.id);
      setCurrentActor('opponent');
      setTimeLeft(15); 
    }
  };

  return {
    state: {
      phase,
      timeLeft,
      currentActor,
      poolCategories,
      playerBannedId,
      opponentBannedId,
      isLoading, 
      isSpinning
    },
    actions: {
      handleCategoryClick
    }
  };
}
