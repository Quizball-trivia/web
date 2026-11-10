import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  campaignPublicSlug,
  campaignQuizPath,
  campaignSourceSlug,
  registerCampaignSlugs,
  swapCampaignLocalePath,
} from '../campaignQuiz.routes';

describe('campaign slug registry', () => {
  it('keeps the hardcoded URLs of the original pages when nothing is registered', () => {
    expect(campaignQuizPath('liverpool', 'fr')).toBe('/fr/quiz-foot/quiz-liverpool');
    expect(campaignSourceSlug('seleccion-argentina', 'es')).toBe('argentina');
  });

  it('serves a page the backend announces under its own URL in every language, both ways', () => {
    registerCampaignSlugs([{
      slug: 'northwick-rovers',
      public_slugs: { en: 'northwick-rovers', fr: 'quiz-northwick-rovers', tr: 'northwick-rovers-testi', ru: 'viktorina-nortuik' },
    }]);
    expect(campaignQuizPath('northwick-rovers', 'fr')).toBe('/fr/quiz-foot/quiz-northwick-rovers');
    expect(campaignSourceSlug('northwick-rovers-testi', 'tr')).toBe('northwick-rovers');
    expect(swapCampaignLocalePath('/fr/quiz-foot/quiz-northwick-rovers', 'ru')).toBe('/ru/futbolnaya-viktorina/viktorina-nortuik');
    expect(campaignPublicSlug('northwick-rovers', 'de')).toBe('northwick-rovers');
  });

  it('ignores invalid slugs and unknown languages, and forgets a replaced slug', () => {
    registerCampaignSlugs([{ slug: 'southby', public_slugs: { fr: 'Quiz Southby', xx: 'southby-x' } as never }]);
    expect(campaignPublicSlug('southby', 'fr')).toBe('southby');
    registerCampaignSlugs([{ slug: 'southby', public_slugs: { fr: 'quiz-southby' } }]);
    registerCampaignSlugs([{ slug: 'southby', public_slugs: { fr: 'quiz-southby-fc' } }]);
    expect(campaignSourceSlug('quiz-southby', 'fr')).toBe('quiz-southby');
    expect(campaignSourceSlug('quiz-southby-fc', 'fr')).toBe('southby');
  });
});

describe('campaign quiz API', () => {
  const fetchSpy = vi.fn();
  beforeEach(() => { vi.stubGlobal('fetch', fetchSpy); fetchSpy.mockReset(); });
  afterEach(() => { vi.unstubAllGlobals(); });
  const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

  it('replaces the registry on each read (5-minute reuse), and a backend without it goes back to the tables', async () => {
    const { loadCampaignSlugRegistry, resetCampaignSlugRegistryRead } = await import('../campaignQuiz.api');
    resetCampaignSlugRegistryRead();
    fetchSpy.mockResolvedValueOnce(ok({ pages: [
      { slug: 'eastfield', public_slugs: { pt: 'quiz-do-eastfield' } },
      { slug: 'liverpool', public_slugs: { de: 'liverpool-fc-quiz' } },
    ] }));
    await loadCampaignSlugRegistry();
    await loadCampaignSlugRegistry();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(campaignQuizPath('eastfield', 'pt')).toBe('/pt/quiz-de-futebol/quiz-do-eastfield');
    expect(campaignQuizPath('liverpool', 'de')).toBe('/de/fussball-quiz/liverpool-fc-quiz');

    resetCampaignSlugRegistryRead();
    fetchSpy.mockRejectedValueOnce(new Error('down'));
    await loadCampaignSlugRegistry();
    expect(campaignQuizPath('liverpool', 'de')).toBe('/de/fussball-quiz/liverpool-fc-quiz');

    resetCampaignSlugRegistryRead();
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) });
    await loadCampaignSlugRegistry();
    expect(campaignQuizPath('liverpool', 'de')).toBe('/de/fussball-quiz/liverpool-quiz');
    expect(campaignQuizPath('eastfield', 'pt')).toBe('/pt/quiz-de-futebol/eastfield');
  });

  it('retries a failed registry read on the next request instead of waiting five minutes', async () => {
    const { loadCampaignSlugRegistry, resetCampaignSlugRegistryRead } = await import('../campaignQuiz.api');
    resetCampaignSlugRegistryRead();
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });
    await loadCampaignSlugRegistry();
    fetchSpy.mockResolvedValueOnce(ok({ pages: [{ slug: 'westbury', public_slugs: { tr: 'westbury-testi' } }] }));
    await loadCampaignSlugRegistry();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(campaignQuizPath('westbury', 'tr')).toBe('/tr/futbol-bilgi-yarismasi/westbury-testi');
  });

  it('sends the set version with an answer when the page had one', async () => {
    const { answerCampaignQuizQuestion } = await import('../campaignQuiz.api');
    fetchSpy.mockResolvedValue(ok({ correct: true, correct_option_id: 'b', explanation: null }));
    await answerCampaignQuizQuestion({ slug: 'eastfield', questionId: 'q1', selectedOptionId: 'b', setVersion: 4 });
    await answerCampaignQuizQuestion({ slug: 'eastfield', questionId: 'q1', selectedOptionId: 'b' });
    await answerCampaignQuizQuestion({ slug: 'eastfield', questionId: 'q1', selectedOptionId: 'b', setVersion: 0 });
    const bodies = fetchSpy.mock.calls.map((call) => JSON.parse(String((call[1] as RequestInit).body)));
    expect(bodies[0]).toMatchObject({ set_version: 4 });
    expect(bodies[1]).not.toHaveProperty('set_version');
    expect(bodies[2]).not.toHaveProperty('set_version');
  });
});
