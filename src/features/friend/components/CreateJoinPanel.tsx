import { useEffect, useRef, useState } from "react";
import { Plus, Lock, Globe, ArrowRight, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { trackFriendInviteAccepted } from "@/lib/analytics/game-events";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useLocale } from "@/contexts/LocaleContext";
import { extractFriendInviteCode } from "@/lib/friend/inviteCode";
import { useLobbyCommandMachine } from "../hooks/useLobbyCommandMachine";

interface CreateJoinPanelProps {
  onActionTriggered?: () => void;
}

const poppinsFont = "'Poppins', sans-serif";

const cardSurfaceStyle = {
  background: 'linear-gradient(180deg, #1645FF 35%, #1a35a1 100%)',
  border: '3px solid #1a35a1',
} as const;

export function CreateJoinPanel({ onActionTriggered }: CreateJoinPanelProps) {
  const { t } = useLocale();
  const [inviteCode, setInviteCode] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const lobbyCommands = useLobbyCommandMachine();
  const { createLobby, joinByCode, reset } = lobbyCommands;
  const lobby = useRealtimeMatchStore((state) => state.lobby);

  // On a fast connection the socket ACK resolves in a few ms, so the real
  // isCreating/isJoining flags flip on and off before the user can perceive it.
  // Hold a local pressed state for a minimum window so the spinner is always
  // visible (optimistic feedback).
  const [createPressed, setCreatePressed] = useState(false);
  const [joinPressed, setJoinPressed] = useState(false);
  const createTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const joinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCreating = lobbyCommands.isCreating || createPressed;
  const isJoining = lobbyCommands.isJoining || joinPressed;

  useEffect(() => () => {
    if (createTimerRef.current) clearTimeout(createTimerRef.current);
    if (joinTimerRef.current) clearTimeout(joinTimerRef.current);
  }, []);

  const handleCreate = () => {
    if (lobbyCommands.isBusy || createPressed) return;
    if (onActionTriggered) onActionTriggered();
    setCreatePressed(true);
    createTimerRef.current = setTimeout(() => setCreatePressed(false), 600);
    toast.info(t("friend.creatingRoom"));
    void createLobby({ mode: "friendly", isPublic }).then((result) => {
      if (!result || result.ok) return;
      toast.error(result.message);
    });
  };

  const handleJoin = () => {
    if (lobbyCommands.isBusy || joinPressed) return;
    const code = extractFriendInviteCode(inviteCode);
    if (!code) {
      toast.error(t("friend.enterValidCode"));
      return;
    }

    if (onActionTriggered) onActionTriggered();
    setJoinPressed(true);
    joinTimerRef.current = setTimeout(() => setJoinPressed(false), 600);
    try {
      trackFriendInviteAccepted(code);
    } catch (error) {
      console.error('Analytics trackFriendInviteAccepted failed', error);
    }
    toast.info(t("friend.joiningCode", { code }));
    void joinByCode(code).then((result) => {
      if (!result || result.ok) return;
      toast.error(result.message);
    });
  };

  useEffect(() => {
    if (!lobby) return;
    reset();
  }, [lobby?.lobbyId, lobby?.inviteCode, lobby, reset]);

  return (
    <div className="grid items-stretch gap-6 md:grid-cols-2 max-w-4xl">
      <div
        className="relative flex h-full flex-col overflow-hidden rounded-[20px] p-6 sm:p-7"
        style={cardSurfaceStyle}
      >
        <div className="flex h-full flex-col space-y-6">
          <div className="flex flex-col gap-3">
            {/* The title reserves ~2 lines of height even when it's 1 line, so
                the subtitle below starts at the same Y across both cards. */}
            <h3
              className="flex min-h-[2.1em] items-start text-white uppercase"
              style={{
                fontFamily: poppinsFont,
                fontWeight: 600,
                fontSize: 'clamp(22px, 3vw, 34px)',
                lineHeight: 1.05,
              }}
            >
              <span>
                {t("friend.startNewLobby")} <span className="text-brand-yellow">{t("friend.lobbySuffix")}</span>
              </span>
            </h3>
            <p
              className="text-white/80 uppercase"
              style={{
                fontFamily: poppinsFont,
                fontWeight: 600,
                fontSize: 'clamp(11px, 1.1vw, 13px)',
                letterSpacing: '0.06em',
                lineHeight: 1.4,
              }}
            >
              {t("friend.startNewLobbyHint")}
            </p>
          </div>

          <div className="flex min-h-[88px] items-center justify-between gap-4 rounded-[16px] bg-black/25 px-4 py-3">
            <div className="space-y-1 flex-1">
              <label
                htmlFor="public-mode"
                className="flex items-center gap-2 text-white uppercase"
                style={{
                  fontFamily: poppinsFont,
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: '0.05em',
                }}
              >
                {isPublic ? (
                  <Globe className="size-4 text-brand-yellow" />
                ) : (
                  <Lock className="size-4 text-white/80" />
                )}
                {t("friend.publicRoom")}
              </label>
              <p
                className="text-white/75"
                style={{
                  fontFamily: poppinsFont,
                  fontWeight: 500,
                  fontSize: 11,
                  lineHeight: 1.3,
                }}
              >
                {isPublic
                  ? t("friend.publicAnyoneCanFind")
                  : t("friend.publicCodeOnly")}
              </p>
            </div>
            <Switch
              id="public-mode"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={lobbyCommands.isBusy || isCreating}
            aria-busy={isCreating}
            className="mt-auto flex h-16 w-full items-center justify-center gap-3 rounded-[20px] bg-surface-page text-white transition-colors hover:bg-surface-page/90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              fontFamily: poppinsFont,
              fontWeight: 600,
              fontSize: 'clamp(15px, 1.8vw, 20px)',
              letterSpacing: '0.04em',
            }}
          >
            {isCreating ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                <span className="uppercase">{t("friend.creating")}</span>
              </>
            ) : (
              <>
                <Plus
                  className="size-7 text-brand-yellow"
                  strokeWidth={3}
                />
                <span className="uppercase">{t("friend.createRoom")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div
        className="relative flex h-full flex-col overflow-hidden rounded-[20px] p-6 sm:p-7"
        style={cardSurfaceStyle}
      >
        <div className="flex h-full flex-col space-y-6">
          <div className="flex flex-col gap-3">
            {/* Same ~2-line min-height as the left card so the subtitle aligns. */}
            <h3
              className="flex min-h-[2.1em] items-start text-white uppercase"
              style={{
                fontFamily: poppinsFont,
                fontWeight: 600,
                fontSize: 'clamp(22px, 3vw, 34px)',
                lineHeight: 1.05,
              }}
            >
              <span>
                {t("friend.haveACode")} <span className="text-brand-yellow">{t("friend.codeSuffix")}</span>
              </span>
            </h3>
            <p
              className="text-white/80 uppercase"
              style={{
                fontFamily: poppinsFont,
                fontWeight: 600,
                fontSize: 'clamp(11px, 1.1vw, 13px)',
                letterSpacing: '0.06em',
                lineHeight: 1.4,
              }}
            >
              {t("friend.haveACodeHint")}
            </p>
          </div>

          <input
            id="invite-code"
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            maxLength={256}
            placeholder={t("friend.roomCodePlaceholder")}
            className="h-[88px] w-full rounded-[20px] border-none bg-black/25 px-6 text-center text-white uppercase outline-none placeholder:text-white/40 focus:outline-none"
            style={{
              fontFamily: poppinsFont,
              fontWeight: 600,
              fontSize: 'clamp(18px, 2vw, 24px)',
              letterSpacing: '0.18em',
              // letter-spacing adds a trailing gap after the last glyph; with
              // text-center that pushes the final letter past the right edge and
              // clips it. text-indent shifts the line right by one space to
              // recenter and keep the last character fully visible.
              textIndent: '0.18em',
            }}
          />

          <button
            type="button"
            onClick={handleJoin}
            disabled={lobbyCommands.isBusy || isJoining || !inviteCode}
            aria-busy={isJoining}
            className="mt-auto flex h-16 w-full items-center justify-center gap-3 rounded-[20px] bg-surface-page text-white transition-colors hover:bg-surface-page/90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              fontFamily: poppinsFont,
              fontWeight: 600,
              fontSize: 'clamp(15px, 1.8vw, 20px)',
              letterSpacing: '0.04em',
            }}
          >
            {isJoining ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                <span className="uppercase">{t("friend.joining")}</span>
              </>
            ) : (
              <>
                <ArrowRight
                  className="size-6 text-brand-yellow"
                  strokeWidth={3}
                />
                <span className="uppercase">{t("friend.joinLobby")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
