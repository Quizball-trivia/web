import { customizationFromAvatarValue, decodeAvatarCustomization, encodeAvatarCustomization } from '@/lib/avatars';
import { ALL_AVATAR_PARTS } from '@/lib/avatars/parts';
import type { AvatarCustomization } from '@/types/game';

export const LOCAL_STORE_KEY = 'quizball:store-examples:v1';
export interface LocalStoreState {
  coins: number;
  ownedPartIds: string[];
  customization: AvatarCustomization;
}
export function freshLocalStore(): LocalStoreState {
  return { coins: 2000000, ownedPartIds: [], customization: customizationFromAvatarValue(null) };
}
export function readLocalStore(value: string | null): LocalStoreState {
  if (!value) return freshLocalStore();
  try {
    const parsed = JSON.parse(value);
    if (!Number.isSafeInteger(parsed.coins) || parsed.coins < 0 || !Array.isArray(parsed.ownedPartIds)) return freshLocalStore();
    const ownedPartIds = parsed.ownedPartIds.filter((id: unknown) => typeof id === 'string' && ALL_AVATAR_PARTS.some(p => p.id === id));
    const customization = decodeAvatarCustomization(parsed.avatar);
    if (!customization) return freshLocalStore();
    for (const part of ALL_AVATAR_PARTS) {
      if (customization[part.slot] === part.id && !part.free && !ownedPartIds.includes(part.id)) delete customization[part.slot];
    }
    return { coins: parsed.coins, ownedPartIds, customization };
  } catch { return freshLocalStore(); }
}
export function serializeLocalStore(state: LocalStoreState): string {
  return JSON.stringify({ coins: state.coins, ownedPartIds: state.ownedPartIds, avatar: encodeAvatarCustomization(state.customization) });
}
export function purchaseLocalPart(state: LocalStoreState, slug: string): LocalStoreState {
  const part = ALL_AVATAR_PARTS.find(p => p.productSlug === slug);
  if (!part) throw new Error('Item unavailable');
  if (part.free || state.ownedPartIds.includes(part.id)) return state;
  const price = part.priceCoins;
  if (price == null || state.coins < price) throw new Error('Not enough test coins. Reset the test to refill.');
  return { ...state, coins: state.coins - price, ownedPartIds: [...state.ownedPartIds, part.id] };
}
