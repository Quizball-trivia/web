import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LOCALES } from '@/lib/i18n/locale';
import { DOWNLOAD_COPY, GOOGLE_PLAY_URL, downloadPath } from '@/lib/seo/app-download';

vi.mock('@/contexts/LocaleContext', () => ({ useLocale: () => ({ locale: 'en', t: (key: string) => key }) }));
vi.mock('@/components/shared/SocialLinks', () => ({ SocialLinks: () => null }));
vi.mock('@/components/shared/ContactModal', () => ({ ContactModal: () => null }));
vi.mock('../public/PublicLinks', () => ({ SignInLink: ({ children }: { children: ReactNode }) => <span>{children}</span> }));

import { SiteFooter } from '@/components/layout/SiteFooter';
import { HubBody } from '../HubSeo';

describe('Android discovery links in server-rendered pages', () => {
  it.each(LOCALES)('renders the localized download and official Play link on the %s homepage', (locale) => {
    const doc = new DOMParser().parseFromString(renderToStaticMarkup(<HubBody locale={locale} />), 'text/html');
    expect(doc.querySelector(`a[href="${downloadPath(locale)}"]`)?.textContent).toBe(DOWNLOAD_COPY[locale].homeCta);
    expect(doc.querySelector(`a[href="${GOOGLE_PLAY_URL}"]`)?.textContent).toContain(DOWNLOAD_COPY[locale].storeCta);
  });

  it.each(LOCALES)('keeps the download link in both phone and desktop footer HTML for %s', (locale) => {
    const doc = new DOMParser().parseFromString(renderToStaticMarkup(<SiteFooter locale={locale} />), 'text/html');
    const links = doc.querySelectorAll(`a[href="${downloadPath(locale)}"]`);
    expect(links).toHaveLength(2);
    for (const link of links) expect(link.textContent).toBe(DOWNLOAD_COPY[locale].homeCta);
  });
});
