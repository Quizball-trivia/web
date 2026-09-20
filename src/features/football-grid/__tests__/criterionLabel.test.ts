import { describe, expect, it } from 'vitest';

import { criterionLabel } from '../criterionLabel';

const criterion = { labelEn: 'Played with Cafu', labelKa: 'ითამაშა კაფუ-სთან ერთად', labelEs: 'Jugó con Cafu', labelTr: 'Cafu ile oynadı' };

describe('criterionLabel', () => {
  it('picks the app locale', () => {
    expect(criterionLabel(criterion, 'en')).toBe('Played with Cafu');
    expect(criterionLabel(criterion, 'ka')).toBe('ითამაშა კაფუ-სთან ერთად');
    expect(criterionLabel(criterion, 'es')).toBe('Jugó con Cafu');
    expect(criterionLabel(criterion, 'tr')).toBe('Cafu ile oynadı');
  });

  it('falls back to English when a locale label is missing', () => {
    expect(criterionLabel({ labelEn: 'Brazil', labelKa: '' }, 'tr')).toBe('Brazil');
    expect(criterionLabel({ labelEn: 'Brazil', labelKa: '' }, 'ka')).toBe('Brazil');
    expect(criterionLabel({ labelEn: 'Brazil', labelKa: 'ბრაზილია', labelEs: null }, 'es')).toBe('Brazil');
  });
});
