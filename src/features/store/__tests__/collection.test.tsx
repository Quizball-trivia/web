import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';

let avatars: typeof import('@/lib/avatars');
let parts: typeof import('@/lib/avatars/parts');
let Local: typeof import('../localStorePreview');
let AvatarLayers: typeof import('@/components/AvatarLayers')['AvatarLayers'];
beforeAll(async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.resetModules();
  avatars = await import('@/lib/avatars');
  parts = await import('@/lib/avatars/parts');
  Local = await import('../localStorePreview');
  AvatarLayers = (await import('@/components/AvatarLayers')).AvatarLayers;
});
afterEach(cleanup);
afterAll(() => vi.unstubAllEnvs());

describe('expanded local wardrobe', () => {
  it('keeps every additional slot and the selected hair colour through reload', () => {
    let state = Local.freshLocalStore();
    const ids = ['hair_ronaldinho', 'headwear_cech', 'earwear_hoop'];
    for (const id of ids) {
      const part = parts.getAvatarPart(id)!;
      state = Local.purchaseLocalPart(state, part.productSlug!);
      state = { ...state, customization: { ...state.customization, [part.slot]: id, hairColor: 'pink_streaks' } };
    }
    expect(Local.readLocalStore(Local.serializeLocalStore(state))).toEqual(state);
    expect(avatars.resolveAvatarCustomization({ skin: state.customization.skin, base: avatars.encodeAvatarCustomization(state.customization), ...state.customization })).toMatchObject(state.customization);
  });
  it('rejects a valid part placed in the wrong extra slot', () => {
    const decoded = avatars.decodeAvatarCustomization('qb-avatar:skin_male_white?headwear=earwear_hoop&hairColor=invalid');
    expect(decoded?.headwear).toBeUndefined();
    expect(decoded?.hairColor).toBeUndefined();
  });
  it('covers hair under Čech’s helmet without deleting the selected hairstyle', () => {
    const customization = avatars.customizationFromAvatarValue('qb-avatar:skin_male_white?hair=hair_haaland&headwear=headwear_cech');
    const { container, rerender } = render(<AvatarLayers customization={customization} />);
    expect(container.querySelector('[data-avatar-slot="hair"]')).toBeNull();
    expect(container.querySelector('[data-part-id="headwear_cech"]')).not.toBeNull();
    rerender(<AvatarLayers customization={{ ...customization, headwear: undefined }} />);
    expect(container.querySelector('[data-part-id="hair_haaland"]')).not.toBeNull();
  });
  it('keeps hair visible with earrings and applies colour only to hair', () => {
    const customization = avatars.customizationFromAvatarValue('qb-avatar:skin_male_white?hair=hair_mullet&earwear=earwear_hoop&hairColor=blue_tips');
    const { container } = render(<AvatarLayers customization={customization} />);
    const hair = container.querySelector('[data-avatar-slot="hair"]')!;
    expect(hair.querySelectorAll('img')).toHaveLength(2);
    expect((hair.querySelectorAll('img')[1] as HTMLImageElement).style.clipPath).toBe('inset(0 0 58% 0)');
    expect((container.querySelector('[data-avatar-slot="earwear"] img') as HTMLImageElement).style.filter).toBe('');
  });
  it('supports clearing all optional slots without restoring defaults', () => {
    const empty = avatars.resolveAvatarCustomization({ skin: 'skin_male_dark' });
    const { container } = render(<AvatarLayers customization={empty} />);
    expect(container.querySelectorAll('[data-avatar-slot]')).toHaveLength(0);
  });
});

it('applies tuner changes to mounted avatars and restores the default on reset', async () => {
  const { savePartTuning, TUNING_KEY } = await import('@/lib/avatars/usePartTuning');
  const customization = avatars.customizationFromAvatarValue('qb-avatar:skin_male_white?jersey=jersey_river_plate');
  const { container } = render(<AvatarLayers customization={customization} />);
  const jersey = () => container.querySelector('[data-avatar-slot="jersey"] img') as HTMLImageElement;
  const original = jersey().style.left;
  act(() => savePartTuning({ position: { jersey_river_plate: { top: 42, left: 15.25, width: 68 } }, storePosition: {} }));
  expect(jersey().style.left).toBe('15.25%');
  expect(JSON.parse(localStorage.getItem(TUNING_KEY)!).position.jersey_river_plate.width).toBe(68);
  act(() => savePartTuning({ position: {}, storePosition: {} }));
  expect(jersey().style.left).toBe(original);
  localStorage.removeItem(TUNING_KEY);
});

