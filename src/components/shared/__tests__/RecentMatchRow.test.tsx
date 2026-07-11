import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecentMatchRow } from '../RecentMatchRow';

vi.mock('@/components/TierFrameAvatar', () => ({
  TierFrameAvatar: () => <div data-testid="avatar" />,
}));

describe('RecentMatchRow', () => {
  it('only truncates the opponent and drops a pill that repeats the mode', () => {
    const { container } = render(
      <RecentMatchRow
        result="win"
        opponent="VS ყველაზე-გრძელი-მეტოქის-სახელი-დინამო-თბილისი"
        modeLabel="საკვალიფიკაციო"
        modeIcon="ranked"
        time="1D AGO"
        pill={{ label: 'საკვალიფიკაციო', tone: 'bg-white/10 text-white/70' }}
        score={{ value: '3-0', badge: 'FF', badgeVariant: 'red' }}
      />,
    );

    expect(container.firstElementChild).toHaveClass('@container', 'grid', 'min-w-0');
    expect(screen.getByTitle('VS ყველაზე-გრძელი-მეტოქის-სახელი-დინამო-თბილისი')).toHaveClass('truncate');
    expect(screen.getAllByText('საკვალიფიკაციო')).toHaveLength(1);
    expect(screen.getByText('FF')).not.toHaveClass('truncate');
    expect(screen.getByText('· 1D AGO')).toHaveClass('whitespace-nowrap');
  });

  it('keeps penalties intact and puts RP in the wrapping metadata row', () => {
    render(
      <RecentMatchRow
        result="draw"
        opponent="VS მეტოქე"
        modeLabel="რეიტინგული"
        modeIcon="ranked"
        time="59M AGO"
        pill={{ label: '+0 RP', tone: 'bg-brand-slate-deep text-white', kind: 'metadata' }}
        score={{ value: '2-2', suffix: '(P 11-10)' }}
      />,
    );

    expect(screen.getByText('(P 11-10)')).toHaveClass('whitespace-nowrap');
    expect(screen.getByText('(P 11-10)')).not.toHaveClass('truncate');
    expect(screen.getAllByText('+0 RP')).toHaveLength(2);
    expect(screen.getAllByText('+0 RP')[0]).not.toHaveClass('truncate');
  });
});
