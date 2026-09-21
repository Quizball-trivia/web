import type { FootballGridCriterionView } from '@/lib/realtime/socket.types';
import { wildcardKey } from '../criterionPresentation';

/** Small, original Quizball pictograms: strong silhouettes, yellow/ink, no monogram shields. */
export function CriterionIllustration({ criterion, className }: { criterion: FootballGridCriterionView; className?: string }) {
  const key = wildcardKey(criterion);
  if (!key) return null;
  const calendar = key.startsWith('born-');
  const goldenBall = key === 'ballon-dor-winner';
  const globe = key === 'titles-multiple-countries' || key === 'major-leagues-3';
  const shirt = key.startsWith('position-') || key === 'international-caps-100';
  const derby = key === 'played-for-rivals';
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className={className} fill="none" stroke="#07111D" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
      {calendar ? <>
        <path d="M10 15 48 10l7 43-39 4Z" fill="#194BFF" stroke="none" />
        <path d="M9 14h43v39H9z" fill="#FFE600" />
        <path d="M9 25h43M20 8v12M41 8v12" strokeWidth="4" />
        <path d="m31 30 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#07111D" stroke="none" />
      </> : goldenBall ? <>
        <path d="m17 54 6-10h18l6 10Z" fill="#194BFF" />
        <circle cx="32" cy="26" r="21" fill="#FFE600" />
        <path d="m32 17 9 7-4 11H26l-4-11Z" fill="#07111D" />
        <path d="M32 5v12M12 20l10 4M18 43l8-8M46 42l-9-7M52 20l-11 4" />
        <path d="m51 5 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#FFE600" stroke="none" />
      </> : globe ? <>
        <circle cx="25" cy="30" r="20" fill="#194BFF" />
        <path d="m17 12 3 10-8 7 7 5 3 11 9-9-3-10 9-8M8 35l10 3" stroke="#FFE600" strokeWidth="4" />
        <path d="M37 24h16v11c0 8-16 8-16 0Zm16 2h7v5c0 5-4 8-8 8M37 26h-6v5c0 5 3 8 7 8M45 42v9m-8 4h16" fill="#FFE600" />
      </> : shirt || derby ? <>
        {derby && <path d="m35 8 9 3 13 7-5 12-6-3v28H25V27l-6 3-5-12 13-7Z" fill="#194BFF" />}
        <path d="m24 10-10 4-10 9 7 11 8-4v25h27V30l7 4 7-11-11-9-9-4c-3 8-13 8-16 0Z" fill="#FFE600" />
        {key.startsWith('position-') ? <>
          <path d="M26 24h13v22H26zM26 35h13" strokeWidth="2" />
          <circle cx="32.5" cy={key==='position-gk'?43:key==='position-def'?39:key==='position-mid'?34:28} r="4" fill="#194BFF" stroke="none" />
        </> : <path d="m32 25 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#07111D" stroke="none" />}
      </> : <>
        <path d="M20 10h25v19c0 17-25 17-25 0ZM20 15H9v9c0 8 5 12 14 13M45 15h10v9c0 8-4 12-13 13" fill="#FFE600" />
        <path d="M32 42v10m-12 5h25" strokeWidth="5" />
        <path d="m32 16 2 5 6 1-4 4 1 6-5-3-5 3 1-6-4-4 6-1Z" fill="#194BFF" stroke="none" />
        {key === 'treble-winner' && <path d="m11 43 2 4 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1Zm42 0 2 4 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1Z" fill="#FFE600" stroke="none" />}
      </>}
    </svg>
  );
}
