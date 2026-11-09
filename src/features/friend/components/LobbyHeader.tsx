import { AvatarDisplay } from "@/components/AvatarDisplay";
import { DEFAULT_AVATAR_PRIMARY, DEFAULT_AVATAR_SECONDARY } from "@/lib/avatars";
import type { HeadToHeadSummary } from "@/lib/domain";
import type { LobbyMember } from "@/lib/realtime/socket.types";
import { cn } from "@/lib/utils";
import { Check, Copy, Link2, Plus, Share2 } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { useRoomInvite } from "../hooks/useRoomInvite";

interface LobbyHeaderProps {
  lobbyName?: string | null;
  lobbyCode: string | null;
  lobbyId?: string | null;
  me?: LobbyMember;
  members: LobbyMember[];
  h2hSummary: HeadToHeadSummary | null;
  /** Max players for the current mode (classic 2, party quiz 6, ranked sim 2). */
  maxMembers: number;
}

const poppins = "'Poppins', sans-serif";

/** Open seats drawn after the members: enough to read "there's room", never a wall of placeholders. */
const MAX_OPEN_SEATS_SHOWN = 5;

export function LobbyHeader({
  lobbyName,
  lobbyCode,
  lobbyId,
  me,
  members,
  h2hSummary,
  maxMembers,
}: LobbyHeaderProps) {
  const { t } = useLocale();
  const invite = useRoomInvite(lobbyCode, lobbyId);

  const roster = members.length > 0 ? members : me ? [me] : [];
  const opponents = roster.filter((member) => member.userId !== me?.userId);
  const showHeadToHead = Boolean(h2hSummary && opponents.length === 1 && h2hSummary.total > 0);
  const openSeats = Math.min(Math.max(maxMembers - roster.length, 0), MAX_OPEN_SEATS_SHOWN);
  const roomIsFull = roster.length >= maxMembers;

  return (
    <div className="rounded-[20px] bg-surface-card/40 p-4 sm:p-5">
      <div className="flex flex-col gap-5">
        <div className="flex flex-row items-start justify-between gap-4">
          <h1
            className="min-w-0 flex-1 uppercase text-white"
            style={{ fontFamily: poppins, fontWeight: 600, fontSize: 'clamp(18px, 2.2vw, 24px)', lineHeight: 1.1 }}
          >
            {lobbyName || t("friend.friendlyLobby")}
          </h1>

          <div className="flex shrink-0 items-start gap-5">
            {showHeadToHead ? (
              <div className="text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
                  {t("friend.headToHead")}
                </div>
                <div className="mt-1 flex items-center justify-end gap-2 text-base font-semibold tabular-nums">
                  <span className="text-brand-cyan">{h2hSummary?.winsA ?? 0}</span>
                  <span className="text-xs text-white/45">-</span>
                  <span className="text-brand-red-soft">{h2hSummary?.winsB ?? 0}</span>
                </div>
              </div>
            ) : null}
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
                {t("friend.lobbySize")}
              </div>
              <div className="mt-1 text-white tabular-nums" style={{ fontFamily: poppins, fontWeight: 600, fontSize: 22, lineHeight: 1 }}>
                {roster.length}
                <span className="ml-1 text-sm text-white/45">/ {maxMembers}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Invite: the room is useless until a friend is in it, so the way to bring one is the first thing here. */}
        <section
          aria-label={t("friend.inviteTitle")}
          className={cn(
            "flex flex-col gap-4 rounded-[16px] border p-4 lg:flex-row lg:items-center",
            roomIsFull ? "border-white/10 bg-surface-deep/50" : "border-brand-yellow/30 bg-brand-yellow/[0.06]",
          )}
        >
          <div className="min-w-0 flex-1 space-y-3">
            {!roomIsFull && (
              <div>
                <h2 className="text-[15px] font-semibold text-white">{t("friend.inviteTitle")}</h2>
                <p className="mt-0.5 text-[13px] leading-snug text-white/65">{t("friend.inviteHint")}</p>
              </div>
            )}
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-[10px] bg-surface-deep py-1 pl-3 pr-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50">{t("appShell.code")}</span>
                <span className="ml-1.5 select-all font-mono text-lg font-bold uppercase tracking-[0.12em] text-white">
                  {lobbyCode || "······"}
                </span>
                <button
                  type="button"
                  onClick={() => void invite.copyCode()}
                  disabled={!lobbyCode}
                  aria-label={t("friend.copyLobbyCode")}
                  title={t("friend.copyLobbyCode")}
                  className="flex size-8 items-center justify-center rounded-[8px] text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  <Copy className="size-4" />
                </button>
              </div>
              <div
                className="flex h-10 min-w-0 flex-1 basis-48 items-center gap-2 rounded-[10px] bg-surface-deep px-3"
                title={invite.inviteUrl ?? undefined}
              >
                <Link2 className="size-4 shrink-0 text-white/40" aria-hidden />
                <span className="min-w-0 truncate select-all font-mono text-[13px] text-white/80">
                  {invite.displayUrl || "…"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => void invite.copyLink()}
              disabled={!invite.inviteUrl}
              aria-label={t("friend.copyInviteLink")}
              className={cn(
                "flex h-11 flex-1 items-center justify-center gap-2 rounded-[12px] px-4 text-sm font-semibold transition-colors disabled:opacity-40 lg:flex-none",
                roomIsFull
                  ? "border border-white/15 text-white hover:bg-white/[0.06]"
                  : "bg-brand-yellow text-black hover:bg-brand-yellow/90",
              )}
            >
              <Copy className="size-4" />
              {t("friend.copyLink")}
            </button>
            {invite.canShare && (
              <button
                type="button"
                onClick={() => void invite.share()}
                disabled={!invite.inviteUrl}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[12px] border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/[0.06] disabled:opacity-40 lg:flex-none"
              >
                <Share2 className="size-4" />
                {t("friend.share")}
              </button>
            )}
          </div>
        </section>

        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {roster.map((member) => {
            const isMe = member.userId === me?.userId;
            const avatarBase =
              member.avatarUrl ?? (isMe ? DEFAULT_AVATAR_PRIMARY : DEFAULT_AVATAR_SECONDARY);

            return (
              <li key={member.userId} className="flex min-w-0 flex-col items-center">
                <div className="relative mb-2">
                  <AvatarDisplay
                    customization={member.avatarCustomization ?? { base: avatarBase }}
                    size="md"
                    className="rounded-full"
                  />
                  {member.isReady ? (
                    <span
                      aria-label={t("friend.ready")}
                      title={t("friend.ready")}
                      className="absolute -top-2 left-1/2 z-20 flex size-7 -translate-x-1/2 items-center justify-center rounded-full border-2 border-surface-card bg-brand-green text-white shadow-[0_4px_12px_rgba(88,204,2,0.45)]"
                    >
                      <Check className="size-4" strokeWidth={3.5} />
                    </span>
                  ) : null}
                  {member.isHost ? (
                    <span className="absolute -top-2 -right-3 rounded-full bg-brand-orange px-1.5 py-[2px] text-[9px] font-semibold uppercase tracking-[0.06em] text-white">
                      {t("friend.host")}
                    </span>
                  ) : null}
                </div>

                <div className="max-w-full truncate text-center text-sm font-semibold text-white">
                  {member.username}
                </div>
                {member.isGuest && (
                  <div className="mt-0.5 rounded-full bg-white/10 px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-[0.08em] text-white/60">
                    {t("friend.guestBadge")}
                  </div>
                )}
                <div
                  className={cn(
                    "mt-0.5 text-center text-[11px] font-semibold uppercase tracking-[0.1em]",
                    member.isReady ? "text-brand-green-light" : "text-white/50",
                  )}
                >
                  {isMe ? t("friend.you") : member.isReady ? t("friend.ready") : t("friend.waiting")}
                </div>
              </li>
            );
          })}

          {Array.from({ length: openSeats }, (_, index) => (
            <li key={`open-${index}`} className="flex min-w-0 flex-col items-center">
              <button
                type="button"
                onClick={() => void (invite.canShare ? invite.share() : invite.copyLink())}
                disabled={!invite.inviteUrl}
                aria-label={t("friend.inviteToSeat")}
                title={t("friend.inviteToSeat")}
                className="mb-2 flex size-12 items-center justify-center rounded-full border-2 border-dashed border-white/25 text-white/50 transition-colors hover:border-brand-yellow hover:text-brand-yellow disabled:opacity-40"
              >
                <Plus className="size-5" />
              </button>
              <div className="max-w-full text-center text-[13px] font-medium leading-tight text-white/45 [overflow-wrap:anywhere]">
                {t("friend.openSeat")}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
