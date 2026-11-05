'use client';

/**
 * Dev (/dev/zone-match/search): the searching-screen directions side by side — pick one, set when the opponent is
 * found (or find them now), replay. "Current" is today's world map.
 */

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { AvatarCustomization } from '@/types/game';
import { MatchmakingMapScreen } from '@/features/matchmaking/MatchmakingMapScreen';
import type { OpponentInfo } from '@/lib/realtime/socket.types';
import type { CardId } from '../zoneMatch.cards';
import { randomSeat, type SearchScreenProps } from './searchShared';
import { SearchScoutReel } from './SearchScoutReel';
import { SearchKeepyUppy } from './SearchKeepyUppy';
import { SearchStadium3D } from './SearchStadium3D';
import { SearchTunnel3D } from './SearchTunnel3D';

const DIRECTIONS = [
  { id: 'stadium', label: '1 · Night stadium (3D)', Screen: SearchStadium3D },
  { id: 'tunnel', label: '2 · Tunnel walk-out (3D)', Screen: SearchTunnel3D },
  { id: 'reel', label: '3 · Scout reel', Screen: SearchScoutReel },
  { id: 'keepy', label: '4 · Keepy-uppy warm-up', Screen: SearchKeepyUppy },
  { id: 'map', label: 'Current · world map', Screen: null },
] as const;

const SELF = { name: 'You', avatarCustomization: { skin: 'skin_male_white', jersey: 'jersey_green', hair: 'hair_boy_basic' } as AvatarCustomization, rankPoints: 640 };
const DECK: CardId[] = ['golden-boot', 'captains-armband', 'fog'];
const FOUND_AFTER = [4, 8, 15, null] as const;

export function ZoneMatchSearchLab() {
  const [direction, setDirection] = useState<(typeof DIRECTIONS)[number]['id']>('stadium');
  const [after, setAfter] = useState<(typeof FOUND_AFTER)[number]>(8);
  const [run, setRun] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [found, setFound] = useState(false);
  const opponent = useMemo(() => ({ ...randomSeat(run * 17 + 5), name: 'ElTitan' }), [run]);

  useEffect(() => {
    if (after === null || found) return;
    const id = window.setTimeout(() => setFound(true), Math.max(0, startedAt + after * 1000 - Date.now()));
    return () => window.clearTimeout(id);
  }, [after, found, startedAt]);

  const restart = () => {
    setRun((r) => r + 1);
    setStartedAt(Date.now());
    setFound(false);
  };
  const props: SearchScreenProps = { self: SELF, deck: DECK, startedAt, opponent: found ? opponent : null, onCancel: restart };
  const active = DIRECTIONS.find((d) => d.id === direction)!;
  const mapOpponent: OpponentInfo | null = found ? { id: 'dev', username: opponent.name, avatarUrl: null, city: 'Tbilisi', country: 'Georgia', countryCode: 'GE', lat: 41.72, lon: 44.79 } : null;

  return (
    <div className="relative">
      {active.Screen ? (
        <active.Screen key={`${direction}-${run}`} {...props} />
      ) : (
        <MatchmakingMapScreen key={run} matchType="ranked" rankedSearchStartedAt={startedAt} rankedFoundOpponent={mapOpponent} selfUsername="You" selfAvatarCustomization={SELF.avatarCustomization} onCancel={restart} onRestart={restart} />
      )}
      <div className="fixed left-3 top-3 z-[100] flex max-w-[calc(100vw-24px)] flex-wrap items-center gap-1.5 rounded-2xl bg-black/70 p-2 font-poppins text-xs text-white backdrop-blur">
        {DIRECTIONS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => {
              setDirection(d.id);
              restart();
            }}
            className={cn('rounded-full px-3 py-1.5 font-bold', direction === d.id ? 'bg-brand-yellow text-black' : 'bg-white/10 hover:bg-white/20')}
          >
            {d.label}
          </button>
        ))}
        <span className="ml-2 text-white/50">Found after</span>
        {FOUND_AFTER.map((s) => (
          <button key={String(s)} type="button" onClick={() => { setAfter(s); restart(); }} className={cn('rounded-full px-2 py-1', after === s ? 'bg-white text-black' : 'bg-white/10')}>
            {s === null ? 'never' : `${s}s`}
          </button>
        ))}
        <button type="button" onClick={() => setFound(true)} className="rounded-full bg-[#58CC02] px-3 py-1 font-bold">Find now</button>
        <button type="button" onClick={restart} className="rounded-full bg-white/10 px-3 py-1">Replay</button>
      </div>
    </div>
  );
}
