"use client";

import { FriendLobbyScreen } from "@/features/friend/components/FriendLobbyScreen";
import { useParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { extractFriendInviteCode } from "@/lib/friend/inviteCode";

export default function FriendRoomPage() {
  const params = useParams();
  const { t } = useLocale();

  const rawCode = ((params?.code as string) ?? "").trim();
  const isNewRoomRoute = rawCode.toLowerCase() === "new";
  const code = isNewRoomRoute ? "new" : extractFriendInviteCode(rawCode);
  const isHost = isNewRoomRoute;

  if (!code) return <div>{t('inviteCode.invalid')}</div>;

  return (
    <FriendLobbyScreen 
        roomCode={code}
        isHost={isHost}
    />
  );
}
