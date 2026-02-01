import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Plus, LogIn } from "lucide-react";
import { useIsMobile } from "@/components/ui/use-mobile";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface FriendPlayModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FriendPlayModal({ isOpen, onOpenChange }: FriendPlayModalProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = () => {
    // In a real app, this might call an API to create a room first.
    // For now, we simulate creating a room by generating a random code or navigating to 'new'
    // functionality to be handled by the /room/[code] page or a middleware.
    // Let's generate a random 6-char code for demo purposes or use 'new' and let the page handle it.
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    onOpenChange(false);
    router.push(`/friend/room/${newCode}?isHost=true`);
  };

  const handleJoinRoom = () => {
    if (!roomCode.trim()) return;
    setIsJoining(true);
    
    // Simulate valid code check
    if (roomCode.length < 3) {
        toast.error("Invalid Room Code");
        setIsJoining(false);
        return;
    }

    onOpenChange(false);
    // Navigate to lobby as guest
    router.push(`/friend/room/${roomCode.toUpperCase()}?isHost=false`);
    setIsJoining(false);
  };

  const Content = (
    <div className="space-y-8 py-4">
       {/* Header Icon */}
       <div className="flex flex-col items-center text-center space-y-2">
          <div className="size-16 rounded-2xl flex items-center justify-center mb-2 border bg-blue-500/10 text-blue-500 border-blue-500/20">
             <Users className="size-8" />
          </div>
          <p className="text-muted-foreground text-sm max-w-xs">
            Create a private room to host a match, or enter a code to join a friend&apos;s lobby.
          </p>
       </div>

       <div className="grid gap-6">
          {/* Create Room */}
          <div className="space-y-2">
             <div className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                 <Plus className="size-3" /> Create
             </div>
             <Button 
                size="lg" 
                className="w-full h-14 text-base font-bold bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/20"
                onClick={handleCreateRoom}
             >
                Create New Room
             </Button>
          </div>

          <div className="relative flex items-center gap-4">
             <div className="h-px bg-border flex-1" />
             <span className="text-xs text-muted-foreground font-medium uppercase">Or Join</span>
             <div className="h-px bg-border flex-1" />
          </div>

          {/* Join Room */}
          <div className="space-y-2">
             <div className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                 <LogIn className="size-3" /> Join
             </div>
             <div className="flex gap-2">
                 <Input 
                    placeholder="Enter Room Code" 
                    className="h-12 text-lg font-mono uppercase tracking-widest text-center"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={8}
                 />
                 <Button 
                    size="lg" 
                    className="h-12 px-6"
                    disabled={!roomCode.trim() || isJoining}
                    onClick={handleJoinRoom}
                 >
                    Join
                 </Button>
             </div>
          </div>
       </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl border-t border-border/50">
          <SheetHeader className="mb-2 text-left">
            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
               Play with a Friend
            </SheetTitle>
          </SheetHeader>
          {Content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/50 shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl text-center font-bold">Play with a Friend</DialogTitle>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
