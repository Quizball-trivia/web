import { AvatarDisplay } from "@/components/AvatarDisplay";
import { DEFAULT_AVATAR_PRIMARY, DEFAULT_AVATAR_SECONDARY } from "@/lib/avatars";
import type { HeadToHeadSummary } from "@/lib/domain";
import type { LobbyMember } from "@/lib/realtime/socket.types";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/utils/clipboard";
import { Copy, Users } from "lucide-react";
import { toast } from "sonner";

interface LobbyHeaderProps {
  lobbyName?: string | null;
  lobbyCode: string | null;
  me?: LobbyMember;
  members: LobbyMember[];
  h2hSummary: HeadToHeadSummary | null;
}

export function LobbyHeader({
  lobbyName,
  lobbyCode,
  me,
  members,
  h2hSummary,
}: LobbyHeaderProps) {
  const copyCode = async () => {
    if (!lobbyCode) return;
    const success = await copyToClipboard(lobbyCode);
    if (success) toast.success("Room Code copied!");
  };

  const roster = members.length > 0 ? members : me ? [me] : [];
  const opponents = roster.filter((member) => member.userId !== me?.userId);
  const showHeadToHead = Boolean(h2hSummary && opponents.length === 1 && h2hSummary.total > 0);

  return (
    <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] p-5 font-fun">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-xl border-2 border-[#1CB0F6]/30 bg-[#1CB0F6]/15">
              <Users className="size-7 text-[#1CB0F6]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">{lobbyName || "Friendly Lobby"}</h1>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-xs font-bold text-[#56707A]">Code:</span>
                <span className="select-all rounded-lg border-b-2 border-[#0D1B21] bg-[#131F24] px-2.5 py-1 font-mono text-sm font-black tracking-wider text-white">
                  {lobbyCode || "..."}
                </span>
                <button
                  onClick={copyCode}
                  aria-label="Copy lobby code"
                  className="text-[#56707A] transition-colors hover:text-[#1CB0F6]"
                  disabled={!lobbyCode}
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#131F24] px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#56707A]">
                Lobby Size
              </div>
              <div className="mt-1 text-2xl font-black text-white tabular-nums">
                {roster.length}
                <span className="ml-1 text-sm text-[#56707A]">/ 6</span>
              </div>
            </div>

            {showHeadToHead ? (
              <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#131F24] px-4 py-3 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#56707A]">
                  Head To Head
                </div>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span className="text-base font-black text-[#1CB0F6] tabular-nums">
                    {h2hSummary?.winsA ?? 0}
                  </span>
                  <span className="text-[10px] font-black text-[#56707A]">-</span>
                  <span className="text-base font-black text-[#FF4B4B] tabular-nums">
                    {h2hSummary?.winsB ?? 0}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {roster.map((member) => {
            const isMe = member.userId === me?.userId;
            const avatarBase =
              member.avatarUrl ?? (isMe ? DEFAULT_AVATAR_PRIMARY : DEFAULT_AVATAR_SECONDARY);

            return (
              <div
                key={member.userId}
                className={cn(
                  "rounded-2xl border-b-4 bg-[#131F24] px-3 py-4 text-center",
                  isMe ? "border-[#1899D6] ring-2 ring-[#1CB0F6]/20" : "border-[#0D1B21]"
                )}
              >
                <div className="relative mx-auto mb-2 w-fit">
                  <div
                    className={cn(
                      "overflow-hidden rounded-full border-[3px] border-b-4",
                      member.isReady
                        ? "border-[#58CC02] shadow-[0_3px_0_0_#46A302]"
                        : isMe
                          ? "border-[#1CB0F6] shadow-[0_3px_0_0_#1899D6]"
                          : "border-[#FF4B4B] shadow-[0_3px_0_0_#E04242]"
                    )}
                  >
                    <AvatarDisplay
                      customization={{ base: avatarBase }}
                      size="md"
                      className="rounded-full"
                    />
                  </div>
                  {member.isHost ? (
                    <span className="absolute -top-2 -right-2 rounded-full border-b-2 border-[#DB8200] bg-[#FF9600] px-1.5 py-[2px] text-[8px] font-black uppercase text-white">
                      Host
                    </span>
                  ) : null}
                </div>

                <div className="truncate text-sm font-black text-white">{member.username}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#56707A]">
                  {isMe ? "You" : member.isReady ? "Ready" : "Waiting"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
