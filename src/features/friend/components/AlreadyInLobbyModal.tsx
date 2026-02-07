import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowRight, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/realtime/socket-client";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { toast } from "sonner";
import { logger } from "@/utils/logger";

interface AlreadyInLobbyModalProps {
  currentLobbyCode: string | null;
  isOpen?: boolean; // Controlled externally if needed
  onClose?: () => void;
}

export function AlreadyInLobbyModal({
  currentLobbyCode,
  isOpen,
  onClose,
}: AlreadyInLobbyModalProps) {
  const router = useRouter();
  const error = useRealtimeMatchStore(state => state.error);
  const lobby = useRealtimeMatchStore(state => state.lobby);
  const clearError = useRealtimeMatchStore(state => state.clearError);
  const resetRealtime = useRealtimeMatchStore(state => state.reset);
  const meta = (error?.meta ?? {}) as {
    lobbyId?: string;
    inviteCode?: string;
    displayName?: string;
    isHost?: boolean;
    status?: string;
  };
  const shouldShow = Boolean(isOpen) || error?.code === "ALREADY_IN_LOBBY";

  useEffect(() => {
    if (!shouldShow) return;
    logger.warn("AlreadyInLobbyModal opened", {
      reason: isOpen ? "controlled_open" : "realtime_error",
      errorCode: error?.code ?? null,
      errorMessage: error?.message ?? null,
      errorMeta: error?.meta ?? null,
      lobbyCodeFromStore: lobby?.inviteCode ?? null,
      lobbyCodeFromError: meta.inviteCode ?? null,
      currentLobbyCode,
    });
  }, [
    shouldShow,
    isOpen,
    error?.code,
    error?.message,
    error?.meta,
    lobby?.inviteCode,
    meta.inviteCode,
    currentLobbyCode,
  ]);

  const handleLeaveAndRetry = () => {
    getSocket().emit("lobby:leave");
    resetRealtime();
    clearError();
    toast.info("Left previous lobby. Try joining again.");
    if (onClose) onClose();
  };

  const handleGoToRoom = () => {
    // If we have lobby state, use it. Otherwise rely on passed props or error metadata if available.
    const code = lobby?.inviteCode || meta.inviteCode || currentLobbyCode;
    
    if (code) {
      router.push(`/friend/room/${code}`);
      clearError();
       if (onClose) onClose();
    } else {
        // Fallback if we somehow don't have the code
        handleLeaveAndRetry();
    }
  };

  return (
    <Dialog open={shouldShow} onOpenChange={(open) => {
        if (!open) {
            logger.info("AlreadyInLobbyModal closed", {
              errorCode: error?.code ?? null,
              lobbyCodeFromStore: lobby?.inviteCode ?? null,
              currentLobbyCode,
            });
            clearError();
            if (onClose) onClose();
        }
    }}>
      <DialogContent className="sm:max-w-md border-border/50 shadow-2xl p-6 bg-card/95 backdrop-blur-xl">
        <div className="flex flex-col items-center text-center space-y-4 pt-2">
            <div className="size-16 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 mb-2">
                <AlertCircle className="size-8" />
            </div>
            
            <DialogHeader className="space-y-2">
                <DialogTitle className="text-xl font-bold text-center">You&apos;re already in a room</DialogTitle>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                   You are currently sitting in{" "}
                   <span className="font-semibold text-foreground">
                     {lobby?.displayName || meta.displayName || "your current lobby"}
                   </span>{" "}
                   (<span className="font-mono font-bold text-foreground">{lobby?.inviteCode || meta.inviteCode || currentLobbyCode || "..."}</span>).
                   You need to leave it before joining a new one.
                </p>
            </DialogHeader>

            <div className="grid grid-cols-1 w-full gap-3 pt-4">
                <Button 
                    size="lg" 
                    className="w-full font-bold h-12 shadow-lg shadow-primary/20"
                    onClick={handleGoToRoom}
                >
                    Go to Room <ArrowRight className="size-4 ml-2" />
                </Button>
                
                <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full h-12 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30"
                    onClick={handleLeaveAndRetry}
                >
                    <LogOut className="size-4 mr-2" /> Leave & Join New
                </Button>
            </div>
            
            <button 
                className="text-xs text-muted-foreground hover:text-foreground mt-2"
                onClick={() => {
                    clearError();
                    if (onClose) onClose();
                }}
            >
                Cancel
            </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
