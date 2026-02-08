import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { ModeConfirmModal } from '@/features/play/components/ModeConfirmModal';
import { FriendPlayModal } from '@/features/friend/components/FriendPlayModal';
import type { PlayerStats } from '@/types/game';
import { CHALLENGES } from '../tournaments/GameHubScreen';
import { logger } from '@/utils/logger';
import { getDivisionColor, getDivisionEmoji, getRankInfo } from '@/utils/rankSystem';

// ── Soccer SVG Icons ──
function SoccerBall({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2 L14 8 L20 8 L15 12.5 L17 19 L12 15 L7 19 L9 12.5 L4 8 L10 8 Z" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function Whistle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <ellipse cx="15" cy="14" rx="7" ry="5" />
      <path d="M8 12 L4 6" strokeWidth="2.5" />
      <circle cx="3" cy="5" r="2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

function Jersey({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3 L2 7 L5 9 L5 20 L19 20 L19 9 L22 7 L18 3 L15 5 Q12 7 9 5 Z" />
      <line x1="12" y1="10" x2="12" y2="16" opacity="0.4" />
    </svg>
  );
}

function Boot({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8 L4 16 L8 18 L20 18 L22 14 L18 12 L16 8 L10 6 Z" />
      <line x1="8" y1="18" x2="8" y2="14" opacity="0.4" />
      <line x1="12" y1="18" x2="12" y2="13" opacity="0.4" />
      <line x1="16" y1="18" x2="16" y2="12" opacity="0.4" />
    </svg>
  );
}

function StadiumSilhouette() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 300" fill="none" preserveAspectRatio="xMidYMid slice">
      <path d="M0 300 L0 180 Q100 80 200 120 Q300 60 400 100 Q500 60 600 120 Q700 80 800 180 L800 300 Z" fill="rgba(34,197,94,0.04)" />
      <path d="M0 300 L0 200 Q200 120 400 160 Q600 120 800 200 L800 300 Z" fill="rgba(34,197,94,0.03)" />
      <line x1="100" y1="80" x2="200" y2="250" stroke="rgba(255,255,255,0.02)" strokeWidth="60" />
      <line x1="700" y1="80" x2="600" y2="250" stroke="rgba(255,255,255,0.02)" strokeWidth="60" />
      <ellipse cx="400" cy="280" rx="120" ry="40" stroke="rgba(34,197,94,0.06)" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// ── Mock Recent Matches (same as HomeRecentMatches) ──
const RECENT_MATCHES = [
  { id: 1, result: 'win' as const, opponent: 'Striker99', mode: 'Ranked', rp: '+15', time: '2h ago' },
  { id: 2, result: 'loss' as const, opponent: 'GoalKeeper', mode: 'Buzzer', rp: '-8', time: '5h ago' },
  { id: 3, result: 'win' as const, opponent: 'Captain10', mode: 'League', rp: '+12', time: '1d ago' },
];

interface ModeSelectionScreenProps {
  onSelectMode: (mode: 'ranked' | 'friendly' | 'solo') => void;
  ticketsRemaining?: number;
  playerStats: PlayerStats;
}

export function ModeSelectionScreen({ onSelectMode, ticketsRemaining = 10, playerStats }: ModeSelectionScreenProps) {
  const [selectedMode, setSelectedMode] = useState<'ranked' | 'friendly' | 'solo' | null>(null);
  const rankInfo = getRankInfo(playerStats.rankPoints || 0);
  const divisionColors = getDivisionColor(rankInfo.division);
  const divisionEmoji = getDivisionEmoji(rankInfo.division);
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleConfirm = () => {
    if (!selectedMode) return;
    if (selectedMode !== 'friendly') {
      onSelectMode(selectedMode);
    }
    setSelectedMode(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5 font-fun">

      {/* ─── 1. Ranked Hero Card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setSelectedMode('ranked')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedMode('ranked');
          }
        }}
        role="button"
        tabIndex={0}
        className="relative rounded-3xl bg-gradient-to-br from-[#1B3A25] via-[#1B2F36] to-[#1B2F36] border-b-4 border-[#58CC02] overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58CC02] active:border-b-2 active:translate-y-[2px] transition-all"
      >
        {/* Soccer Field Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 right-0 h-1 bg-white" />
          <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-white" />
        </div>

        <StadiumSilhouette />

        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="size-16 rounded-2xl bg-[#58CC02]/20 border-2 border-[#58CC02]/40 flex items-center justify-center">
                <SoccerBall className="size-9 text-[#58CC02]" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white uppercase">Ranked Match</h1>
                <span className="text-sm font-bold text-[#58CC02] uppercase tracking-wider">⚽ 1v1 Competitive</span>
              </div>
            </div>
            <div className="hidden md:block">
              <span className="px-14 py-5 rounded-2xl bg-[#58CC02] border-b-4 border-[#46A302] text-white font-black text-xl inline-block pointer-events-none uppercase tracking-wide transition-all">
                Play Ranked
              </span>
            </div>
          </div>

          <p className="text-base text-white/80 font-semibold mb-4 max-w-xl">
            🏆 Compete for Rank Points (RP) and climb the global leaderboards. Win to promote to higher divisions!
          </p>

          <div className="flex gap-3 mb-4">
            <span className="text-xs font-black px-4 py-2 rounded-full bg-white/10 border-2 border-white/20 text-white/90">
              ⚡ 1v1 Duel
            </span>
            <span className="text-xs font-black px-4 py-2 rounded-full bg-[#FFD700]/15 border-2 border-[#FFD700]/30 text-[#FFD700]">
              +5–15 RP / Win
            </span>
          </div>

          {/* RP Progress + Stats */}
          <div className="bg-[#131F24] rounded-2xl border-b-4 border-[#0D1B21] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{divisionEmoji}</span>
                <span className={cn('text-base font-black', divisionColors.text)}>{rankInfo.division}</span>
              </div>
              <span className="text-xs font-bold text-[#56707A]">
                {rankInfo.pointsToNext !== null ? `${rankInfo.pointsToNext} RP to next` : 'Max Division'}
              </span>
            </div>
            <div className="relative h-4 bg-[#243B44] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${rankInfo.progress}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#58CC02] to-[#85E000]"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent h-1/2" />
              </motion.div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-[#56707A]">🏆 <span className="text-[#2D8CBA] font-black">75%</span> win</span>
                <span className="text-xs font-bold text-[#56707A]">🎯 <span className="text-[#9B7EC8] font-black">{playerStats.gamesPlayed}</span> games</span>
              </div>
              <div>
                <span className="text-2xl font-black text-white">{playerStats.rankPoints ?? 0}</span>
                <span className="text-sm font-bold text-[#56707A] ml-1">RP</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. Secondary Modes Grid ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        {/* Friendly */}
        <div
          onClick={() => setSelectedMode('friendly')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelectedMode('friendly');
            }
          }}
          role="button"
          tabIndex={0}
          className="relative text-left bg-[#1B2F36] rounded-2xl border-b-4 border-[#1CB0F6] p-6 hover:bg-[#243B44] active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1CB0F6] overflow-hidden"
        >
          {/* Soccer lines decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-white" />
            <div className="absolute top-8 left-0 right-0 h-0.5 bg-white" />
            <div className="absolute top-12 left-0 right-0 h-0.5 bg-white" />
          </div>

          <div className="relative z-10">
            <div className="size-14 rounded-xl bg-[#1CB0F6]/20 border-2 border-[#1CB0F6]/40 flex items-center justify-center mb-3">
              <Jersey className="size-7 text-[#1CB0F6]" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase">Friendly Match</h3>
            <p className="text-sm text-[#56707A] font-semibold mb-4">
              👥 Create a private room or join a friend&apos;s game. No RP at stake.
            </p>
            <span className="px-6 py-3 rounded-2xl bg-[#1A7FA8] border-b-4 border-[#14627F] text-white font-black text-sm inline-block pointer-events-none uppercase">
              Create / Join Room
            </span>
          </div>
        </div>

        {/* Solo */}
        <div
          onClick={() => router.push('/career')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              router.push('/career');
            }
          }}
          role="button"
          tabIndex={0}
          className="relative text-left bg-[#1B2F36] rounded-2xl border-b-4 border-[#FF9600] p-6 hover:bg-[#243B44] active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9600] overflow-hidden"
        >
          {/* Boot prints decoration */}
          <div className="absolute bottom-0 right-4 opacity-5">
            <Boot className="w-24 h-24 text-white" />
          </div>

          <div className="relative z-10">
            <div className="size-14 rounded-xl bg-[#FF9600]/20 border-2 border-[#FF9600]/40 flex items-center justify-center mb-3">
              <Boot className="size-7 text-[#FF9600]" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase">Solo Practice</h3>
            <p className="text-sm text-[#56707A] font-semibold mb-4">
              ⚽ Start your journey from benchwarmer to legend.
            </p>
            <span className="px-6 py-3 rounded-2xl bg-[#C47400] border-b-4 border-[#9A5B00] text-white font-black text-sm inline-block pointer-events-none uppercase">
              Start Practice
            </span>
          </div>
        </div>
      </motion.div>

      {/* ─── 4. Weekly Challenges (Horizontal Scroll) ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-white flex items-center gap-2 uppercase">
            <Whistle className="size-5 text-[#FFD700]" />
            Weekly Challenges
          </h2>
          <span className="text-xs font-bold text-[#56707A] bg-[#1B2F36] px-3 py-1.5 rounded-full border-b-2 border-[#0D1B21]">Resets in 3d 12h</span>
        </div>
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
          {CHALLENGES.map((c) => {
            const isLocked = c.status === 'locked';
            const tierColor = { bronze: 'border-b-[#FF9600]', silver: 'border-b-slate-400', gold: 'border-b-[#FFD700]', platinum: 'border-b-[#1CB0F6]' }[c.tier];
            const tierBg = { bronze: 'bg-[#FF9600]/20 text-[#FF9600]', silver: 'bg-slate-400/20 text-slate-300', gold: 'bg-[#FFD700]/20 text-[#FFD700]', platinum: 'bg-[#1CB0F6]/20 text-[#1CB0F6]' }[c.tier];
            const tierIcon = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' }[c.tier];
            const handleChallengeClick = () => {
              if (isLocked) return;
              logger.info('Challenge enter', { id: c.id });
              router.push(`/daily/challenges/${c.id}`);
            };

            return (
              <div
                key={c.id}
                onClick={handleChallengeClick}
                onKeyDown={(e) => {
                  if (!isLocked && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleChallengeClick();
                  }
                }}
                role="button"
                tabIndex={isLocked ? -1 : 0}
                className={cn(
                  'shrink-0 w-[180px] bg-[#1B2F36] rounded-2xl border-b-4 p-4',
                  isLocked
                    ? 'opacity-50 cursor-default border-b-[#243B44]'
                    : 'cursor-pointer hover:bg-[#243B44] active:border-b-2 active:translate-y-[2px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  tierColor
                )}
              >
                <div className={cn('size-10 rounded-xl flex items-center justify-center mb-2 text-xl border-2', tierBg, isLocked && 'border-[#243B44]')}>
                  {isLocked ? '🔒' : tierIcon}
                </div>
                <h4 className="text-sm font-black text-white mb-1">{c.title}</h4>
                <p className="text-xs font-semibold text-[#56707A]">{isLocked ? c.requirement : c.rewards}</p>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => router.push('/daily/challenges')}
          className="mt-2 text-xs font-bold text-[#1CB0F6] hover:text-[#1CB0F6]/80 transition-colors uppercase tracking-wide"
        >
          View All Challenges →
        </button>
      </motion.div>

      {/* ─── 5. Recent Matches ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-[#1B2F36] rounded-2xl border-b-4 border-[#0D1B21] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-white flex items-center gap-2 uppercase">
            <SoccerBall className="size-5 text-[#58CC02]" />
            Recent Matches
          </h3>
          <button
            onClick={() => router.push('/profile')}
            className="text-xs font-bold text-[#1CB0F6] hover:text-[#1CB0F6]/80 transition-colors uppercase tracking-wide"
          >
            View All →
          </button>
        </div>
        <div className="space-y-2">
          {RECENT_MATCHES.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-4 rounded-xl bg-[#131F24] border-b-2 border-[#0D1B21]">
              <div className="flex items-center gap-3">
                <div className={cn('size-9 rounded-xl flex items-center justify-center text-sm font-black border-2', m.result === 'win' ? 'bg-[#58CC02]/20 text-[#58CC02] border-[#58CC02]/40' : 'bg-[#FF4B4B]/20 text-[#FF4B4B] border-[#FF4B4B]/40')}>
                  {m.result === 'win' ? 'W' : 'L'}
                </div>
                <div>
                  <div className="text-sm font-black text-white">vs {m.opponent}</div>
                  <div className="text-xs text-[#56707A] font-semibold">{m.mode} · {m.time}</div>
                </div>
              </div>
              <span className={cn('text-base font-black', m.result === 'win' ? 'text-[#58CC02]' : 'text-[#FF4B4B]')}>{m.rp}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ─── 6. Modals (unchanged) ─── */}
      <ModeConfirmModal
        mode={selectedMode !== 'friendly' ? selectedMode : null}
        isOpen={!!selectedMode && selectedMode !== 'friendly'}
        onOpenChange={(open) => !open && setSelectedMode(null)}
        onConfirm={handleConfirm}
        ticketsRemaining={ticketsRemaining}
      />
      <FriendPlayModal
        isOpen={selectedMode === 'friendly'}
        onOpenChange={(open) => !open && setSelectedMode(null)}
      />
    </div>
  );
}
