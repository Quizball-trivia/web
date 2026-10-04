import { describe, expect, it } from 'vitest';
import { decodeAvatarCustomization, encodeAvatarCustomization, resolveAvatarCustomization } from '@/lib/avatars';
import { WL_FRAME_PARTS, wlFramePlace } from '@/lib/avatars/frames';

describe('Weekend League frames in the avatar value', () => {
  it('survives the picker save round trip', () => {
    const custom = { skin: 'skin_male_white', jersey: 'jersey_wl_retro_home', frame: 'frame_wl_champion' };
    expect(decodeAvatarCustomization(encodeAvatarCustomization(custom))).toMatchObject({ frame: 'frame_wl_champion' });
  });

  it('drops unknown frame ids instead of carrying them into a save', () => {
    expect(encodeAvatarCustomization({ skin: 'skin_male_white', frame: 'frame_nope' })).not.toContain('frame');
    expect(decodeAvatarCustomization('qb-avatar:skin_male_white?frame=frame_nope')).not.toHaveProperty('frame');
  });

  it('removing the frame removes it from the saved value', () => {
    const encoded = encodeAvatarCustomization({ skin: 'skin_male_white', frame: undefined });
    expect(decodeAvatarCustomization(encoded)).not.toHaveProperty('frame');
  });

  it('a frame alone counts as a structured value (explicitly empty slots stay empty)', () => {
    expect(resolveAvatarCustomization({ frame: 'frame_wl_podium' })).toMatchObject({ frame: 'frame_wl_podium' });
  });

  it('maps the three frames to their podium places and matches the backend product slugs', () => {
    expect(WL_FRAME_PARTS.map((f) => [f.id, f.place, f.productSlug])).toEqual([
      ['frame_wl_champion', 1, 'avatar_frame_wl_champion'],
      ['frame_wl_runnerup', 2, 'avatar_frame_wl_runnerup'],
      ['frame_wl_podium', 3, 'avatar_frame_wl_podium'],
    ]);
    expect(wlFramePlace('frame_wl_runnerup')).toBe(2);
    expect(wlFramePlace(undefined)).toBeNull();
  });
});
