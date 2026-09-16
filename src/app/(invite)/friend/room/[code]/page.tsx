import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FriendInviteEntry } from '@/features/friend/components/FriendInviteEntry';
import { normalizeFriendInviteCode } from '@/lib/friend/inviteCode';
import { inviteEnvironment, inviteWebOrigin } from '@/lib/friend/mobileInvite';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code: raw } = await params;
  const code = raw.toLowerCase() === 'new' ? null : normalizeFriendInviteCode(raw);
  return {
    title: 'Join your friend on Quizball',
    description: 'Open your Quizball invitation in the app or play in your browser.',
    robots: { index: false, follow: false },
    ...(code && inviteEnvironment() === 'production' ? { itunes: { appId: '6810230727', appArgument: `${inviteWebOrigin()}/friend/room/${code}` } } : {}),
  };
}

export default function FriendRoomPage() {
  return <Suspense><FriendInviteEntry /></Suspense>;
}
