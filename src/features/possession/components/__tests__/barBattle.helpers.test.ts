import { describe, expect, it } from 'vitest';
import { getChargeImpactXKeyframes } from '../bar-battle/barBattle.helpers';

describe('barBattle helpers', () => {
  it('lets normal charge impacts recoil toward the original lane', () => {
    expect(getChargeImpactXKeyframes(20, 40, false)).toEqual([20, 20, 60, 28]);
  });

  it('keeps saved penalty shield impacts at the contact point', () => {
    expect(getChargeImpactXKeyframes(20, 40, true)).toEqual([20, 20, 60, 60]);
  });
});
