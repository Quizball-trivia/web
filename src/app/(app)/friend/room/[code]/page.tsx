"use client";

import { FriendLobbyScreen } from "@/features/friend/components/FriendLobbyScreen";
import { useSearchParams, useParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";

export default function FriendRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { t } = useLocale();

  const code = params?.code as string;
  const isHost = searchParams?.get("isHost") === "true";

  if (!code) return <div>{t('inviteCode.invalid')}</div>;

  return (
    <FriendLobbyScreen 
        roomCode={code}
        isHost={isHost}
    />
  );
}
