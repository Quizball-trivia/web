"use client";

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { MatchHeader } from './components/MatchHeader';
import { CategoryGameCard } from './components/CategoryGameCard';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { getSocket } from '@/lib/realtime/socket-client';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuthStore } from '@/stores/auth.store';
import { logger } from '@/utils/logger';
import type { CategorySummary } from '@/lib/domain';

export function RankedCategoryBlockingScreen() {
  const { player } = usePlayer();
  const authUser = useAuthStore((state) => state.user);
  const selfUserId = authUser?.id ?? player.id;
  const lobby = useRealtimeMatchStore((state) => state.lobby);
  const draft = useRealtimeMatchStore((state) => state.draft);
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    if (!draft) return;
    setTimeLeft(15);
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [draft?.turnUserId, draft?.allowedCategoryIds, draft?.categories]);

  const opponent = useMemo(() => {
    const opponentMember = lobby?.members.find((member) => member.userId !== selfUserId);
    return {
      id: opponentMember?.userId ?? 'opponent',
      username: opponentMember?.username ?? 'Opponent',
      avatar: opponentMember?.avatarUrl ?? '😈',
      tier: undefined,
    };
  }, [lobby?.members, selfUserId]);

  if (!draft || !lobby) {
     return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  const phase = draft.allowedCategoryIds ? 'ready' : 'ban';
  const currentActor = draft.turnUserId === selfUserId ? 'player' : 'opponent';
  const playerBannedId = draft.bans[selfUserId ?? ''] ?? null;
  const opponentBannedId = Object.entries(draft.bans).find(([userId]) => userId !== selfUserId)?.[1] ?? null;
  const poolCategories = draft.categories;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
       
       <MatchHeader 
          player={{ username: player.username, avatar: player.avatar, rp: player.rankPoints ?? 1200 }} 
          opponent={{ ...opponent, rp: player.rankPoints ? player.rankPoints - 50 : 1150 }} 
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
                const cardCategory: CategorySummary = {
                   id: category.id,
                   name: category.name,
                   slug: category.id,
                   icon: category.icon,
                };
                let state: 'default' | 'selected' | 'banned' | 'opponent-banned' = 'default';
                
                if (category.id === playerBannedId) state = 'banned'; 
                else if (category.id === opponentBannedId) state = 'opponent-banned';

                const disabled = (!!playerBannedId && category.id !== playerBannedId && phase === 'ban') ||
                                 (!!opponentBannedId && category.id === opponentBannedId) ||
                                 currentActor !== 'player';

                return (
                   <CategoryGameCard 
                      key={category.id} 
                      category={cardCategory} 
                      state={state}
                      disabled={disabled}
                      onClick={() => {
                        if (currentActor !== 'player' || phase !== 'ban') return;
                        getSocket().emit('draft:ban', { categoryId: category.id });
                        logger.info('Socket emit draft:ban', { categoryId: category.id });
                      }}
                   />
                );
             })}
          </div>
       </div>

       {/* Bottom Action Bar (Pick Phase) */}

    </div>
  );
}
