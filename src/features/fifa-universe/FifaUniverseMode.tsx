'use client';

import { BestXI } from './modes/BestXI';
import { DraftBattle } from './modes/DraftBattle';
import { Gauntlet } from './modes/Gauntlet';
import { HigherLower } from './modes/HigherLower';
import { StatBattle } from './modes/StatBattle';
import { Survival } from './modes/Survival';
import { CardDetective, CardOrder, FakeStat, FifaEvolution, GuessYear, WhosMissing, Wonderkid } from './modes/simpleModes';

/** Slug -> prototype. Every FIFA Universe mode takes only a backHref. */
export function FifaUniverseMode({ slug, backHref }: { slug: string; backHref?: string }) {
  switch (slug) {
    case 'fifa-higher-lower': return <HigherLower backHref={backHref} />;
    case 'fifa-stat-battle': return <StatBattle backHref={backHref} />;
    case 'fifa-card-detective': return <CardDetective backHref={backHref} />;
    case 'fifa-evolution': return <FifaEvolution backHref={backHref} />;
    case 'fifa-card-order': return <CardOrder backHref={backHref} />;
    case 'fifa-fake-stat': return <FakeStat backHref={backHref} />;
    case 'fifa-guess-year': return <GuessYear backHref={backHref} />;
    case 'fifa-wonderkid': return <Wonderkid backHref={backHref} />;
    case 'fifa-whos-missing': return <WhosMissing backHref={backHref} />;
    case 'fifa-best-xi': return <BestXI backHref={backHref} />;
    case 'fifa-draft-battle': return <DraftBattle backHref={backHref} />;
    case 'fifa-survival': return <Survival backHref={backHref} />;
    case 'fifa-gauntlet': return <Gauntlet backHref={backHref} />;
    default: return null;
  }
}
