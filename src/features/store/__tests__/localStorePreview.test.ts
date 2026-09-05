import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';

let store: typeof import('../localStorePreview');
beforeAll(async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.resetModules();
  store = await import('../localStorePreview');
});
afterAll(() => vi.unstubAllEnvs());

describe('local store preview', () => {
  it('buys all new items, charges once, and survives a saved outfit reload', () => {
    let state = store.freshLocalStore();
    for (const [slot, id] of [['jersey','jersey_celtic'],['hair','hair_short_twists'],['glasses','glasses_sport_blue']]) {
      state = store.purchaseLocalPart(state, `avatar_${id}`);
      state = { ...state, customization: { ...state.customization, [slot]: id } };
    }
    expect(state.coins).toBe(1935000);
    expect(store.purchaseLocalPart(state, 'avatar_jersey_celtic')).toBe(state);
    expect(store.readLocalStore(store.serializeLocalStore(state))).toEqual(state);
  });
  it('rejects unaffordable and unknown purchases without changing balance or ownership', () => {
    const state = { ...store.freshLocalStore(), coins: 5 };
    expect(() => store.purchaseLocalPart(state, 'avatar_jersey_celtic')).toThrow('Not enough');
    expect(() => store.purchaseLocalPart(state, 'missing')).toThrow('unavailable');
    expect(state.coins).toBe(5);
    expect(state.ownedPartIds).toEqual([]);
  });
  it('recovers from corrupt storage and drops unowned equipment', () => {
    expect(store.readLocalStore('{broken')).toEqual(store.freshLocalStore());
    expect(store.readLocalStore('{"coins":-1,"ownedPartIds":[]}')).toEqual(store.freshLocalStore());
    const state = store.readLocalStore(JSON.stringify({ coins: 100, ownedPartIds: [], avatar: 'qb-avatar:skin_male_dark?jersey=jersey_celtic&hair=unknown' }));
    expect(state.customization.skin).toBe('skin_male_dark');
    expect(state.customization.jersey).toBeUndefined();
    expect(state.customization.hair).toBeUndefined();
  });
});
