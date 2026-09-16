import { normalizeFriendInviteCode } from './inviteCode';

export function inviteEnvironment() {
  return process.env.NEXT_PUBLIC_API_URL === 'https://api.quizball.io' ? 'production' : 'staging';
}

export function inviteWebOrigin() {
  return inviteEnvironment() === 'production' ? 'https://quizball.io' : 'https://staging.quizball.io';
}

export function mobileInviteUrl(rawCode: string) {
  const code = normalizeFriendInviteCode(rawCode);
  return code && code !== 'NEW' ? `quizball:///friend/room/${code}?environment=${inviteEnvironment()}` : null;
}

export const QUIZBALL_APP_STORE_URL = 'https://apps.apple.com/app/id6810230727';
