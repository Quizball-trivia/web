import { AvatarDisplay } from "@/components/AvatarDisplay";
import { DEFAULT_AVATAR_PRIMARY, DEFAULT_AVATAR_SECONDARY } from "@/lib/avatars";
import type { HeadToHeadSummary } from "@/lib/domain";
import type { LobbyMember } from "@/lib/realtime/socket.types";
import { copyToClipboard } from "@/utils/clipboard";
import { Copy } from "lucide-react";
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

  const poppins = "'Poppins', sans-serif";

  return (
    <div className="mx-5 rounded-[20px] bg-surface-card/40 p-5">
      <div className="flex flex-col gap-6">
        <div className="flex flex-row items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1
              className="uppercase text-white"
              style={{ fontFamily: poppins, fontWeight: 600, fontSize: 'clamp(18px, 2.2vw, 24px)', lineHeight: 1.05 }}
            >
              {lobbyName || "Friendly Lobby"}
            </h1>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span
                className="uppercase text-white/55"
                style={{ fontFamily: poppins, fontWeight: 600, fontSize: 11, letterSpacing: '0.08em' }}
              >
                Code
              </span>
              <span
                className="select-all rounded-[10px] bg-surface-deep px-2.5 py-1 font-mono uppercase tracking-wider text-white"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, fontWeight: 600 }}
              >
                {lobbyCode || "..."}
              </span>
              <button
                onClick={copyCode}
                aria-label="Copy lobby code"
                className="text-white/55 transition-colors hover:text-brand-cyan"
                disabled={!lobbyCode}
              >
                <Copy className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="text-right">
              <div
                className="uppercase text-white/45"
                style={{ fontFamily: poppins, fontWeight: 600, fontSize: 10, letterSpacing: '0.18em' }}
              >
                Lobby Size
              </div>
              <div
                className="mt-1 text-white tabular-nums"
                style={{ fontFamily: poppins, fontWeight: 600, fontSize: 22, lineHeight: 1 }}
              >
                {roster.length}
                <span className="ml-1 text-sm text-white/45">/ 6</span>
              </div>
            </div>

            {showHeadToHead ? (
              <div className="text-right">
                <div
                  className="uppercase text-white/45"
                  style={{ fontFamily: poppins, fontWeight: 600, fontSize: 10, letterSpacing: '0.18em' }}
                >
                  Head To Head
                </div>
                <div className="mt-1 flex items-center justify-end gap-2">
                  <span
                    className="text-brand-cyan tabular-nums"
                    style={{ fontFamily: poppins, fontWeight: 600, fontSize: 16 }}
                  >
                    {h2hSummary?.winsA ?? 0}
                  </span>
                  <span className="text-[10px] text-white/45">-</span>
                  <span
                    className="text-brand-red-soft tabular-nums"
                    style={{ fontFamily: poppins, fontWeight: 600, fontSize: 16 }}
                  >
                    {h2hSummary?.winsB ?? 0}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {roster.map((member) => {
            const isMe = member.userId === me?.userId;
            const avatarBase =
              member.avatarUrl ?? (isMe ? DEFAULT_AVATAR_PRIMARY : DEFAULT_AVATAR_SECONDARY);

            return (
              <div
                key={member.userId}
                className="flex flex-col items-start"
              >
                <div className="flex w-16 flex-col items-center">
                  <div className="relative mb-2">
                    <AvatarDisplay
                      customization={member.avatarCustomization ?? { base: avatarBase }}
                      size="md"
                      className="rounded-full"
                    />
                    {member.isHost ? (
                      <span
                        className="absolute -top-2 -right-2 rounded-full bg-brand-orange px-1.5 py-[2px] uppercase text-white"
                        style={{ fontFamily: poppins, fontWeight: 600, fontSize: 8, letterSpacing: '0.06em' }}
                      >
                        Host
                      </span>
                    ) : null}
                  </div>

                  <div
                    className="truncate text-white text-center max-w-full"
                    style={{ fontFamily: poppins, fontWeight: 600, fontSize: 14 }}
                  >
                    {member.username}
                  </div>
                  <div
                    className="mt-0.5 uppercase text-white/45 text-center"
                    style={{ fontFamily: poppins, fontWeight: 600, fontSize: 10, letterSpacing: '0.16em' }}
                  >
                    {isMe ? "You" : member.isReady ? "Ready" : "Waiting"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
