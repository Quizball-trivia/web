import { describe, expect, it } from 'vitest';
import { AUCTION_SQUAD_SIZE, FORMATIONS, MAX_SQUAD_CHEMISTRY, createEmptyTeam, isTeamComplete, maxSquadChemistryOf, squadSizeOf } from '../data';
import { TRAINING_FORMATION, trainingLotFootballer } from '@/features/auction-training/data/auctionTrainingFixtures';

describe('formation-aware squad size', () => {
  it('keeps the live game at 7 slots / 21 chemistry', () => {
    expect(squadSizeOf(FORMATIONS[0])).toBe(AUCTION_SQUAD_SIZE);
    expect(maxSquadChemistryOf(FORMATIONS[0])).toBe(MAX_SQUAD_CHEMISTRY);
    expect(isTeamComplete(createEmptyTeam(FORMATIONS[0]))).toBe(false);
  });

  it('completes the training squad at 3 slots', () => {
    expect(squadSizeOf(TRAINING_FORMATION)).toBe(3);
    expect(maxSquadChemistryOf(TRAINING_FORMATION)).toBe(9);
    const team = createEmptyTeam(TRAINING_FORMATION);
    team.slots.FWD.push(trainingLotFootballer(0, 'en'));
    team.slots.MID.push(trainingLotFootballer(2, 'en'));
    expect(isTeamComplete(team)).toBe(false);
    team.slots.GK.push(trainingLotFootballer(3, 'en'));
    expect(isTeamComplete(team)).toBe(true);
  });

  it('localises lot names and hints, keeps the stat steps first', () => {
    const en = trainingLotFootballer(0, 'en');
    const ka = trainingLotFootballer(0, 'ka');
    expect(en.clues).toHaveLength(7);
    expect(en.startingPrice).toBe(26_000_000);
    expect(ka.name).not.toBe(en.name);
    expect(ka.clues.slice(0, 5)).toEqual(en.clues.slice(0, 5));
    expect(ka.clues[5]).not.toBe(en.clues[5]);
  });
});
