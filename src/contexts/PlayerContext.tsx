import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { mockCurrentPlayer } from '@/data/mockData';
import type { PlayerStats } from '@/types/game';

interface PlayerContextValue {
  player: PlayerStats;
  /** TODO: temporary escape hatch for zero-diff migration — remove once game handlers move out of App.tsx */
  setPlayer: React.Dispatch<React.SetStateAction<PlayerStats>>;
  updateCoins: (delta: number) => void;
  addXP: (amount: number) => void;
  unlockItem: (itemId: string) => void;
  updateStats: (updates: Partial<PlayerStats>) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<PlayerStats>(mockCurrentPlayer);

  const updateCoins = useCallback((delta: number) => {
    setPlayer(p => ({ ...p, coins: Math.max(0, p.coins + delta) }));
  }, []);

  const addXP = useCallback((amount: number) => {
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
  }, []);

  const unlockItem = useCallback((itemId: string) => {
    setPlayer(p => ({
      ...p,
      ownedItems: p.ownedItems.includes(itemId) ? p.ownedItems : [...p.ownedItems, itemId],
    }));
  }, []);

  const updateStats = useCallback((updates: Partial<PlayerStats>) => {
    setPlayer(p => ({ ...p, ...updates }));
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<PlayerContextValue>(() => ({
    player,
    setPlayer,
    updateCoins,
    addXP,
    unlockItem,
    updateStats,
  }), [player, updateCoins, addXP, unlockItem, updateStats]);

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