it('moves selected hair behind the face without losing fit or helmet rules', async () => {
  const { savePartTuning, TUNING_KEY } = await import('@/lib/avatars/usePartTuning');
  const customization = avatars.customizationFromAvatarValue('qb-avatar:skin_male_white?hair=hair_valderrama');
  const { container, rerender } = render(<><div data-layer="back"><AvatarLayers customization={customization} placement="back" /></div><div data-layer="front"><AvatarLayers customization={customization} /></div></>);
  const hair = '[data-avatar-slot="hair"]';
  expect(container.querySelector(`[data-layer="front"] ${hair}`)).not.toBeNull();
  act(() => savePartTuning({ position: { hair_valderrama: { top: -19.5, left: 15, width: 64.75 } }, storePosition: {}, hairBehindFace: { hair_valderrama: true } }));
  expect(container.querySelector(`[data-layer="front"] ${hair}`)).toBeNull();
  expect((container.querySelector(`[data-layer="back"] ${hair} img`) as HTMLImageElement).style.left).toBe('15%');
  expect(JSON.parse(localStorage.getItem(TUNING_KEY)!).hairBehindFace.hair_valderrama).toBe(true);
  rerender(<AvatarLayers customization={{ ...customization, headwear: 'headwear_cech' }} placement="back" />);
  expect(container.querySelector(hair)).toBeNull();
  act(() => savePartTuning({ position: {}, storePosition: {} }));
  localStorage.removeItem(TUNING_KEY);
});

it('splits the fringe and silhouette across the face while retaining fit and colour', async () => {
  const { savePartTuning, TUNING_KEY } = await import('@/lib/avatars/usePartTuning');
  const customization = { ...avatars.customizationFromAvatarValue('qb-avatar:skin_male_white?hair=hair_valderrama'), hairColor: 'pink_streaks' as const };
  act(() => savePartTuning({ position: { hair_valderrama: { top: -19.5, left: 15, width: 64.75 } }, storePosition: {}, hairFrontPercent: { hair_valderrama: 48 } }));
  const { container } = render(<><div data-layer="back"><AvatarLayers customization={customization} placement="back" /></div><div data-layer="front"><AvatarLayers customization={customization} /></div></>);
  const back = container.querySelector('[data-layer="back"] img') as HTMLImageElement;
  const front = container.querySelector('[data-layer="front"] img') as HTMLImageElement;
  expect(back.style.maskImage).toBe('');
  expect(front.style.maskImage).toContain('radial-gradient');
  expect(front.style.left).toBe(back.style.left);
  expect(container.querySelectorAll('[data-layer="front"] img')).toHaveLength(2);
  expect(JSON.parse(localStorage.getItem(TUNING_KEY)!).position.hair_valderrama.width).toBe(64.75);
  act(() => savePartTuning({ position: {}, storePosition: {} }));
  localStorage.removeItem(TUNING_KEY);
});

it('keeps glasses tilt and height independent from position and store-card tuning', async () => {
  const { savePartTuning, tunedTransform, TUNING_KEY } = await import('@/lib/avatars/usePartTuning');
  const part = parts.GLASSES_PARTS.find(p => p.localOnly)!;
  const tuning = { position: { [part.id]: { top: 14, left: 30, width: 40 } }, storePosition: {}, transform: { [part.id]: { rotation: 8, scaleY: 0.8 } }, storeTransform: { [part.id]: { rotation: -5, scaleY: 1.2 } } };
  const { container } = render(<AvatarLayers customization={{ glasses: part.id as never }} />);
  act(() => savePartTuning(tuning));
  const img = container.querySelector('img')!;
  expect(img.style.transform).toBe('rotate(8deg) scaleY(0.8)');
  expect(img.style.top).toBe('14%');
  expect(tunedTransform(part, tuning, true)).toEqual({ rotation: -5, scaleY: 1.2 });
  expect(JSON.parse(localStorage.getItem(TUNING_KEY)!).position).toEqual(tuning.position);
  act(() => savePartTuning({ position: {}, storePosition: {} }));
  expect(img.style.transform).toBe('rotate(0deg) scaleY(1)');
  localStorage.removeItem(TUNING_KEY);
});
