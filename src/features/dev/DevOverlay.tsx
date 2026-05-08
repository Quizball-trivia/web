'use client';

import { useState } from 'react';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { getSocket } from '@/lib/realtime/socket-client';

interface DevOverlayProps {
  onQuit?: () => void;
  onRestart?: () => void;
}

export function DevOverlay({ onQuit, onRestart }: DevOverlayProps) {
  const [open, setOpen] = useState(false);
  const match = useRealtimeMatchStore((s) => s.match);
  const triggerDevPossessionAnimation = useRealtimeMatchStore((s) => s.triggerDevPossessionAnimation);
  const ps = match?.possessionState;

  if (process.env.NODE_ENV !== 'development') return null;

  const skipTo = (target: 'halftime' | 'last_attack' | 'shot' | 'penalties' | 'second_half') => {
    if (!match?.matchId) return;
    getSocket().emit('dev:skip_to', { matchId: match.matchId, target });
  };

  const mySeat = match?.mySeat === 2 ? 2 : 1;
  const oppSeat: 1 | 2 = mySeat === 1 ? 2 : 1;
  const triggerAnim = (result: 'goal' | 'saved' | 'miss', side: 'me' | 'opp') => {
    const attackerSeat = side === 'me' ? mySeat : oppSeat;
    triggerDevPossessionAnimation({ result, attackerSeat });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-lg bg-yellow-500 text-black font-black text-xs uppercase tracking-wider shadow-lg hover:bg-yellow-400 transition-colors"
      >
        DEV
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-72 bg-surface-card border border-surface-card-light rounded-xl shadow-2xl font-mono text-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-yellow-500/20 border-b border-yellow-500/30">
        <span className="font-black text-yellow-400 uppercase tracking-wider text-[10px]">Dev Panel</span>
        <button onClick={() => setOpen(false)} className="text-yellow-400/60 hover:text-yellow-400 text-sm font-bold">
          x
        </button>
      </div>

      {/* State Inspector */}
      <div className="p-3 space-y-1.5 text-[11px] border-b border-surface-card-light">
        <Row label="Phase" value={ps?.phase ?? '—'} color={phaseColor(ps?.phase)} />
        <Row label="Half" value={ps?.half ?? '—'} />
        <Row label="Poss Diff" value={ps?.possessionDiff ?? '—'} />
        <Row label="Q in Half" value={`${ps?.normalQuestionsAnsweredInHalf ?? '?'}/6`} />
        <Row label="Goals" value={ps?.goals ? `${ps.goals.seat1} - ${ps.goals.seat2}` : '—'} />
        <Row label="Pen Goals" value={ps?.penaltyGoals ? `${ps.penaltyGoals.seat1} - ${ps.penaltyGoals.seat2}` : '—'} />
        <Row label="PhaseKind" value={ps?.phaseKind ?? '—'} />
        <Row label="Attacker" value={ps?.attackerSeat ?? 'none'} />
        <Row label="Shooter" value={ps?.shooterSeat ?? 'none'} />
        <Row label="Match ID" value={match?.matchId?.slice(0, 8) ?? '—'} />
        <Row label="My Seat" value={match?.mySeat ?? '—'} />
      </div>

      {/* Skip Buttons */}
      <div className="p-3 grid grid-cols-2 gap-2">
        <SkipBtn label="Halftime" onClick={() => skipTo('halftime')} color="bg-brand-cyan" />
        <SkipBtn label="2nd Half" onClick={() => skipTo('second_half')} color="bg-brand-green-light" />
        <SkipBtn label="Last Attack" onClick={() => skipTo('last_attack')} color="bg-brand-orange" />
        <SkipBtn label="Penalties" onClick={() => skipTo('penalties')} color="bg-brand-red-soft" />
      </div>

      {/* Navigation */}
      {(onQuit || onRestart) ? (
        <div className="p-3 border-t border-surface-card-light">
          <div className="mb-2 text-[10px] font-black text-brand-slate-light uppercase tracking-wider">Match</div>
          <div className="grid grid-cols-2 gap-2">
            {onRestart && (
              <SkipBtn
                label="Restart"
                onClick={onRestart}
                color="bg-brand-green-light"
              />
            )}
            {onQuit && (
              <SkipBtn
                label="Quit"
                onClick={onQuit}
                color="bg-brand-red-soft"
              />
            )}
          </div>
        </div>
      ) : null}

      {/* Goal Sequence — full celebration test */}
      <div className="p-3 border-t border-surface-card-light">
        <div className="mb-2 text-[10px] font-black text-brand-slate-light uppercase tracking-wider">Goal Sequence</div>
        <div className="grid grid-cols-2 gap-2">
          <SkipBtn label="⚽ My Goal" onClick={() => triggerAnim('goal', 'me')} color="bg-brand-yellow !text-black" />
          <SkipBtn label="⚽ Opp Goal" onClick={() => triggerAnim('goal', 'opp')} color="bg-brand-yellow !text-black" />
        </div>
        <p className="mt-1.5 text-[9px] text-brand-slate">Triggers full shot → celebration → sound (7s)</p>
      </div>

      {/* Animation Triggers */}
      <div className="p-3 border-t border-surface-card-light">
        <div className="mb-2 text-[10px] font-black text-brand-slate-light uppercase tracking-wider">Animations</div>
        <div className="grid grid-cols-2 gap-2">
          <SkipBtn label="My Saved" onClick={() => triggerAnim('saved', 'me')} color="bg-brand-cyan" />
          <SkipBtn label="Opp Saved" onClick={() => triggerAnim('saved', 'opp')} color="bg-brand-cyan-deep" />
          <SkipBtn label="My Miss" onClick={() => triggerAnim('miss', 'me')} color="bg-brand-orange" />
          <SkipBtn label="Opp Miss" onClick={() => triggerAnim('miss', 'opp')} color="bg-[#E07A00]" />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-brand-slate">{label}</span>
      <span className={color ?? 'text-white/90'}>{String(value)}</span>
    </div>
  );
}

function SkipBtn({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className={`${color} text-white font-bold text-[10px] uppercase tracking-wider py-1.5 rounded-lg hover:opacity-80 active:opacity-60 transition-opacity`}
    >
      {label}
    </button>
  );
}

function phaseColor(phase?: string): string {
  switch (phase) {
    case 'NORMAL_PLAY': return 'text-brand-green-light';
    case 'LAST_ATTACK': return 'text-brand-orange';
    case 'SHOT_ON_GOAL': return 'text-brand-orange';
    case 'HALFTIME': return 'text-brand-cyan';
    case 'PENALTY_SHOOTOUT': return 'text-brand-red-soft';
    case 'COMPLETED': return 'text-brand-slate';
    default: return 'text-white/90';
  }
}
