"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { X } from "lucide-react";
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

  const Body = (
    <div className="relative font-fun">
      {/* Close button */}
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        aria-label="Close"
        className="absolute -top-2 -right-6 z-20 flex size-9 items-center justify-center rounded-lg bg-[#FB3101] text-white transition-colors hover:bg-[#E02B00]"
      >
        <X className="size-5" strokeWidth={3} />
      </button>

      {/* Title */}
      <h2
        className="font-poppins mt-12 text-center uppercase text-white whitespace-nowrap leading-none"
        style={{ fontSize: "clamp(26px, 4.2vw, 44px)" }}
      >
        Play with <span className="text-[#FFE500]">a Friend</span>
      </h2>

      {/* Aligned content column — all rows share the same width */}
      <div className="mx-auto mt-6 w-full max-w-[430px] md:mt-8">
        {/* Description + icon */}
        <div className="flex items-center justify-between gap-4">
          <p className="flex-1 text-sm leading-snug font-bold text-white/80 md:text-base">
            Create a private room to host a match, or enter a code to join a friend&apos;s lobby.
          </p>
          <Image
            src="/assets/friendly_match-icon.webp"
            alt=""
            width={140}
            height={140}
            className="h-24 w-24 shrink-0 object-contain md:h-28 md:w-28"
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </div>

        {/* Create Room */}
        <button
          type="button"
          onClick={handleCreateRoom}
          className="font-poppins mt-6 flex h-16 w-full items-center justify-center gap-4 rounded-2xl bg-black uppercase leading-none text-white transition-all hover:bg-black/90 active:translate-y-[2px] md:h-20"
          style={{ fontSize: "clamp(20px, 2.6vw, 28px)" }}
        >
          <span
            aria-hidden
            className="font-poppins text-[#FFE500] leading-none"
            style={{ fontSize: "clamp(36px, 4.5vw, 52px)" }}
          >
            +
          </span>
          Create New Room
        </button>

        {/* Or Join */}
        <div className="mt-5 text-center text-[11px] font-black uppercase tracking-wider text-white/70 md:text-xs">
          Or Join
        </div>

        {/* Room code + Join — 2:1 ratio via grid */}
        <div className="mt-3 grid w-full grid-cols-3 gap-3">
          <input
            placeholder="Room Code"
            className="col-span-2 h-14 rounded-2xl bg-[#4058FF] px-5 text-center text-base font-black uppercase tracking-[0.15em] text-white placeholder:text-white/60 transition-all focus:ring-2 focus:ring-white/40 focus:outline-none md:h-16 md:text-lg"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={8}
          />
          <button
            type="button"
            disabled={!roomCode.trim() || isJoining}
            onClick={handleJoinRoom}
            className={cn(
              "col-span-1 h-14 rounded-2xl text-base font-black uppercase tracking-wide text-white transition-all md:h-16 md:text-lg",
              roomCode.trim()
                ? "bg-[#4058FF] hover:bg-[#3348E5] active:translate-y-[2px]"
                : "bg-[#4058FF]/60 opacity-60 cursor-not-allowed"
            )}
          >
            Join
          </button>
        </div>

        {/* Browse Public */}
        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            router.push("/play/friend?tab=browse");
          }}
          className="mt-3 h-14 w-full rounded-2xl bg-[#4058FF] text-sm font-black uppercase tracking-wide text-white transition-all hover:bg-[#3348E5] active:translate-y-[2px] md:h-16 md:text-lg"
        >
          Browse Public Lobbies
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-0 px-6 pt-6 pb-8 [&>button]:hidden"
          style={{ backgroundColor: "#1645FF" }}
        >
          <SheetTitle className="sr-only">Play with a Friend</SheetTitle>
          <SheetDescription className="sr-only">
            Create a room or join an existing room with an invite code.
          </SheetDescription>
          {Body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[560px] max-h-[95vh] rounded-[20px] border-0 px-10 pt-4 pb-8 sm:max-w-[560px] [&>button]:hidden"
        style={{ backgroundColor: "#1645FF" }}
      >
        <DialogTitle className="sr-only">Play with a Friend</DialogTitle>
        <DialogDescription className="sr-only">
          Create a room or join an existing room with an invite code.
        </DialogDescription>
        {Body}
      </DialogContent>
    </Dialog>
  );
}
