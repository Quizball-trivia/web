import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GOOGLE_PLAY_URL } from '@/lib/seo/app-download';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));

import PressPage from '../page';

describe('verified press app links', () => {
  it.each(['en', 'es'])('links to the official app and retains the public contact for %s', async (locale) => {
    const html = renderToStaticMarkup(await PressPage({ params: Promise.resolve({ locale }) }));
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector(`a[href="${GOOGLE_PLAY_URL}"]`)).not.toBeNull();
    expect(doc.querySelector(`a[href="/${locale}/download"]`)).not.toBeNull();
    expect(doc.body.textContent).toContain('Quizball LLC');
    expect(doc.body.textContent).toContain('io.quizball.mobile');
    expect(doc.querySelector('a[href^="mailto:support@quizball.io"]')).not.toBeNull();
    expect(JSON.parse(doc.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}')).toMatchObject({
      dateModified: '2026-10-07',
    });
  });
});
