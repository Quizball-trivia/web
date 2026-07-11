import { RecentMatchRow, type RecentMatchRowProps } from '@/components/shared/RecentMatchRow';

type PreviewFixture = Omit<RecentMatchRowProps, 'interactionProps' | 'interactionClassName'> & {
  label: string;
};

const fixtures: PreviewFixture[] = [
  {
    label: 'completed · win · placement · FF',
    result: 'win',
    opponent: 'VS ყველაზე-გრძელი-მეტოქის-სახელი-დინამო-თბილისი',
    opponentTier: 'World-Class',
    avatarCustomization: { base: 'avatar-1' },
    modeLabel: 'საკვალიფიკაციო',
    modeIcon: 'ranked',
    time: '1D AGO',
    pill: { label: 'საკვალიფიკაციო', tone: 'bg-white/10 text-white/70' },
    score: { value: '3-0', badge: 'FF', badgeVariant: 'red' },
  },
  {
    label: 'completed · loss · ranked',
    result: 'loss',
    opponent: 'VS საფეხბურთო-კლუბი-საბურთალოს-აკადემიის-კაპიტანი',
    opponentTier: 'Captain',
    avatarCustomization: { base: 'avatar-2' },
    modeLabel: 'რეიტინგული',
    modeIcon: 'ranked',
    time: '12H AGO',
    pill: { label: '-128 RP', tone: 'bg-brand-red-rust text-white', kind: 'metadata' },
    score: { value: '0-7' },
  },
  {
    label: 'completed · draw · penalties',
    result: 'draw',
    opponent: 'VS ქუთაისის-ტორპედოს-ახალგაზრდული-გუნდის-მეკარე',
    opponentTier: 'Key Player',
    avatarCustomization: { base: 'avatar-3' },
    modeLabel: 'რეიტინგული',
    modeIcon: 'ranked',
    time: '59M AGO',
    pill: { label: '+0 RP', tone: 'bg-brand-slate-deep text-white', kind: 'metadata' },
    score: { value: '2-2', suffix: '(P 11-10)' },
  },
  {
    label: 'abandoned · cancelled',
    result: 'draw',
    opponent: 'VS ძალიან-გრძელი-მეგობრული-მატჩის-მეტოქის-სახელი',
    opponentTier: 'Reserve',
    avatarCustomization: { base: 'avatar-4' },
    modeLabel: 'მეგობრული',
    time: '1D AGO',
    score: { value: '0-0', badge: 'გაუქმდა', badgeVariant: 'muted' },
  },
  {
    label: 'completed · auction · win',
    result: 'win',
    opponent: 'VS გრძელი-მეტოქე-ერთი, კიდევ-უფრო-გრძელი-მეტოქე-ორი',
    opponentTier: 'Legend',
    avatarCustomization: { base: 'avatar-5' },
    modeLabel: 'აუქციონი',
    modeIcon: 'auction',
    time: '3D AGO',
    pill: { label: '1ST / 3', tone: 'bg-brand-green-deep text-white' },
    score: null,
  },
];

const widths = [320, 375, 430] as const;

export default function RecentMatchesPreviewPage() {
  return (
    <main className="min-h-dvh overflow-x-auto bg-surface-deep px-4 py-8 text-white">
      <div className="mx-auto w-fit min-w-full space-y-8">
        <header className="space-y-1">
          <p className="font-poppins text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-yellow">
            Dev preview · ka stress fixtures
          </p>
          <h1 className="font-poppins text-2xl font-semibold uppercase">Recent match rows</h1>
          <p className="max-w-2xl font-poppins text-sm text-white/55">
            Fixed content widths with long Georgian labels, names, result states, FF, penalties, and cancellation.
          </p>
        </header>

        <div className="grid w-fit items-start gap-8 xl:grid-cols-3">
          {widths.map((width) => (
            <section key={width} className="space-y-3" style={{ width }}>
              <div className="flex items-center justify-between border-b border-white/10 pb-2 font-poppins">
                <h2 className="text-sm font-semibold uppercase">{width}px</h2>
                <span className="text-[10px] uppercase tracking-wider text-white/40">content width</span>
              </div>
              <div className="space-y-3">
                {fixtures.map(({ label, ...fixture }) => (
                  <div key={label} className="space-y-1.5">
                    <p className="truncate font-poppins text-[9px] font-semibold uppercase tracking-[0.08em] text-white/35">
                      {label}
                    </p>
                    <RecentMatchRow {...fixture} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
