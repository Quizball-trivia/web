import { describe, expect, it } from 'vitest';
import type { FootballGridCriterionView } from '@/lib/realtime/socket.types';
import { criterionPresentation } from '../criterionPresentation';

const clue = (overrides: Partial<FootballGridCriterionView>): FootballGridCriterionView => ({
  id: 'test', key: 'test', family: 'wildcard', labelEn: '', labelKa: '', difficulty: 'normal', assetKey: null, ...overrides,
});

describe('compact board clues', () => {
  it('uses the requested Georgian country abbreviation', () => {
    expect(criterionPresentation(clue({ family: 'country', labelEn: 'United States' }), 'ka')).toEqual({ title: 'ა.შ.შ' });
  });
  it('gives long surnames room without a stranded initial', () => {
    expect(criterionPresentation(clue({ family: 'teammate', labelEn: 'Club teammate of Bastian Schweinsteiger' }), 'en'))
      .toEqual({ title: 'Schweinsteiger', eyebrow: 'Club teammate' });
  });
  it('shortens the cup name while keeping the winning condition', () => {
    expect(criterionPresentation(clue({ family: 'trophy_award', key: 'trophy:fa-cup' }), 'ka'))
      .toEqual({ title: 'FA თასი', eyebrow: 'მფლობელი' });
  });
  it('keeps the birth decade explicit rather than a cryptic shield abbreviation', () => {
    expect(criterionPresentation(clue({ key: 'wildcard:born-1990s' }), 'en')).toEqual({ title: '1990–99', eyebrow: 'Born' });
    expect(criterionPresentation(clue({ key: 'wildcard:born-2000s' }), 'ka')).toEqual({ title: '2000–09', eyebrow: 'დაბადება' });
  });
  it('abbreviates the Georgian given name while preserving the compound surname and club condition', () => {
    expect(criterionPresentation(clue({ family: 'teammate', labelKa: 'ერთ კლუბში ითამაშა ალესანდრო დელ პიერო-სთან' }), 'ka'))
      .toEqual({ title: 'ა. დელ პიერო', eyebrow: 'თანაგუნდელი კლუბში' });
  });
  it('retains the league champion condition and multiple-country threshold', () => {
    expect(criterionPresentation(clue({ key: 'wildcard:titles-multiple-countries' }), 'en'))
      .toEqual({ title: '2+ countries', eyebrow: 'League champion' });
  });
  it('leaves unfamiliar clues intact rather than guessing their meaning', () => {
    expect(criterionPresentation(clue({ labelEn: 'An unfamiliar rule' }), 'en')).toEqual({ title: 'An unfamiliar rule' });
  });
});
