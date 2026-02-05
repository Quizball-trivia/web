"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LobbyBrowsePanel } from "./components/LobbyBrowsePanel";
import { CreateJoinPanel } from "./components/CreateJoinPanel";
import { AlreadyInLobbyModal } from "./components/AlreadyInLobbyModal";
import { useRealtimeConnection } from "@/lib/realtime/useRealtimeConnection";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuthStore } from "@/stores/auth.store";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import { toast } from "sonner";

export function FriendMatchHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'create' ? 'create' : 'browse';
  
  const { player } = usePlayer();
  const authUser = useAuthStore((state) => state.user);
  const selfUserId = authUser?.id ?? player.id;
  
  // Realtime connection
  useRealtimeConnection({ enabled: true, selfUserId });
  
  const lobby = useRealtimeMatchStore(state => state.lobby);
  const error = useRealtimeMatchStore(state => state.error);
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isJoiningCode, setIsJoiningCode] = useState<string | null>(null);
  const [isNavigatingToRoom, setIsNavigatingToRoom] = useState(false);

  // Navigate to lobby when lobby state is received (successful join/create), 
  // BUT only if we explicitly initiated navigation.
  useEffect(() => {
    if (lobby?.inviteCode && isNavigatingToRoom) {
      router.push(`/friend/room/${lobby.inviteCode}`);
      // Reset navigation state after push
      return; 
    }
    
    // Safety fallback: if we are verifying "Already In Lobby", we don't redirect.
  }, [lobby, router, isNavigatingToRoom]);

  const handleJoinPublic = (inviteCode: string) => {
    setIsNavigatingToRoom(true);
    setIsJoiningCode(inviteCode);
    
    // Lazy import or use hook to get socket
    import("@/lib/realtime/socket-client").then(({ getSocket }) => {
        getSocket().emit("lobby:join_by_code", { inviteCode });
        toast.info(`Joining ${inviteCode}...`);
    });
  };

  // Clear joining state if error occurs
  useEffect(() => {
    if (error) {
      setIsJoiningCode(null);
      setIsNavigatingToRoom(false);
    }
  }, [error]);

  return (
    <div className="container mx-auto max-w-5xl py-6 animate-in fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
         <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
               <Button variant="ghost" size="sm" className="h-6 px-1.5 -ml-2 text-muted-foreground" onClick={() => router.back()}>
                  <ArrowLeft className="size-4 mr-1" /> Back
               </Button>
            </div>
            <h1 className="text-3xl font-black tracking-tight">Friend Match</h1>
            <p className="text-muted-foreground">Jump into an open room or start your own.</p>
         </div>

         {/* Gamified Stat/Decor (Optional) */}
         <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-card border border-border rounded-full shadow-sm text-sm font-medium">
            <Users className="size-4 text-green-500" />
            <span>24 players online</span>
         </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
         <TabsList className="grid w-full grid-cols-2 max-w-sm">
            <TabsTrigger value="browse">Browse Rooms</TabsTrigger>
            <TabsTrigger value="create">Create / Join</TabsTrigger>
         </TabsList>

         <TabsContent value="browse" className="min-h-[400px]">
            <LobbyBrowsePanel 
               onJoin={handleJoinPublic}
               isJoiningCode={isJoiningCode}
               onActionTriggered={() => setIsNavigatingToRoom(true)}
            />
         </TabsContent>

         <TabsContent value="create">
            <CreateJoinPanel onActionTriggered={() => setIsNavigatingToRoom(true)} />
         </TabsContent>
      </Tabs>

      {/* Error Modal */}
      <AlreadyInLobbyModal 
         currentLobbyCode={lobby?.inviteCode ?? null}
         currentLobbyId={lobby?.lobbyId ?? null}
      />
    </div>
  );
}
