import { describe, expect, it } from 'vitest';
import {
  campaignQuizPath,
  campaignSourceSlug,
  swapCampaignLocalePath,
} from '../campaignQuiz.routes';

describe('localized campaign quiz routes', () => {
  it('uses Spanish search-friendly paths for generic quiz formats', () => {
    expect(campaignQuizPath('guess-the-player', 'es')).toBe('/es/quiz-de-futbol/adivina-el-jugador');
    expect(campaignQuizPath('career-path', 'es')).toBe('/es/quiz-de-futbol/trayectoria-del-jugador');
    expect(campaignQuizPath('club-badges', 'es')).toBe('/es/quiz-de-futbol/escudos-de-futbol');
  });

  it('maps localized public slugs back to their source campaign record', () => {
    expect(campaignSourceSlug('adivina-el-jugador', 'es')).toBe('guess-the-player');
  });

  it('switches equivalent English and Spanish campaign URLs', () => {
    expect(swapCampaignLocalePath('/en/football-quiz/guess-the-player', 'es'))
      .toBe('/es/quiz-de-futbol/adivina-el-jugador');
    expect(swapCampaignLocalePath('/es/quiz-de-futbol/adivina-el-jugador', 'en'))
      .toBe('/en/football-quiz/guess-the-player');
  });
});
