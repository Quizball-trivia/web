import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { mockCurrentPlayer } from '@/data/mockData';
import type { PlayerProfile } from '@/lib/domain';
import { applyXpReward } from '@/lib/domain/matchXp';
import { useAuthStore } from '@/stores/auth.store';
import { useRankedProfile } from '@/lib/queries/ranked.queries';

interface PlayerContextValue {
  player: PlayerProfile;
  /** TODO: temporary escape hatch for zero-diff migration — remove once game handlers move out of App.tsx */
  setPlayer: React.Dispatch<React.SetStateAction<PlayerProfile>>;
  updateCoins: (delta: number) => void;
  addXP: (amount: number) => void;
  unlockItem: (itemId: string) => void;
  updateStats: (updates: Partial<PlayerProfile>) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<PlayerProfile>(mockCurrentPlayer);
  const authUser = useAuthStore((state) => state.user);
  const { data: rankedProfile } = useRankedProfile({ enabled: Boolean(authUser) });

  useEffect(() => {
    if (!authUser) return;

    const newId = authUser.id;
    const newUsername = authUser.nickname ?? authUser.email?.split('@')[0];
    const newAvatarUrl = authUser.avatar_url;

    // Sync auth user changes to player context - intentional synchronization pattern
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayer((prev) => {
      const hasChanges =
        (newId && newId !== prev.id) ||
        (newUsername && newUsername !== prev.username) ||
        (newAvatarUrl && newAvatarUrl !== prev.avatarCustomization?.base);

      if (!hasChanges) return prev;

      return {
        ...prev,
        id: newId ?? prev.id,
        username: newUsername ?? prev.username,
        avatarCustomization: newAvatarUrl
          ? { base: newAvatarUrl }
          : prev.avatarCustomization,
      };
    });
  }, [authUser]);

  const updateCoins = useCallback((delta: number) => {
    setPlayer(p => ({ ...p, coins: Math.max(0, p.coins + delta) }));
  }, []);

  const patchProgression = useAuthStore((s) => s.patchProgression);

  const addXP = useCallback((amount: number) => {
    const currentUser = useAuthStore.getState().user;
    if (currentUser?.progression) {
      // Authenticated: use domain formula and write back to auth store
      // so resolvedPlayer picks up the optimistic update immediately
      const updated = applyXpReward(currentUser.progression, amount);
      patchProgression(updated);
    } else {
      // Guest fallback: local state only
      setPlayer(p => {
        let newXP = p.xp + amount;
        let newLevel = p.level;
        let xpToNext = p.xpToNextLevel;

        while (newXP >= xpToNext) {
          newXP -= xpToNext;
          newLevel++;
          xpToNext = Math.floor(xpToNext * 1.2);
        }

        return { ...p, xp: newXP, level: newLevel, xpToNextLevel: xpToNext };
      });
    }
  }, [patchProgression]);

  const unlockItem = useCallback((itemId: string) => {
    setPlayer(p => ({
      ...p,
      ownedItems: p.ownedItems.includes(itemId) ? p.ownedItems : [...p.ownedItems, itemId],
    }));
  }, []);

  const updateStats = useCallback((updates: Partial<PlayerProfile>) => {
    setPlayer(p => ({ ...p, ...updates }));
  }, []);

  const resolvedPlayer = useMemo<PlayerProfile>(() => {
    const progression = authUser?.progression ?? null;
    return {
      ...player,
      rankPoints: rankedProfile?.placementStatus === 'placed' ? rankedProfile.rp : player.rankPoints,
      level: progression?.level ?? player.level,
      xp: progression?.currentLevelXp ?? player.xp,
      xpToNextLevel: progression?.xpForNextLevel ?? player.xpToNextLevel,
    };
  }, [authUser?.progression, player, rankedProfile]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<PlayerContextValue>(() => ({
    player: resolvedPlayer,
    setPlayer,
    updateCoins,
    addXP,
    unlockItem,
    updateStats,
  }), [resolvedPlayer, updateCoins, addXP, unlockItem, updateStats]);

  return (
    <PlayerContext.Provider value={contextValue}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within PlayerProvider');
  return context;
}
