"use client";

import { Button } from '@/components/ui/button';
import { MatchHeader, DraftPhase } from './components/MatchHeader';
import { CategoryGameCard } from './components/CategoryGameCard';
import { toast } from 'sonner';
import { CategorySummary } from '@/lib/domain';
import { useDraftLogic } from './hooks/useDraftLogic';
import { Loader2 } from 'lucide-react';

interface RankedCategoryBlockingScreenProps {
  opponent: { id: string; username: string; avatar: string; tier?: string };
  onCategoriesSelected: (categories: CategorySummary[]) => void;
  onBack: () => void;
}

export function RankedCategoryBlockingScreen({
  opponent,
  onCategoriesSelected,
}: RankedCategoryBlockingScreenProps) {
  
  const { state, actions } = useDraftLogic({ onCategoriesSelected });
  
  const { 
     phase, timeLeft, currentActor, poolCategories, 
     playerBannedId, opponentBannedId, isLoading 
  } = state;

  if (isLoading) {
     return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
       
       <MatchHeader 
          player={{ username: 'You', avatar: '😊', rp: 1200 }} 
          opponent={{ ...opponent, rp: 1150 }} // Use passed opponent, mock rp if missing
          phase={phase}
          timeLeft={timeLeft}
          currentActor={currentActor}
       />

       <div className="flex-1 container mx-auto max-w-5xl p-4">
          <div className="text-center mb-6">
             <h2 className="text-2xl font-black uppercase italic tracking-tight text-foreground">
                {phase === 'ban' ? "Ban a Category" : "Get Ready!"}
             </h2>
             <p className="text-muted-foreground text-sm">
                {phase === 'ban' ? "The banned category will be removed. Playing remaining 2." : "Match starting with remaining categories..."}
             </p>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
             {poolCategories.map(category => {
                let state: 'default' | 'selected' | 'banned' | 'opponent-banned' = 'default';
                
                if (category.id === playerBannedId) state = 'banned'; 
                else if (category.id === opponentBannedId) state = 'opponent-banned';

                const disabled = (!!playerBannedId && category.id !== playerBannedId && phase === 'ban') ||
                                 (!!opponentBannedId && category.id === opponentBannedId);

                return (
                   <CategoryGameCard 
                      key={category.id} 
                      category={category} 
                      state={state}
                      disabled={disabled || (currentActor !== 'player' && phase === 'ban')}
                      onClick={() => actions.handleCategoryClick(category)}
                   />
                );
             })}
          </div>
       </div>

       {/* Bottom Action Bar (Pick Phase) */}

    </div>
  );
}
