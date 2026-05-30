"use client";

import { FriendLobbyScreen } from "@/features/friend/components/FriendLobbyScreen";
import { useSearchParams, useParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";

export default function FriendRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { t } = useLocale();

  // Strip zero-width/invisible characters and whitespace that social apps
  // (Facebook/Instagram) inject into shared links, then keep only valid
  // room-code characters so a copy-pasted invite still resolves instead of 404ing.
  // useParams() returns the already-decoded segment, so we sanitize directly.
  const code = ((params?.code as string) ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const isHost = searchParams?.get("isHost") === "true";

  if (!code) return <div>{t('inviteCode.invalid')}</div>;

  return (
    <FriendLobbyScreen 
        roomCode={code}
        isHost={isHost}
    />
  );
}
