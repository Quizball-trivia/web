'use client';

const STEPS = [
  {
    n: 1,
    icon: '🎟️',
    title: 'Claim your entry',
    body: 'Free, once per week. Entry opens Friday 21:00 and closes at kickoff.',
  },
  {
    n: 2,
    icon: '⚽',
    title: 'Play the qualifier',
    body: 'Saturday 14:00 — everyone plays the same questions at the same time. Climb the leaderboard.',
  },
  {
    n: 3,
    icon: '🏆',
    title: 'Top 24 reach playoffs',
    body: 'Sunday 14:00 — the best 24 return for a live knockout. Win it to be champion.',
  },
];

/** Three-step explainer for the weekend format. */
export function HowItWorks() {
  return (
    <section>
      <h2 className="mb-3 font-poppins text-lg font-black uppercase tracking-wide text-white">How it works</h2>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.n} className="rounded-2xl border-2 border-white/8 bg-surface-card-deep p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-blue font-poppins text-sm font-black text-white">
                {step.n}
              </span>
              <span className="text-xl leading-none">{step.icon}</span>
            </div>
            <div className="font-poppins text-sm font-black uppercase text-white">{step.title}</div>
            <p className="mt-1 font-poppins text-[12px] font-medium leading-snug text-white/60">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
