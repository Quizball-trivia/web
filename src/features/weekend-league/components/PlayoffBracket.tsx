'use client';

import { AvatarDisplay } from '@/components/AvatarDisplay';
import { poppins } from '../constants';
import type { Bracket, BracketMatch, BracketPlayer } from '../types';
import { LiveBadge } from './LiveBadge';

function PlayerRow({
  player,
  score,
  decided,
  isWinner,
}: {
  player: BracketPlayer | null;
  score?: number;
  decided: boolean;
  isWinner: boolean;
}) {
  if (!player) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <span className="font-poppins text-[11px] font-bold uppercase tracking-wide text-white/25">TBD</span>
      </div>
    );
  }
  const dim = decided && !isWinner;
  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 ${isWinner ? 'bg-brand-green/12' : ''}`}>
      <span className={`w-4 shrink-0 font-poppins text-[10px] font-black tabular-nums ${dim ? 'text-white/30' : 'text-white/45'}`}>
        {player.seed}
      </span>
      <AvatarDisplay customization={{ base: player.avatar }} size="xs" countryCode={player.country} />
      <span className={`flex-1 truncate font-poppins text-[11px] font-black uppercase ${dim ? 'text-white/35' : 'text-white'}`}>
        {player.username}
      </span>
      {player.isYou && (
        <span className="shrink-0 rounded bg-brand-green px-1 py-px font-poppins text-[8px] font-black uppercase text-white">You</span>
      )}
      {score != null && (
        <span className={`shrink-0 font-poppins text-xs font-black tabular-nums ${isWinner ? 'text-brand-yellow' : 'text-white/40'}`} style={poppins}>
          {score}
        </span>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: BracketMatch }) {
  const decided = match.winnerId != null;
  // "Your match" labels only your active (live/upcoming) tie; decided path
  // matches keep the gold border but drop the label so it never reads as "now".
  const showYourLabel = Boolean(match.isYours) && !decided;
  return (
    <div
      className={`w-[172px] shrink-0 overflow-hidden rounded-xl border-2 ${
        match.isYours ? 'border-brand-gold/50' : match.live ? 'border-brand-cyan/50' : 'border-white/10'
      } bg-surface-card-deep`}
    >
      {(match.live || showYourLabel) && (
        <div className="flex items-center justify-between px-2.5 pt-1.5">
          {showYourLabel ? (
            <span className="font-poppins text-[9px] font-black uppercase tracking-wide text-brand-gold">Your match</span>
          ) : (
            <span />
          )}
          {match.live && <LiveBadge className="scale-90" />}
        </div>
      )}
      <div className="divide-y divide-white/5 py-0.5">
        <PlayerRow player={match.a} score={match.scoreA} decided={decided} isWinner={decided && match.winnerId === match.a?.id} />
        <PlayerRow player={match.b} score={match.scoreB} decided={decided} isWinner={decided && match.winnerId === match.b?.id} />
      </div>
    </div>
  );
}

/** Sunday knockout bracket for the top 24. Scrolls horizontally by round. */
export function PlayoffBracket({ bracket, live = false }: { bracket: Bracket; live?: boolean }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-poppins text-lg font-black uppercase tracking-wide text-white">Playoff bracket</h2>
        {live && <LiveBadge />}
      </div>

      {bracket.championName && (
        <div className="mb-3 flex items-center gap-3 rounded-2xl border-2 border-brand-gold/50 bg-brand-gold/10 px-4 py-3">
          <span className="text-3xl leading-none">🏆</span>
          <div>
            <div className="font-poppins text-[10px] font-black uppercase tracking-widest text-brand-gold">Champion</div>
            <div className="font-poppins text-xl font-black uppercase text-white" style={poppins}>{bracket.championName}</div>
          </div>
        </div>
      )}

      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex gap-3">
          {bracket.rounds.map((round) => (
            <div key={round.id} className="flex w-[172px] shrink-0 flex-col">
              <div className="mb-2">
                <div className="font-poppins text-[11px] font-black uppercase tracking-wide text-white">{round.name}</div>
                {round.subtitle && (
                  <div className="font-poppins text-[9px] font-semibold uppercase tracking-wide text-white/35">{round.subtitle}</div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {round.matches.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-1 px-1 font-poppins text-[11px] font-medium text-white/30">Scroll → to follow the bracket through to the final.</p>
    </section>
  );
}
