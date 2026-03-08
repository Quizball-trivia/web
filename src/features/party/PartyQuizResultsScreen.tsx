'use client';

import { useMemo } from 'react';

import { Crown, Medal, Target, Timer, Trophy } from 'lucide-react';
import { motion } from 'motion/react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { AchievementUnlockPayload, MatchFinalResultsPayload, MatchParticipant, MatchStandingPayload } from '@/lib/realtime/socket.types';
import { cn } from '@/lib/utils';
import { AchievementUnlockStrip } from '@/features/game/components/AchievementUnlockStrip';

interface PartyQuizResultsScreenProps {
  finalResults: MatchFinalResultsPayload;
  participants: MatchParticipant[];
  selfUserId: string;
  unlockedAchievements?: AchievementUnlockPayload[];
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

interface StandingRow extends MatchStandingPayload {
  username: string;
  avatarUrl: string | null;
  isSelf: boolean;
  isWinner: boolean;
}

function avatarFallback(name: string): string {
  const trimmed = name.trim();
  return trimmed.slice(0, 2).toUpperCase() || 'QB';
}

function formatAverageMs(value: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  return `${(value / 1000).toFixed(2)}s`;
}

export function PartyQuizResultsScreen({
  finalResults,
  participants,
  selfUserId,
  unlockedAchievements = [],
  onPlayAgain,
  onMainMenu,
}: PartyQuizResultsScreenProps) {
  const standings = useMemo<StandingRow[]>(() => {
    const participantMap = new Map(participants.map((participant) => [participant.userId, participant]));
    const fallbackStandings = Object.entries(finalResults.players)
      .map(([userId, stats], index) => ({
        userId,
        rank: index + 1,
        totalPoints: stats.totalPoints,
        correctAnswers: stats.correctAnswers,
        avgTimeMs: stats.avgTimeMs,
      }))
      .sort((left, right) => {
        if (left.totalPoints !== right.totalPoints) return right.totalPoints - left.totalPoints;
        if (left.correctAnswers !== right.correctAnswers) return right.correctAnswers - left.correctAnswers;
        return (left.avgTimeMs ?? Number.MAX_SAFE_INTEGER) - (right.avgTimeMs ?? Number.MAX_SAFE_INTEGER);
      })
      .map((standing, index) => ({ ...standing, rank: index + 1 }));

    const authoritativeStandings = finalResults.standings?.length ? finalResults.standings : fallbackStandings;

    return authoritativeStandings.map((standing) => {
      const participant = participantMap.get(standing.userId);
      return {
        ...standing,
        username: participant?.username ?? 'Player',
        avatarUrl: participant?.avatarUrl ?? null,
        isSelf: standing.userId === selfUserId,
        isWinner: finalResults.winnerId === standing.userId,
      };
    });
  }, [finalResults.players, finalResults.standings, finalResults.winnerId, participants, selfUserId]);

  const podium = standings.slice(0, 3);
  const localStanding = standings.find((standing) => standing.isSelf) ?? standings[0] ?? null;
  const resultLabel = finalResults.winnerId === selfUserId
    ? 'You won the party quiz'
    : finalResults.winnerId
      ? `${standings.find((standing) => standing.userId === finalResults.winnerId)?.username ?? 'Winner'} takes first`
      : 'Party quiz finished in a tie';

  return (
    <div className="min-h-dvh bg-[#0f1420] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(252,208,0,0.16),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(28,176,246,0.18),_transparent_38%)]" />
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="text-center font-fun">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FCD200]/30 bg-[#FCD200]/12 px-4 py-2 text-[10px] font-black uppercase tracking-[0.26em] text-[#FFE98A]">
              <Trophy className="size-4" />
              Friendly Party Quiz
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
              {resultLabel}
            </h1>
            <p className="mt-2 text-sm font-bold text-white/60">
              Final standings are sorted by total points, then correct answers, then average response time.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {podium.map((standing, index) => (
              <motion.div
                key={standing.userId}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className={cn(
                  'rounded-[30px] border px-5 py-6 font-fun shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur',
                  standing.rank === 1
                    ? 'border-[#FCD200]/40 bg-[#FCD200]/12'
                    : standing.rank === 2
                      ? 'border-white/16 bg-white/[0.06]'
                      : 'border-[#FF9600]/30 bg-[#FF9600]/10',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
                    {standing.rank === 1 ? 'Champion' : standing.rank === 2 ? 'Second' : 'Third'}
                  </span>
                  {standing.rank === 1 ? (
                    <Crown className="size-5 text-[#FCD200]" />
                  ) : (
                    <Medal className="size-5 text-white/65" />
                  )}
                </div>

                <div className="mt-5 flex flex-col items-center text-center">
                  <Avatar className="size-20 border-4 border-white/10 shadow-xl">
                    <AvatarImage src={resolveAvatarUrl(standing.avatarUrl, `podium-${standing.userId}`, 160)} alt={standing.username} />
                    <AvatarFallback className="bg-[#243B44] text-xl font-black text-white">
                      {avatarFallback(standing.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="mt-4 text-lg font-black text-white">
                    {standing.username}
                  </div>
                  {standing.isSelf ? (
                    <div className="mt-2 rounded-full bg-[#1CB0F6]/18 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#A9E6FF]">
                      You
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <StatPill label="Points" value={String(standing.totalPoints)} icon={<Trophy className="size-3.5" />} />
                  <StatPill label="Correct" value={String(standing.correctAnswers)} icon={<Target className="size-3.5" />} />
                  <StatPill label="Avg" value={formatAverageMs(standing.avgTimeMs)} icon={<Timer className="size-3.5" />} />
                </div>
              </motion.div>
            ))}
          </div>

          {localStanding ? (
            <div className="mt-6 rounded-[28px] border border-[#1CB0F6]/30 bg-[#1CB0F6]/10 px-5 py-4 font-fun shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#A9E6FF]">Your Finish</div>
                  <div className="mt-1 text-lg font-black text-white">
                    #{localStanding.rank} with {localStanding.totalPoints} points
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-bold text-white/80">
                  <span className="rounded-full bg-white/8 px-3 py-1.5">{localStanding.correctAnswers} correct</span>
                  <span className="rounded-full bg-white/8 px-3 py-1.5">avg {formatAverageMs(localStanding.avgTimeMs)}</span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 rounded-[30px] border border-white/10 bg-[#131F24]/88 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-fun font-black uppercase tracking-[0.24em] text-white/45">
                  Full Standings
                </div>
                <div className="mt-1 text-sm font-fun font-bold text-white/70">
                  Every player stayed on the same shared question track for the full match.
                </div>
              </div>
              <div className="rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                {standings.length} players
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {standings.map((standing) => (
                <div
                  key={standing.userId}
                  className={cn(
                    'flex flex-wrap items-center gap-3 rounded-3xl border px-4 py-4 font-fun',
                    standing.isSelf
                      ? 'border-[#1CB0F6]/35 bg-[#1CB0F6]/10'
                      : standing.isWinner
                        ? 'border-[#FCD200]/30 bg-[#FCD200]/8'
                        : 'border-white/10 bg-white/[0.03]',
                  )}
                >
                  <div className="flex w-14 items-center justify-center">
                    <span className="text-xl font-black text-white/85">#{standing.rank}</span>
                  </div>

                  <Avatar className="size-12 border-2 border-white/12">
                    <AvatarImage src={resolveAvatarUrl(standing.avatarUrl, `results-${standing.userId}`, 128)} alt={standing.username} />
                    <AvatarFallback className="bg-[#243B44] text-white font-black">
                      {avatarFallback(standing.username)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-black text-white">{standing.username}</span>
                      {standing.isWinner ? (
                        <span className="rounded-full bg-[#FCD200]/16 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#FFE98A]">
                          Winner
                        </span>
                      ) : null}
                      {standing.isSelf ? (
                        <span className="rounded-full bg-[#1CB0F6]/18 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#A9E6FF]">
                          You
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold text-white/65">
                      <span>{standing.totalPoints} pts</span>
                      <span>{standing.correctAnswers} correct</span>
                      <span>avg {formatAverageMs(standing.avgTimeMs)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <AchievementUnlockStrip
            achievements={unlockedAchievements}
            className="mt-6"
          />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={onPlayAgain}
              className="rounded-2xl border-2 border-[#58CC02]/40 bg-[#58CC02]/18 px-6 py-3 text-sm font-black font-fun text-white transition-colors hover:bg-[#58CC02]/26"
            >
              Play Again
            </button>
            <button
              type="button"
              onClick={onMainMenu}
              className="rounded-2xl border-2 border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-black font-fun text-white/85 transition-colors hover:bg-white/[0.08]"
            >
              Main Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatPillProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function StatPill({ label, value, icon }: StatPillProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
      <div className="flex items-center justify-center text-white/50">{icon}</div>
      <div className="mt-2 text-sm font-black text-white">{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
        {label}
      </div>
    </div>
  );
}
