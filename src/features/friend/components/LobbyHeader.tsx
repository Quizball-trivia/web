import { AvatarDisplay } from "@/components/AvatarDisplay";
import { cn } from "@/lib/utils";
import { DEFAULT_AVATAR_PRIMARY, DEFAULT_AVATAR_SECONDARY } from "@/lib/avatars";
import type { LobbyMember } from "@/lib/realtime/socket.types";
import type { HeadToHeadSummary } from "@/lib/domain";
import { copyToClipboard } from "@/utils/clipboard";
import { Copy, Users } from "lucide-react";
import { toast } from "sonner";

interface LobbyHeaderProps {
  lobbyName?: string | null;
  lobbyCode: string | null;
  me?: LobbyMember;
  opponent?: LobbyMember;
  h2hSummary: HeadToHeadSummary | null;
}

export function LobbyHeader({ lobbyName, lobbyCode, me, opponent, h2hSummary }: LobbyHeaderProps) {
  const copyCode = async () => {
    if (!lobbyCode) return;
    const success = await copyToClipboard(lobbyCode);
    if (success) toast.success("Room Code copied!");
  };

  return (
    <div className="bg-[#1B2F36] rounded-2xl border-b-4 border-[#0D1B21] p-5 font-fun">
      <div className="flex flex-col md:flex-row items-center justify-between gap-5">

        {/* Left: Lobby Name & Code */}
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-xl bg-[#1CB0F6]/15 border-2 border-[#1CB0F6]/30 flex items-center justify-center">
            <Users className="size-7 text-[#1CB0F6]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{lobbyName || "Friendly Lobby"}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-bold text-[#56707A]">Code:</span>
              <span className="font-mono font-black text-sm text-white bg-[#131F24] px-2.5 py-1 rounded-lg border-b-2 border-[#0D1B21] select-all tracking-wider">
                {lobbyCode || "..."}
              </span>
              <button
                onClick={copyCode}
                aria-label="Copy lobby code"
                className="text-[#56707A] hover:text-[#1CB0F6] transition-colors"
                disabled={!lobbyCode}
              >
                <Copy className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Avatars + H2H */}
        <div className="flex items-center gap-5">
          {/* You */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="relative">
              <div className={cn(
                "rounded-full border-[3px] border-b-4 overflow-hidden",
                me?.isReady ? "border-[#58CC02] shadow-[0_3px_0_0_#46A302]" : "border-[#1CB0F6] shadow-[0_3px_0_0_#1899D6]"
              )}>
                <AvatarDisplay
                  customization={{ base: me?.avatarUrl ?? DEFAULT_AVATAR_PRIMARY }}
                  size="md"
                  className="rounded-full"
                />
              </div>
              {me?.isHost && (
                <span className="absolute -top-2 -right-2 text-[8px] font-black bg-[#FF9600] text-white px-1.5 py-[2px] rounded-full border-b-2 border-[#DB8200] uppercase">HOST</span>
              )}
            </div>
            <span className="text-xs font-black text-[#1CB0F6]">
              {me?.username || 'You'} <span className="text-[10px] font-bold text-[#56707A]">(You)</span>
            </span>
            {me?.isReady && <span className="text-[9px] font-black text-[#58CC02] uppercase">Ready</span>}
          </div>

          {/* VS + H2H */}
          <div className="flex flex-col items-center gap-1">
            {h2hSummary && opponent && h2hSummary.total > 0 ? (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base font-black text-[#1CB0F6] tabular-nums">{h2hSummary.winsA}</span>
                <span className="text-[10px] font-black text-[#56707A]">-</span>
                <span className="text-base font-black text-[#FF4B4B] tabular-nums">{h2hSummary.winsB}</span>
              </div>
            ) : null}
            <span className="text-lg font-black text-[#FF4B4B] uppercase">VS</span>
          </div>

          {/* Opponent */}
          <div className={cn("flex flex-col items-center gap-1.5", !opponent && "opacity-40")}>
            <div className="relative">
              {opponent ? (
                <div className={cn(
                  "rounded-full border-[3px] border-b-4 overflow-hidden",
                  opponent.isReady ? "border-[#58CC02] shadow-[0_3px_0_0_#46A302]" : "border-[#FF4B4B] shadow-[0_3px_0_0_#E04242]"
                )}>
                  <AvatarDisplay
                    customization={{ base: opponent.avatarUrl ?? DEFAULT_AVATAR_SECONDARY }}
                    size="md"
                    className="rounded-full"
                  />
                </div>
              ) : (
                <div className="size-10 rounded-full bg-[#243B44] border-2 border-dashed border-[#56707A] flex items-center justify-center">
                  <Users className="size-4 text-[#56707A]" />
                </div>
              )}
            </div>
            <span className="text-xs font-black text-white">
              {opponent?.username || 'Waiting...'}
            </span>
            {opponent?.isReady && <span className="text-[9px] font-black text-[#58CC02] uppercase">Ready</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
