'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import type { FootballGridCriterionView } from '@/lib/realtime/socket.types';
import { CriterionHeader } from '../FootballGridFlowScreen';
import { criterionLabel } from '../criterionLabel';
import { cn } from '@/lib/utils';
import snapshot from './criteria-review.json';

const CRITERIA = snapshot.criteria as FootballGridCriterionView[];
const FAMILIES = [
  ['wildcard', 'Special rules'], ['teammate', 'Teammates'], ['manager', 'Managers'],
  ['club', 'Clubs'], ['country', 'Countries'], ['league', 'Leagues'], ['trophy_award', 'Trophies & awards'],
] as const;
const OVERVIEW = FAMILIES.flatMap(([family]) => {
  const items = CRITERIA.filter((clue) => clue.family === family);
  if (family === 'wildcard') return items;
  const longest = [...items].sort((a, b) => Math.max(b.labelEn.length, b.labelKa.length) - Math.max(a.labelEn.length, a.labelKa.length));
  const preferred = items.find((c) => /Del Piero|La Liga|Croatia|Barcelona|Ancelotti|World Cup/i.test(c.labelEn));
  return [...new Map([preferred ?? items[0], items[0], longest[0]].filter(Boolean).map((c) => [c.key, c])).values()];
});
const PAGE_SIZE = 24;

export function CriterionGallery() {
  const { locale, setLocale } = useLocale();
  const [mode, setMode] = useState<'overview' | 'all'>('overview');
  const [family, setFamily] = useState('all');
  const [search, setSearch] = useState('');
  const [width, setWidth] = useState(92);
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return (mode === 'overview' ? OVERVIEW : CRITERIA).filter((c) =>
      (family === 'all' || c.family === family) && (!query ||
        [c.labelEn, c.labelKa, c.labelEs, c.labelTr].some((label) => label?.toLocaleLowerCase().includes(query))));
  }, [mode, family, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const visible = mode === 'overview' ? filtered : filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const control = 'rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-bold text-white';

  return (
    <main className="min-h-dvh bg-surface-page-alt px-4 pb-16 pt-6 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/dev/tic-tac-toe" className="text-sm font-bold text-brand-yellow">← Back to board preview</Link>
        <p className="mt-7 text-xs font-bold uppercase tracking-widest text-brand-yellow">Tic Tac Toe · Local review</p>
        <h1 className="mt-2 font-poppins text-3xl font-black">Every clue, both ways.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65">Compare the yellow top header with the blue left header. Tap either one for the complete clue. The full clue wording is also shown below each pair.</p>

        <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['overview', 'all'] as const).map((value) => <button key={value} type="button" aria-pressed={mode === value}
              onClick={() => { setMode(value); setPage(0); }}
              className={cn(control, mode === value && 'border-brand-yellow bg-brand-yellow text-black')}>
              {value === 'overview' ? 'Clue types' : `All ${CRITERIA.length} clues`}
            </button>)}
            <div className="flex gap-1 sm:ml-auto" aria-label="Review language">
              {(['en', 'ka', 'es', 'tr'] as const).map((value) => <button key={value} type="button" aria-pressed={locale === value}
                onClick={() => setLocale(value)} className={cn(control, 'uppercase', locale === value && 'border-brand-yellow text-brand-yellow')}>
                {value}
              </button>)}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_200px_200px]">
            <label className="space-y-1 text-xs text-white/60">Search clues
              <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Del Piero, La Liga, დაბადებული…" className={cn(control, 'block w-full font-normal')} />
            </label>
            <label className="space-y-1 text-xs text-white/60">Category
              <select value={family} onChange={(event) => { setFamily(event.target.value); setPage(0); }} className={cn(control, 'block w-full bg-surface-card')}>
                <option value="all">All categories</option>
                {FAMILIES.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs text-white/60">Header width
              <select value={width} onChange={(event) => setWidth(Number(event.target.value))} className={cn(control, 'block w-full bg-surface-card')}>
                <option value={78}>Narrow · 78px</option><option value={92}>Regular · 92px</option><option value={128}>Wide · 128px</option>
              </select>
            </label>
          </div>
        </div>

        <div className="my-5 flex flex-wrap items-center justify-between gap-3 text-sm text-white/65">
          <p>{filtered.length} {mode === 'overview' ? 'examples covering every clue family' : 'matching clues'} · full wording below each pair</p>
          {mode === 'all' && <div className="flex items-center gap-3">
            <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className={cn(control, 'disabled:opacity-30')}>Previous</button>
            <span>{currentPage + 1} / {pages}</span>
            <button type="button" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)} className={cn(control, 'disabled:opacity-30')}>Next</button>
          </div>}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((clue) => <article key={clue.key} className="min-w-0 rounded-2xl border border-white/10 bg-black/15 p-4">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-wider text-white/40">{FAMILIES.find(([value]) => value === clue.family)?.[1]}</p>
            <div className="flex justify-center gap-4">
              {(['column', 'row'] as const).map((axis) => <div key={axis} className="shrink-0" style={{ width }}>
                <p className="mb-2 flex h-8 items-center justify-center text-center text-[10px] font-bold uppercase tracking-wide text-white/60">{axis === 'column' ? 'Top · horizontal' : 'Left · vertical'}</p>
                <div className="grid" style={{ height: Math.max(96, width) }}><CriterionHeader criterion={clue} locale={locale} axis={axis} /></div>
              </div>)}
            </div>
            <p lang={locale} className="mt-5 break-words text-center text-sm font-semibold leading-relaxed">{criterionLabel(clue, locale)}</p>
            {locale !== 'en' && <p className="mt-1 text-center text-xs leading-relaxed text-white/45">{clue.labelEn}</p>}
          </article>)}
        </div>
        {visible.length === 0 && <p className="py-16 text-center text-white/60">No matching clues. Try another search or category.</p>}
        <p className="mt-8 text-xs text-white/35">Release snapshots from 21 September 2026. This gallery shows clue presentation only; it does not create matches or change live content.</p>
      </div>
    </main>
  );
}
