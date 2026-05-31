import { describe, expect, it, beforeEach } from 'vitest';
import {
  buildFriendInvitePath,
  buildFriendInviteUrl,
  consumePostAuthRedirect,
  getPostAuthEntryRoute,
  normalizePostAuthRedirect,
  peekPostAuthRedirect,
  rememberPostAuthRedirect,
} from '../postAuthRedirect';
import { STORAGE_KEYS } from '@/utils/storage';
import type { User } from '@/lib/types';

const completeUser = { onboarding_complete: true } as User;
const incompleteUser = { onboarding_complete: false } as User;

describe('post-auth redirect helpers', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEYS.POST_AUTH_REDIRECT);
  });

  it('normalizes friend room invite paths only', () => {
    expect(normalizePostAuthRedirect('/friend/room/abc123')).toBe('/friend/room/ABC123');
    expect(normalizePostAuthRedirect('/friend/room/ABC123/')).toBe('/friend/room/ABC123');
    expect(normalizePostAuthRedirect('/play')).toBeNull();
    expect(normalizePostAuthRedirect('https://evil.test/friend/room/ABC123')).toBeNull();
    expect(normalizePostAuthRedirect('/friend/room/a')).toBeNull();
  });

  it('builds friend invite paths and absolute urls', () => {
    expect(buildFriendInvitePath('abc123')).toBe('/friend/room/ABC123');
    expect(buildFriendInviteUrl('abc123', 'https://quizball.test')).toBe('https://quizball.test/friend/room/ABC123');
  });

  it('remembers and consumes a pending friend room redirect once', () => {
    rememberPostAuthRedirect('/friend/room/abc123');

    expect(peekPostAuthRedirect()).toBe('/friend/room/ABC123');
    expect(consumePostAuthRedirect()).toBe('/friend/room/ABC123');
    expect(consumePostAuthRedirect()).toBeNull();
  });

  it('routes incomplete users to onboarding and complete users to pending invite', () => {
    rememberPostAuthRedirect('/friend/room/abc123');

    expect(getPostAuthEntryRoute(incompleteUser)).toBe('/onboarding');
    expect(getPostAuthEntryRoute(completeUser)).toBe('/friend/room/ABC123');
    expect(getPostAuthEntryRoute(completeUser)).toBe('/play');
  });
});
