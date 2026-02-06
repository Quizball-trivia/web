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

function GoalNet({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="28" height="18" rx="2" />
      <line x1="2" y1="4" x2="16" y2="16" opacity="0.3" />
      <line x1="30" y1="4" x2="16" y2="16" opacity="0.3" />
      <line x1="16" y1="4" x2="16" y2="22" opacity="0.3" />
      <line x1="2" y1="13" x2="30" y2="13" opacity="0.3" />
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

  const accuracy = playerStats.gamesPlayed > 0
    ? Math.round((playerStats.correctAnswers / (playerStats.gamesPlayed * 10)) * 100)
    : 0;

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
        className="relative rounded-3xl bg-[#1a1f2e] border-b-4 border-b-emerald-500/30 overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-[0.99] transition-transform"
      >
        <StadiumSilhouette />
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="size-14 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center">
                <SoccerBall className="size-8 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Ranked Match</h1>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">1v1 Competitive</span>
              </div>
            </div>
            <div className="hidden md:block">
              <span className="px-10 py-4 rounded-2xl bg-emerald-500 border-b-[6px] border-b-emerald-700 text-white font-black text-lg inline-block pointer-events-none shadow-[0_0_25px_rgba(16,185,129,0.5),0_0_50px_rgba(16,185,129,0.2)]">
                Play Ranked
              </span>
            </div>
          </div>

          <p className="text-sm text-white/70 mb-3 max-w-xl">
            Compete for Rank Points (RP) and climb the global leaderboards. Win to promote to higher divisions.
          </p>

          <div className="flex gap-3 mb-4">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70">
              1v1 Duel
            </span>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70">
              +5–15 RP / Win
            </span>
          </div>

          {/* RP Progress */}
          <div className="bg-black/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{divisionEmoji}</span>
                <span className={cn('text-sm font-bold', divisionColors.text)}>{rankInfo.division}</span>
              </div>
              <span className="text-xs font-bold text-white/60">
                {rankInfo.pointsToNext !== null ? `${rankInfo.pointsToNext} RP to next` : 'Max Division'}
              </span>
            </div>
            <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${rankInfo.progress}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent h-1/2" />
              </motion.div>
            </div>
            <div className="text-right mt-1">
              <span className="text-lg font-black text-white">{playerStats.rankPoints ?? 0}</span>
              <span className="text-xs font-bold text-white/60 ml-1">RP</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. Stats Row ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="bg-[#1a1f2e] rounded-2xl border-b-4 border-b-white/10 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-white/60 font-bold mb-1">Accuracy</div>
          <div className="text-xl font-black text-blue-400">{accuracy}%</div>
        </div>
        <div className="bg-[#1a1f2e] rounded-2xl border-b-4 border-b-white/10 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-white/60 font-bold mb-1">Games</div>
          <div className="text-xl font-black text-purple-400">{playerStats.gamesPlayed}</div>
        </div>
        <div className="bg-[#1a1f2e] rounded-2xl border-b-4 border-b-white/10 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-white/60 font-bold mb-1">Coins</div>
          <div className="text-xl font-black text-yellow-400">{playerStats.coins.toLocaleString()}</div>
        </div>
      </motion.div>

      {/* ─── 3. Secondary Modes Grid ─── */}
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
          className="text-left bg-[#1a1f2e] rounded-2xl border-b-4 border-b-blue-500/20 p-6 hover:bg-[#1e2436] active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <div className="size-12 rounded-xl bg-blue-500/15 flex items-center justify-center mb-3">
            <Jersey className="size-6 text-blue-400" />
          </div>
          <h3 className="text-xl font-black text-white mb-1">Friendly Match</h3>
          <p className="text-xs text-white/60 font-semibold mb-4">
            Create a private room or join a friend&apos;s game. No RP at stake.
          </p>
          <span className="px-5 py-2.5 rounded-2xl bg-blue-500 border-b-4 border-b-blue-600 text-white font-extrabold text-sm inline-block pointer-events-none">
            Create / Join Room
          </span>
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
          className="text-left bg-[#1a1f2e] rounded-2xl border-b-4 border-b-orange-500/20 p-6 hover:bg-[#1e2436] active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <div className="size-12 rounded-xl bg-orange-500/15 flex items-center justify-center mb-3">
            <Boot className="size-6 text-orange-400" />
          </div>
          <h3 className="text-xl font-black text-white mb-1">Solo</h3>
          <p className="text-xs text-white/60 font-semibold mb-4">
            Start your journey from benchwarmer to legend.
          </p>
          <span className="px-5 py-2.5 rounded-2xl bg-orange-500 border-b-4 border-b-orange-600 text-white font-extrabold text-sm inline-block pointer-events-none">
            Start Practice
          </span>
        </div>
      </motion.div>

      {/* ─── 4. Weekly Challenges (Horizontal Scroll) ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-white flex items-center gap-2">
            <Whistle className="size-4 text-emerald-400" />
            Weekly Challenges
          </h2>
          <span className="text-[10px] font-bold text-white/50 bg-white/5 px-2 py-1 rounded-lg">Resets in 3d 12h</span>
        </div>
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
          {CHALLENGES.map((c) => {
            const isLocked = c.status === 'locked';
            const tierColor = { bronze: 'border-b-orange-600/40', silver: 'border-b-slate-400/40', gold: 'border-b-yellow-500/40', platinum: 'border-b-cyan-400/40' }[c.tier];
            const tierBg = { bronze: 'bg-orange-500/15 text-orange-400', silver: 'bg-slate-400/15 text-slate-300', gold: 'bg-yellow-500/15 text-yellow-400', platinum: 'bg-cyan-400/15 text-cyan-300' }[c.tier];
            const handleChallengeClick = () => {
              if (isLocked) return;
              logger.info('Challenge enter', { id: c.id });
              router.push(`/challenges/${c.id}`);
            };

            return (
              <div
                key={c.id}
                onClick={handleChallengeClick}
                className={cn('shrink-0 w-[160px] bg-[#1a1f2e] rounded-2xl border-b-4 p-3 cursor-pointer', tierColor, isLocked && 'opacity-50 cursor-default')}
              >
                <div className={cn('size-8 rounded-lg flex items-center justify-center mb-2', tierBg)}>
                  {isLocked ? (
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  ) : (
                    <GoalNet className="size-4" />
                  )}
                </div>
                <h4 className="text-xs font-black text-white mb-0.5">{c.title}</h4>
                <p className="text-[10px] font-semibold text-white/50">{isLocked ? c.requirement : c.rewards}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ─── 5. Recent Matches ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-[#1a1f2e] rounded-2xl border-b-4 border-b-white/10 p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <SoccerBall className="size-4 text-white/40" />
            Recent Matches
          </h3>
          <button
            onClick={() => router.push('/profile')}
            className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            View All
          </button>
        </div>
        <div className="space-y-2">
          {RECENT_MATCHES.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-2.5">
                <div className={cn('size-7 rounded-lg flex items-center justify-center text-xs font-black', m.result === 'win' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400')}>
                  {m.result === 'win' ? 'W' : 'L'}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">vs {m.opponent}</div>
                  <div className="text-[10px] text-white/50 font-semibold">{m.mode} · {m.time}</div>
                </div>
              </div>
              <span className={cn('text-sm font-black', m.result === 'win' ? 'text-emerald-400' : 'text-red-400')}>{m.rp}</span>
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
