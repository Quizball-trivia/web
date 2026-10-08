import { describe, expect, it } from 'vitest';
import { LOCALES } from '@/lib/i18n/locale';
import { HOME_COPY } from '../home-copy';

describe('localized Quizball brand and reward copy', () => {
  it.each(LOCALES)('puts the official brand first for %s', (locale) => {
    expect(HOME_COPY[locale].metaTitle).toMatch(/^Quizball — /);
    expect(HOME_COPY[locale].intro).toContain('quizball.io');
    expect(HOME_COPY[locale].intro).toContain('Android');
  });

  it.each([
    ['en', 'in-game coins', 'rare cosmetic', 'cannot be exchanged for money'],
    ['es', 'monedas del juego', 'cosméticos raros', 'no se pueden cambiar por dinero'],
    ['ka', 'სათამაშო ქოინები', 'იშვიათი კოსმეტიკური', 'ფულზე არ იცვლება'],
    ['tr', 'oyun içi jetonlar', 'nadir kozmetik', 'paraya çevrilemez'],
  ] as const)('describes only in-game Weekend League rewards for %s', (locale, coins, items, noCash) => {
    const rewardAnswer = HOME_COPY[locale].faq[1].a;
    expect(rewardAnswer).toContain(coins);
    expect(rewardAnswer).toContain(items);
    expect(rewardAnswer).toContain(noCash);
  });
});
