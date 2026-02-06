import { cn } from '@/lib/utils';

export function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#1a1f2e] rounded-2xl border-b-4 border-b-white/10 p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1">{label}</div>
      <div className={cn('text-lg font-black', color)}>{value}</div>
    </div>
  );
}

export function WinIllustration() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
      <path d="M30 25 H60 L55 55 H35 Z" stroke="#22c55e" strokeWidth="2.5" fill="rgba(34,197,94,0.1)" />
      <path d="M30 30 Q18 30 18 42 Q18 50 28 50" stroke="#22c55e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M60 30 Q72 30 72 42 Q72 50 62 50" stroke="#22c55e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="37" y="55" width="16" height="4" rx="2" fill="#22c55e" />
      <rect x="33" y="59" width="24" height="4" rx="2" fill="#22c55e" opacity="0.6" />
      <path d="M45 34 L47.5 39 L53 39.8 L49 43.5 L50 49 L45 46.3 L40 49 L41 43.5 L37 39.8 L42.5 39 Z" fill="#22c55e" />
      <circle cx="22" cy="22" r="1.5" fill="#22c55e" opacity="0.6" />
      <circle cx="68" cy="20" r="1" fill="#22c55e" opacity="0.4" />
      <circle cx="75" cy="35" r="1.5" fill="#22c55e" opacity="0.5" />
    </svg>
  );
}

export function DrawIllustration() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
      <path d="M20 45 Q25 35 35 40 L45 45" stroke="#eab308" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M70 45 Q65 35 55 40 L45 45" stroke="#eab308" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="37" y="54" width="16" height="3" rx="1.5" fill="#eab308" opacity="0.6" />
      <rect x="37" y="60" width="16" height="3" rx="1.5" fill="#eab308" opacity="0.6" />
      <circle cx="45" cy="28" r="2" fill="#eab308" opacity="0.5" />
    </svg>
  );
}

export function LossIllustration() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
      <circle cx="45" cy="40" r="14" stroke="#ef4444" strokeWidth="2.5" fill="rgba(239,68,68,0.08)" />
      <path d="M45 30 L50 36 L48 43 L42 43 L40 36 Z" stroke="#ef4444" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M62 38 Q68 32 74 36" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M71 32 L74 36 L70 38" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none" />
      <line x1="28" y1="35" x2="22" y2="32" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="27" y1="42" x2="20" y2="42" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="28" y1="48" x2="22" y2="52" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M38 62 Q45 57 52 62" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  );
}
