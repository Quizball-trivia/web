'use client';

import { useState, useEffect, useRef } from 'react';
import { BanCategoryView } from '@/features/play/RankedCategoryBlockingScreen';
import { HalftimeScreen } from '@/features/possession/components/HalftimeScreen';
import type { AvatarCustomization } from '@/types/game';

type BanPhase = 'first' | 'second';

const MOCK_CATEGORIES = [
  { id: 'cat-league-1', name: 'League 1', icon: '⚽', imageUrl: null },
  { id: 'cat-champions', name: 'Champions League', icon: '🏆', imageUrl: null },
  { id: 'cat-00s-era', name: '00s Era', icon: '⚽', imageUrl: null },
];

const MOCK_PLAYER_AVATAR_CUSTOMIZATION = {
  skin: 'skin_male_white',
  jersey: 'jersey_green',
  hair: 'hair_boy_basic',
} satisfies AvatarCustomization;
const MOCK_OPPONENT_AVATAR_CUSTOMIZATION = {
  skin: 'skin_male_dark',
  jersey: 'jersey_red',
  hair: 'hair_boy_basic',
} satisfies AvatarCustomization;

/**
 * Preview route for the ranked banning screens.
 * Toggles between the pre-match ban UI (first half) and the halftime ban UI
 * (second half) so the design can be iterated on without running a live ranked match.
 */
export default function BanPagePreview() {
  const [phaseMode, setPhaseMode] = useState<BanPhase>('first');
  const [halftimeDeadlineAt, setHalftimeDeadlineAt] = useState(() =>
    new Date(Date.now() + 20_000).toISOString()
  );

  // First-half state
  const [firstHalfPlayerBannedId, setFirstHalfPlayerBannedId] = useState<string | null>(null);
  const [soundMuted, setSoundMuted] = useState(false);

  // Second-half (halftime) state — both start null; AI ban is triggered
  // after the player bans (to simulate the AI "thinking" and taking its turn).
  const [halftimeMyBan, setHalftimeMyBan] = useState<string | null>(null);
  const [halftimeOppBan, setHalftimeOppBan] = useState<string | null>(null);
  const aiBanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const firstHalfCurrentActor: 'player' | 'opponent' = firstHalfPlayerBannedId ? 'opponent' : 'player';
  const firstHalfPhase: 'ban' | 'ready' = firstHalfPlayerBannedId ? 'ready' : 'ban';

  // Reset halftime state when the toggle is switched so the user sees the
  // clean initial UI (no pre-banned cards) on every switch into second-half.
  useEffect(() => {
    if (phaseMode !== 'second') return;
    queueMicrotask(() => {
      setHalftimeMyBan(null);
      setHalftimeOppBan(null);
      setHalftimeDeadlineAt(new Date(Date.now() + 20_000).toISOString());
    });
    return () => {
      if (aiBanTimerRef.current) {
        clearTimeout(aiBanTimerRef.current);
        aiBanTimerRef.current = null;
      }
    };
  }, [phaseMode]);

  // Once the player bans, simulate the AI taking its turn after ~1.2s.
  useEffect(() => {
    if (phaseMode !== 'second') return;
    if (!halftimeMyBan || halftimeOppBan) return;
    if (aiBanTimerRef.current) clearTimeout(aiBanTimerRef.current);
    aiBanTimerRef.current = setTimeout(() => {
      const available = MOCK_CATEGORIES.filter((c) => c.id !== halftimeMyBan);
      if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)];
        setHalftimeOppBan(pick.id);
      }
      aiBanTimerRef.current = null;
    }, 1200);
    return () => {
      if (aiBanTimerRef.current) {
        clearTimeout(aiBanTimerRef.current);
        aiBanTimerRef.current = null;
      }
    };
  }, [phaseMode, halftimeMyBan, halftimeOppBan]);

  return (
    <div className="relative min-h-dvh">
      {/* ── Mode toggle (fixed top-center) ── */}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center">
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0a1318]/80 p-1 backdrop-blur-sm shadow-xl">
          <button
            type="button"
            onClick={() => setPhaseMode('first')}
            className={`rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] transition ${
              phaseMode === 'first' ? 'bg-[#1CB0F6] text-white' : 'text-white/60 hover:text-white'
            }`}
            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
          >
            1st Half
          </button>
          <button
            type="button"
            onClick={() => setPhaseMode('second')}
            className={`rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] transition ${
              phaseMode === 'second' ? 'bg-[#FF9600] text-white' : 'text-white/60 hover:text-white'
            }`}
            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
          >
            2nd Half
          </button>
        </div>
      </div>

      {/* ── View ── */}
      {phaseMode === 'first' ? (
        <BanCategoryView
          player={{
            id: 'preview-player',
            username: 'Tazi',
            avatar: '',
            avatarCustomization: MOCK_PLAYER_AVATAR_CUSTOMIZATION,
            countryCode: 'ge',
            rankPoints: 1598,
            tier: 'Starting11',
          }}
          opponent={{
            id: 'preview-opponent',
            username: 'rustaveli99',
            avatar: '',
            avatarCustomization: MOCK_OPPONENT_AVATAR_CUSTOMIZATION,
            countryCode: 'us',
            rankPoints: 150,
            tier: 'Academy',
          }}
          categories={MOCK_CATEGORIES}
          playerBannedId={firstHalfPlayerBannedId}
          opponentBannedId={null}
          phase={firstHalfPhase}
          currentActor={firstHalfCurrentActor}
          timeLeft={14}
          h2h={{ winsA: 2, winsB: 1, total: 3 }}
          soundMuted={soundMuted}
          onToggleSound={() => setSoundMuted((prev) => !prev)}
          onBanCategory={(id) => setFirstHalfPlayerBannedId(id)}
        />
      ) : (
        <HalftimeScreen
          visible
          playerGoals={0}
          opponentGoals={1}
          playerName="Tazi"
          opponentName="nikushaa"
          playerAvatarUrl=""
          opponentAvatarUrl=""
          playerAvatarCustomization={MOCK_PLAYER_AVATAR_CUSTOMIZATION}
          opponentAvatarCustomization={MOCK_OPPONENT_AVATAR_CUSTOMIZATION}
          playerPosition={0}
          playerCountryCode="ge"
          opponentCountryCode="us"
          deadlineAt={halftimeDeadlineAt}
          categoryOptions={MOCK_CATEGORIES}
          mySeat={1}
          firstBanSeat={1}
          myBan={halftimeMyBan}
          opponentBan={halftimeOppBan}
          onBanCategory={(id) => setHalftimeMyBan(id)}
        />
      )}
    </div>
  );
}
