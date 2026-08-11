"use client";

import { FriendLobbyScreen } from "@/features/friend/components/FriendLobbyScreen";
import { useParams, useSearchParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { extractFriendInviteCode } from "@/lib/friend/inviteCode";
import { parseFriendLobbyInviteSource } from "@/features/friend/hooks/useFriendLobbyLogic";

export default function FriendRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { t } = useLocale();

  const rawCode = ((params?.code as string) ?? "").trim();
  const isNewRoomRoute = rawCode.toLowerCase() === "new";
  const code = isNewRoomRoute ? "new" : extractFriendInviteCode(rawCode);
  const isHost = isNewRoomRoute;
  const inviteSource = parseFriendLobbyInviteSource(searchParams.get("source"));

  if (!code) return <div>{t('inviteCode.invalid')}</div>;

  return (
    <FriendLobbyScreen 
        roomCode={code}
        isHost={isHost}
        inviteSource={inviteSource}
    />
  );
}
