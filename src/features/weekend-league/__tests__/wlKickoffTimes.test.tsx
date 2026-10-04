import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/queryKeys';
import { HowItWorks } from '../components/HowItWorks';
import { RailNavyGradient } from '../components/RailColorVariants';
import { LocalTimeNote } from '../components/LocalTimeNote';
import { getMilestones } from '../mock-data';
import { formatStageWhen, useWlKickoffTimes } from '../wlTime';

// eslint-disable-next-line @next/next/no-img-element -- test stub for next/image
vi.mock('next/image', () => ({ default: ({ alt }: { alt?: string }) => <img alt={alt ?? ''} /> }));
vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: 'en',
    setLocale: vi.fn(),
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key),
  }),
}));

const current = (qualifier: string | null, final: string | null, entryCloses: string | null = null, status = 'entry_open') => ({
  tournament: { id: 't1', status, entry_closes_at: entryCloses, qualifier_starts_at: qualifier, final_starts_at: final },
});

function Probe() {
  const { qualifierMs, finalMs, fromRow } = useWlKickoffTimes();
  return <output data-from-row={String(fromRow)}>{new Date(qualifierMs).toISOString()} {new Date(finalMs).toISOString()}</output>;
}

describe('useWlKickoffTimes', () => {
  it('reads the tournament already in the query cache and follows it when the row moves', () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.weekendLeague.current(), current('2026-10-10T10:00:00Z', '2026-10-11T10:00:00Z'));
    render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);
    expect(screen.getByRole('status').textContent).toBe('2026-10-10T10:00:00.000Z 2026-10-11T10:00:00.000Z');

    act(() => {
      client.setQueryData(queryKeys.weekendLeague.current(), current('2026-10-10T18:00:00Z', '2026-10-11T18:00:00Z'));
    });
    expect(screen.getByRole('status').textContent).toBe('2026-10-10T18:00:00.000Z 2026-10-11T18:00:00.000Z');
  });

  it('never issues a request of its own', () => {
    const client = new QueryClient();
    const fetchSpy = vi.spyOn(client, 'fetchQuery');
    render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it('falls back to the weekly calendar with no cached row, a row without timestamps, or no query client', () => {
    const calendar = getMilestones(Date.now());
    const expected = `${new Date(calendar.qualifier.targetMs).toISOString()} ${new Date(calendar.playoffs.targetMs).toISOString()}`;
    const expectCalendar = () => {
      expect(screen.getByRole('status').textContent).toBe(expected);
      expect(screen.getByRole('status').dataset.fromRow).toBe('false');
    };

    const empty = render(<QueryClientProvider client={new QueryClient()}><Probe /></QueryClientProvider>);
    expectCalendar();
    empty.unmount();

    const client = new QueryClient();
    client.setQueryData(queryKeys.weekendLeague.current(), current(null, 'not a date'));
    const blank = render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);
    expectCalendar();
    blank.unmount();

    render(<Probe />);
    expectCalendar();
  });

  it.each(['cancelled', 'voided'])('ignores a %s row, like the live screen does', (status) => {
    const calendar = getMilestones(Date.now());
    const client = new QueryClient();
    client.setQueryData(queryKeys.weekendLeague.current(), current('2026-09-26T10:00:00Z', '2026-09-27T10:00:00Z', null, status));
    render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);

    expect(screen.getByRole('status').textContent).toContain(new Date(calendar.qualifier.targetMs).toISOString());
    expect(screen.getByRole('status').dataset.fromRow).toBe('false');
  });

  it('marks times that come from a real row', () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.weekendLeague.current(), current('2026-10-10T18:00:00Z', '2026-10-11T18:00:00Z'));
    render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);

    expect(screen.getByRole('status').dataset.fromRow).toBe('true');
  });
});

describe('HowItWorks', () => {
  it('prints the entry deadline and both kickoffs of the tournament, weekday and hour together', () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.weekendLeague.current(), current('2026-10-10T18:00:00Z', '2026-10-11T17:30:00Z', '2026-10-09T20:00:00Z'));
    render(<QueryClientProvider client={client}><HowItWorks /></QueryClientProvider>);

    const when = (iso: string) => formatStageWhen(Date.parse(iso), 'en');
    expect(screen.getByText(`weekendLeague.step1Body {"deadline":"${when('2026-10-09T20:00:00Z')}"}`)).toBeTruthy();
    expect(screen.getByText(`weekendLeague.step2Body {"when":"${when('2026-10-10T18:00:00Z')}"}`)).toBeTruthy();
    expect(screen.getByText(`weekendLeague.step3Body {"when":"${when('2026-10-11T17:30:00Z')}"}`)).toBeTruthy();
  });
});

describe('play-screen rail', () => {
  it('prints an hour only from a real row; with none cached it says "See times" and no hour', () => {
    const none = render(<QueryClientProvider client={new QueryClient()}><RailNavyGradient /></QueryClientProvider>);
    expect(screen.getByText('weekendLeague.railSeeTimes')).toBeTruthy();
    expect(none.container.textContent).not.toMatch(/\d{1,2}:\d{2}/);
    none.unmount();

    const client = new QueryClient();
    client.setQueryData(queryKeys.weekendLeague.current(), current('2026-10-10T18:00:00Z', '2026-10-11T18:00:00Z'));
    render(<QueryClientProvider client={client}><RailNavyGradient /></QueryClientProvider>);
    expect(screen.getByText(formatStageWhen(Date.parse('2026-10-10T18:00:00Z'), 'en'))).toBeTruthy();
    expect(screen.queryByText('weekendLeague.railSeeTimes')).toBeNull();
  });
});

describe('LocalTimeNote', () => {
  const satKickoff = Date.parse('2026-10-10T18:00:00Z');

  it('gives the Georgia time beside a converted one', () => {
    render(<LocalTimeNote kickoffMs={satKickoff} timeZone="America/Bogota" className="" />);
    expect(screen.getByText('weekendLeague.localTimeNote {"georgia":"Sat 22:00"}')).toBeTruthy();
  });

  it('stays hidden for a viewer already on the Georgia clock', () => {
    const { container } = render(<LocalTimeNote kickoffMs={satKickoff} timeZone="Asia/Tbilisi" className="" />);
    expect(container.textContent).toBe('');
  });
});
