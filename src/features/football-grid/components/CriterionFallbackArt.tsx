import type { FootballGridCriterionView } from '@/lib/realtime/socket.types';

// Original Quizball drawings, not replicas of official competition logos.
// Each trophy uses its recognisable form instead of a generated initials badge.
const TROPHY_FORMS: Record<string, string> = {
  'copa-del-rey': 'royal-cup', 'premier-league-title': 'crowned-cup',
  'bundesliga-title': 'plate', 'ligue-1-title': 'hexagon',
  'serie-a-title': 'scudetto', 'la-liga-title': 'ribbon-cup',
  'uefa-champions-league': 'big-ears', 'uefa-europa-league': 'faceted-cup',
  'uefa-conference-league': 'spiral-cup', 'coppa-italia': 'tricolour-cup',
  'dfb-pokal': 'gold-cup', 'fa-cup': 'lid-cup', 'knvb-cup': 'silver-cup',
  'efl-cup': 'low-cup', 'coupe-de-france': 'tall-cup',
  'taca-de-portugal': 'ribbon-cup', 'fifa-world-cup': 'world-cup',
  'fifa-club-world-cup': 'world-cup', 'uefa-euro': 'lid-cup',
  'uefa-nations-league': 'spiral-cup', 'copa-america': 'tall-cup',
  'copa-libertadores': 'ball-cup', 'africa-cup-of-nations': 'world-cup',
  'afc-asian-cup': 'petal-cup',
};

export function trophyArtForm(criterion: FootballGridCriterionView): string {
  const candidates = [criterion.key, criterion.assetKey, criterion.id, criterion.labelEn]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase().replace(/\s+/g, '-'));
  const key = Object.keys(TROPHY_FORMS).find((id) => candidates.some((candidate) =>
    candidate === id || candidate.endsWith(`:${id}`) || candidate.endsWith(`-${id}`)
    || candidate.endsWith(`/${id}.svg`)));
  return key ? TROPHY_FORMS[key] : 'cup';
}

export function CriterionFallbackArt({ criterion, className }: {
  criterion: FootballGridCriterionView;
  className?: string;
}) {
  const cup = criterion.family === 'trophy_award' || criterion.family === 'league';
  const person = criterion.family === 'manager' || criterion.family === 'teammate';
  const form = trophyArtForm(criterion);
  return (
    <svg aria-hidden="true" data-quizball-art={cup ? form : criterion.family}
      viewBox="0 0 64 64" className={className} fill="none" stroke="#07111D"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {cup ? <>
        {form === 'plate' ? <>
          <circle cx="32" cy="31" r="25" fill="#DCE8EF" />
          <circle cx="32" cy="31" r="17" fill="#FFE600" />
          <circle cx="32" cy="31" r="7" fill="#194BFF" />
          <path d="M32 9v4m0 36v4M10 31h4m36 0h4M16 15l3 3m26 26 3 3M16 47l3-3m26-26 3-3" />
        </> : form === 'hexagon' || form === 'scudetto' ? <>
          <path d={form === 'hexagon' ? 'm32 5 22 13v27L32 58 10 45V18Z' : 'M12 8h40v27c0 12-20 23-20 23S12 47 12 35Z'} fill="#DCE8EF" />
          <path d="M23 17h18v19L32 46l-9-10Z" fill="#194BFF" />
          <path d="m32 20 2 5 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1Z" fill="#FFE600" />
        </> : form === 'world-cup' || form === 'ball-cup' ? <>
          <circle cx="32" cy="17" r="12" fill="#FFE600" />
          <path d="m25 7 6 9-7 7m17-14-8 7 5 11" />
          <path d="M17 21c1 13 16 12 10 29h-6v8h24v-8h-8c-5-12 9-20 10-29l-8 5-7 12-8-12Z" fill="#FFE600" />
          <path d="M23 52h20v6H23z" fill="#194BFF" />
        </> : form === 'faceted-cup' || form === 'spiral-cup' || form === 'petal-cup' ? <>
          <path d="m14 8 8 34 10 10 10-10 8-34-12 4-6-7-6 7Z" fill="#DCE8EF" />
          <path d={form === 'spiral-cup' ? 'm17 17 29 10-23 8 16 8M24 9l15 34' : 'm22 12 4 29 6 10 6-10 4-29M32 7v42'} />
          <path d="M23 53h18v6H23z" fill="#194BFF" />
        </> : <>
          <path d={form === 'big-ears'
            ? 'M21 13C5-2 2 33 22 32m21-19C59-2 62 33 42 32'
            : 'M19 16H7v8c0 9 7 13 16 13m22-21h12v8c0 9-7 13-16 13'}
          fill="none" stroke={form === 'royal-cup' ? '#194BFF' : '#07111D'} strokeWidth="4" />
          <path d="M18 13h28l-3 20c-1 7-6 11-11 11s-10-4-11-11Z"
            fill={['gold-cup', 'crowned-cup', 'royal-cup'].includes(form) ? '#FFE600' : '#DCE8EF'} />
          <path d="M32 44v9m-10 5h20" strokeWidth="5" />
          {['royal-cup', 'crowned-cup'].includes(form) ? <>
            <path d="m24 5 4 3 4-5 4 5 4-3-2 8H26Z" fill="#194BFF" />
            <path d="m27 24 5-4 5 4v10l-5 4-5-4Z" fill="#194BFF" />
          </> : <path d="m32 20 2 5 6 1-4 4 1 5-5-3-5 3 1-5-4-4 6-1Z" fill="#194BFF" stroke="none" />}
          {['lid-cup', 'tall-cup'].includes(form) && <path d="M18 12c2-6 26-6 28 0M32 3v4" />}
          {['tricolour-cup', 'ribbon-cup'].includes(form) && <>
            <path d="m14 17-4 25 8-5" stroke="#194BFF" strokeWidth="5" />
            <path d="m50 17 4 25-8-5" stroke="#194BFF" strokeWidth="5" />
          </>}
        </>}
      </> : person ? <>
        <path d="M8 59v-9c0-12 48-12 48 0v9" fill="#194BFF" />
        <circle cx="32" cy="22" r="15" fill="#FFE600" />
        <path d="m25 43 7 10 7-10" stroke="#FFE600" />
        {criterion.family === 'manager' && <path d="M43 39h15v20H43zM47 44h7m-7 5h7m-7 5h4" fill="#FFE600" />}
      </> : criterion.family === 'country' ? <>
        <path d="M13 58V7m1 3c17-13 25 10 43-3v29c-18 13-26-10-43 3" fill="#194BFF" />
        <path d="m33 15 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#FFE600" />
      </> : <>
        <path d="M7 28 32 12l25 16v29H7z" fill="#194BFF" />
        <path d="M15 31h34v26H15z" fill="#FFE600" />
        <path d="M24 43h16v14H24zM13 8v14M51 8v14M8 8h10M46 8h10" />
        <path d="M19 35h4m7 0h4m7 0h4" />
      </>}
    </svg>
  );
}
