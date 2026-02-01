"use client";

import { FriendLobbyScreen } from "@/features/friend/components/FriendLobbyScreen";
import { useSearchParams, useParams } from "next/navigation";

export default function FriendRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const code = params?.code as string;
  const isHost = searchParams?.get("isHost") === "true";

  if (!code) return <div>Invalid Room Code</div>;

  return (
    <FriendLobbyScreen 
        roomCode={code}
        isHost={isHost}
    />
  );
}
