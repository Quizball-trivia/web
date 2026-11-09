import { StrictMode } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManualAdSlot } from './ManualAdSlot';

const route = vi.hoisted(() => ({ pathname: '/play' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));

let resize: () => void;
const adWindow = window as Window & { adsbygoogle?: object[] };
const loadScript = () => act(() => {
  document.getElementById('quizball-adsense')?.dispatchEvent(new Event('load'));
});

beforeEach(() => {
  route.pathname = '/play';
  vi.stubEnv('NEXT_PUBLIC_ADSENSE_ENABLED', 'true');
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(728);
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resize = callback; }
    observe() {}
    disconnect() {}
  });
  adWindow.adsbygoogle = [];
});

afterEach(() => {
  cleanup();
  document.getElementById('quizball-adsense')?.remove();
  delete adWindow.adsbygoogle;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('manual ad lifecycle', () => {
  it('loads nothing before launch is enabled or on an unapproved route', () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_ENABLED', 'false');
    const view = render(<ManualAdSlot placement="lobby" />);
    expect(screen.queryByLabelText('Advertisement')).toBeNull();
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_ENABLED', 'true');
    route.pathname = '/daily/challenges/match';
    view.rerender(<ManualAdSlot placement="lobby" />);
    expect(document.getElementById('quizball-adsense')).toBeNull();
  });

  it('requests a visible lobby unit once under StrictMode and repeated resizes', () => {
    render(<StrictMode><ManualAdSlot placement="lobby" /></StrictMode>);
    expect(adWindow.adsbygoogle).toHaveLength(0);
    loadScript();
    act(() => { resize(); resize(); });
    expect(adWindow.adsbygoogle).toHaveLength(1);
    expect(document.querySelector('ins')).toHaveAttribute('data-ad-slot', '2443345758');
    expect(document.querySelectorAll('#quizball-adsense')).toHaveLength(1);
  });

  it('removes results ads on a question transition at the same URL and ignores a late load', () => {
    route.pathname = '/game';
    const Game = ({ results }: { results: boolean }) => results
      ? <ManualAdSlot placement="results" />
      : <div>Question</div>;
    const view = render(<Game results />);
    expect(document.querySelector('ins')).toHaveAttribute('data-ad-slot', '1130264086');
    view.rerender(<Game results={false} />);
    loadScript();
    expect(screen.queryByLabelText('Advertisement')).toBeNull();
    expect(adWindow.adsbygoogle).toHaveLength(0);
    // The SDK may finish while a question is displayed. Results can use it later.
    view.rerender(<Game results />);
    expect(adWindow.adsbygoogle).toHaveLength(1);
    view.rerender(<Game results={false} />);
    expect(document.querySelector('ins')).toBeNull();
  });

  it('waits for a hidden slot to gain width before requesting an ad', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(0);
    render(<ManualAdSlot placement="lobby" />);
    loadScript();
    expect(adWindow.adsbygoogle).toHaveLength(0);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(390);
    act(() => resize());
    expect(adWindow.adsbygoogle).toHaveLength(1);
  });
});
