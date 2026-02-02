import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Users, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { cn } from "@/components/ui/utils";
import { copyToClipboard } from "@/utils/clipboard";
import { useRealtimeConnection } from "@/lib/realtime/useRealtimeConnection";
import { getSocket } from "@/lib/realtime/socket-client";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuthStore } from "@/stores/auth.store";
import { useGameSessionStore } from "@/stores/gameSession.store";
import { logger } from "@/utils/logger";

interface FriendLobbyScreenProps {
  roomCode: string;
  isHost: boolean;
}

export function FriendLobbyScreen({ roomCode, isHost }: FriendLobbyScreenProps) {
  const router = useRouter();
  const { player } = usePlayer();
  const authUser = useAuthStore((state) => state.user);
  const selfUserId = authUser?.id ?? player.id;
  const lobby = useRealtimeMatchStore((state) => state.lobby);
  const draft = useRealtimeMatchStore((state) => state.draft);
  const resetRealtime = useRealtimeMatchStore((state) => state.reset);
  const startSession = useGameSessionStore((state) => state.startSession);

  useRealtimeConnection({ enabled: true, selfUserId });

  const startedRef = useRef(false);
  const createdRef = useRef(false);

  useEffect(() => {
    const socket = getSocket();
    if (isHost && !createdRef.current) {
      createdRef.current = true;
      socket.emit("lobby:create", { mode: "friendly" });
      logger.info("Socket emit lobby:create", { mode: "friendly" });
    }
    if (!isHost && roomCode && !createdRef.current) {
      createdRef.current = true;
      socket.emit("lobby:join_by_code", { inviteCode: roomCode });
      logger.info("Socket emit lobby:join_by_code", {
        inviteCode: `${roomCode.slice(0, 2)}***`,
      });
    }
  }, [isHost, roomCode]);

  useEffect(() => {
    if (!lobby || startedRef.current) return;
    startedRef.current = true;
    startSession({ mode: "quizball", matchType: "friendly", questionCount: 10 });
  }, [lobby, startSession]);

  useEffect(() => {
    if (!draft) return;
    router.push("/game");
  }, [draft, router]);

  const lobbyCode = lobby?.inviteCode ?? (roomCode === "new" ? "" : roomCode);

  const members = lobby?.members ?? [];
  const me = members.find((member) => member.userId === selfUserId);
  const opponent = members.find((member) => member.userId !== selfUserId);

  const copyCode = async () => {
    if (!lobbyCode) return;
    const success = await copyToClipboard(lobbyCode);
    if (success) toast.success("Room Code copied!");
  };

  const handleReadyToggle = () => {
    getSocket().emit("lobby:ready", { ready: !me?.isReady });
    logger.info("Socket emit lobby:ready", { ready: !me?.isReady });
  };

  const displayPlayers = useMemo(() => {
    if (members.length === 2) return members;
    return [
      ...members,
      {
        userId: "waiting",
        username: "Waiting...",
        avatarUrl: null,
        isReady: false,
        isHost: false,
      },
    ];
  }, [members]);

  return (
    <div className="container mx-auto max-w-5xl py-6 animate-in fade-in space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Users className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Friendly Lobby</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Code:
              <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded">
                {lobbyCode || "..."}
              </span>
              <button onClick={copyCode} className="hover:text-primary transition-colors" disabled={!lobbyCode}>
                <Copy className="size-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 flex-1 justify-center md:justify-end">
          {displayPlayers.map((member, idx) => (
            <div key={idx} className={cn("flex flex-col items-center gap-2", member.userId === "waiting" && "opacity-50")}>
              <div className="relative">
                <AvatarDisplay
                  customization={{ base: member.avatarUrl ?? "avatar-2" }}
                  size="md"
                  className={cn("border-2", member.isReady ? "border-green-500" : "border-border")}
                />
                {member.isHost && (
                  <Badge className="absolute -top-2 -right-2 text-[10px] px-1 h-4">HOST</Badge>
                )}
              </div>
              <span className="text-xs font-medium">{member.username}</span>
            </div>
          ))}
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader className="py-4 px-4 border-b border-border">
          <CardTitle>Ready Check</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="text-sm text-muted-foreground">
            When both players are ready, the category draft will begin automatically.
          </div>
          <Button
            size="lg"
            className={cn("w-full h-14 text-lg font-bold", me?.isReady ? "bg-green-600 hover:bg-green-700" : "")}
            onClick={handleReadyToggle}
            disabled={!lobby}
          >
            {me?.isReady ? (
              <>
                <CheckCircle2 className="size-5 mr-2" /> Ready
              </>
            ) : (
              "Mark Ready"
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {opponent ? "Waiting for both players to ready up." : "Waiting for an opponent to join."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
