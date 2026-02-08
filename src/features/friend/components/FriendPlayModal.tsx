"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Users, Plus, LogIn, Globe } from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
    onOpenChange(false);
    router.push("/play/friend?tab=create");
  };

  const handleJoinRoom = () => {
    if (!roomCode.trim()) return;
    setIsJoining(true);

    if (roomCode.length < 3) {
      toast.error("Invalid Room Code");
      setIsJoining(false);
      return;
    }

    onOpenChange(false);
    router.push(`/friend/room/${roomCode.toUpperCase()}`);
  };

  const Content = (
    <div className="space-y-5 font-fun">
      {/* Header Icon */}
      <div className="flex flex-col items-center text-center gap-3">
        <div className="size-20 rounded-full bg-[#1CB0F6] border-4 border-b-[6px] border-[#1899D6] flex items-center justify-center">
          <Users className="size-9 text-white" strokeWidth={2.5} />
        </div>
        <p className="text-sm font-bold text-[#56707A] max-w-xs">
          Create a private room to host a match, or enter a code to join a friend&apos;s lobby.
        </p>
      </div>

      {/* Create Room */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-black text-[#56707A] uppercase tracking-wider">
          <Plus className="size-3.5" /> Create
        </div>
        <button
          onClick={handleCreateRoom}
          className="w-full py-4 rounded-2xl bg-[#1CB0F6] border-b-4 border-[#1899D6] text-base font-black text-white uppercase tracking-wide hover:bg-[#18A0E0] active:translate-y-[2px] active:border-b-2 transition-all"
        >
          Create New Room
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-[3px] flex-1 rounded-full bg-[#1B2F36]" />
        <span className="text-[10px] font-black text-[#56707A] uppercase tracking-wider">Or Join</span>
        <div className="h-[3px] flex-1 rounded-full bg-[#1B2F36]" />
      </div>

      {/* Join Room */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-black text-[#56707A] uppercase tracking-wider">
          <LogIn className="size-3.5" /> Join
        </div>
        <div className="flex gap-2">
          <input
            placeholder="ROOM CODE"
            className="flex-1 h-12 rounded-xl bg-[#1B2F36] border-b-[3px] border-[#0D1B21] text-base font-black text-white text-center uppercase tracking-[0.2em] placeholder:text-[#56707A]/50 placeholder:font-bold placeholder:tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-[#1CB0F6] transition-all font-mono"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={8}
          />
          <button
            disabled={!roomCode.trim() || isJoining}
            onClick={handleJoinRoom}
            className={cn(
              "h-12 px-6 rounded-xl border-b-[3px] text-sm font-black text-white uppercase tracking-wide active:translate-y-[2px] active:border-b-0 transition-all",
              roomCode.trim()
                ? "bg-[#58CC02] border-[#46A302] hover:bg-[#4CB801]"
                : "bg-[#243B44] border-[#1B2F36] opacity-50 pointer-events-none"
            )}
          >
            Join
          </button>
        </div>
      </div>

      {/* Browse Public */}
      <button
        onClick={() => {
          onOpenChange(false);
          router.push("/play/friend?tab=browse");
        }}
        className="w-full py-3.5 rounded-2xl bg-[#1B2F36] border-b-4 border-[#0D1B21] border-dashed text-sm font-black text-[#56707A] uppercase tracking-wide hover:bg-[#243B44] hover:text-white active:translate-y-[2px] active:border-b-2 transition-all flex items-center justify-center gap-2"
      >
        <Globe className="size-4" />
        Browse Public Lobbies
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl border-t border-white/5 bg-[#131F24] px-5 pb-8">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="text-xl font-black text-white font-fun">
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
      <DialogContent className="sm:max-w-md bg-[#131F24] border-[#1B2F36] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-center hidden">Play with a Friend</DialogTitle>
          <DialogDescription className="sr-only">
            Create a room or join an existing room with an invite code.
          </DialogDescription>
          <div className="text-center text-xl font-black text-white font-fun">Play with a Friend</div>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
