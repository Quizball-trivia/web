'use client';

import { ArrowUpDown, Baby, CreditCard, Crown, Fingerprint, ListOrdered, Search, Skull, Sparkles, Swords, TrendingUp, Users, type LucideIcon } from 'lucide-react';
import { FIFA_CARDS } from '@/features/mini-games/data/guessFifaCard';
import { MiniFutCard } from './components/MiniFutCard';
import { FIFA_MODE_BY_SLUG } from './registry';

const ICONS: Record<string, LucideIcon> = {
  'mini-guess-fifa-card': CreditCard,
  'fifa-higher-lower': ArrowUpDown,
  'fifa-stat-battle': Swords,
  'fifa-card-detective': Sparkles,
  'fifa-evolution': TrendingUp,
  'fifa-card-order': ListOrdered,
  'fifa-fake-stat': Fingerprint,
  'fifa-guess-year': Search,
  'fifa-wonderkid': Baby,
  'fifa-whos-missing': Users,
  'fifa-best-xi': Crown,
  'fifa-draft-battle': Swords,
  'fifa-survival': Skull,
  'fifa-gauntlet': Crown,
};

/**
 * Hub tile for a FIFA Universe mode: a real gold card from the dataset (face,
 * rating, crest) on the brand-blue pitch gradient, with the mode glyph.
 */
export function FifaModeArt({ slug, className = '' }: { slug: string; className?: string }) {
  const meta = FIFA_MODE_BY_SLUG.get(slug);
  const Icon = ICONS[slug] ?? Sparkles;
  const art = meta ?? { artPlayer: 'Robert Lewandowski', artEdition: 'FIFA18' };
  const card = FIFA_CARDS.find((c) => c.name === art.artPlayer && c.edition === art.artEdition) ?? FIFA_CARDS.find((c) => c.name === art.artPlayer);
  const masked = slug === 'fifa-card-detective' || slug === 'fifa-wonderkid' || slug === 'mini-guess-fifa-card';
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: 'linear-gradient(135deg, #1645FF 0%, #0b2a9e 55%, #0f1420 100%)' }} aria-hidden>
      <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '13px 13px' }} />
      <div className="pointer-events-none absolute -left-10 -top-12 size-44 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,229,0,0.35), transparent 68%)' }} />
      <Icon className="pointer-events-none absolute -bottom-6 -left-4 size-36 text-white/10" />
      <div className="absolute inset-0 flex items-center justify-center gap-4">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-yellow text-black shadow-lg">
          <Icon className="size-6" />
        </span>
        {card && (
          <div className="rotate-[6deg] drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
            <MiniFutCard card={card} size="sm" masked={masked} showEdition />
          </div>
        )}
        {card && (slug === 'fifa-stat-battle' || slug === 'fifa-gauntlet' || slug === 'fifa-higher-lower' || slug === 'fifa-evolution') && (
          <div className="-ml-8 -rotate-[8deg] drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
            <MiniFutCard card={FIFA_CARDS.find((c) => c.edition === card.edition && c.name !== card.name && c.difficulty === 'easy') ?? card} size="xs" showEdition={false} />
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  );
}
