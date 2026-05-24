import { useEffect, useRef, useState } from "react";
import { Plus, Lock, Globe, ArrowRight, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getSocket } from "@/lib/realtime/socket-client";
import { trackFriendInviteAccepted } from "@/lib/analytics/game-events";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useLocale } from "@/contexts/LocaleContext";

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
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const lobby = useRealtimeMatchStore((state) => state.lobby);
  const error = useRealtimeMatchStore((state) => state.error);
  const createTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const joinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCreateTimeout = () => {
    if (!createTimeoutRef.current) return;
    clearTimeout(createTimeoutRef.current);
    createTimeoutRef.current = null;
  };

  const clearJoinTimeout = () => {
    if (!joinTimeoutRef.current) return;
    clearTimeout(joinTimeoutRef.current);
    joinTimeoutRef.current = null;
  };

  const handleCreate = () => {
    if (isCreating) return;
    if (onActionTriggered) onActionTriggered();
    setIsCreating(true);
    clearCreateTimeout();
    createTimeoutRef.current = setTimeout(() => {
      setIsCreating(false);
      toast.error(t("friend.createTimedOut"));
    }, 8000);
    getSocket().emit("lobby:create", { mode: "friendly", isPublic });
    toast.info(t("friend.creatingRoom"));
  };

  const handleJoin = () => {
    if (isJoining) return;
    if (!inviteCode || inviteCode.length < 3) {
      toast.error(t("friend.enterValidCode"));
      return;
    }

    if (onActionTriggered) onActionTriggered();
    setIsJoining(true);
    clearJoinTimeout();
    joinTimeoutRef.current = setTimeout(() => {
      setIsJoining(false);
      toast.error(t("friend.joinTimedOut"));
    }, 8000);
    const code = inviteCode.toUpperCase();
    trackFriendInviteAccepted(code);
    getSocket().emit("lobby:join_by_code", { inviteCode: code });
    toast.info(t("friend.joiningCode", { code }));
  };

  useEffect(() => {
    if (!lobby) return;
    clearCreateTimeout();
    clearJoinTimeout();
    const timer = setTimeout(() => {
      setIsCreating(false);
      setIsJoining(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [lobby?.lobbyId, lobby?.inviteCode, lobby]);

  useEffect(() => {
    if (!error) return;
    clearCreateTimeout();
    clearJoinTimeout();
    const timer = setTimeout(() => {
      setIsCreating(false);
      setIsJoining(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    return () => {
      clearCreateTimeout();
      clearJoinTimeout();
    };
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
      <div
        className="relative overflow-hidden rounded-[20px] p-6 sm:p-7"
        style={cardSurfaceStyle}
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <h3
              className="text-white uppercase"
              style={{
                fontFamily: poppinsFont,
                fontWeight: 600,
                fontSize: 'clamp(22px, 3vw, 34px)',
                lineHeight: 1.05,
              }}
            >
              {t("friend.startNewLobby")} <span className="text-brand-yellow">{t("friend.lobbySuffix")}</span>
            </h3>
            <p
              className="text-white/55 uppercase"
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

          <div className="flex items-center justify-between gap-4 rounded-[16px] bg-black/25 px-4 py-3">
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
                  <Lock className="size-4 text-white/60" />
                )}
                {t("friend.publicRoom")}
              </label>
              <p
                className="text-white/50"
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
            disabled={isCreating}
            className="flex h-16 w-full items-center justify-center gap-3 rounded-[20px] bg-surface-page text-white transition-colors hover:bg-surface-page/90 disabled:opacity-60"
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
        className="relative overflow-hidden rounded-[20px] p-6 sm:p-7"
        style={cardSurfaceStyle}
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <h3
              className="text-white uppercase"
              style={{
                fontFamily: poppinsFont,
                fontWeight: 600,
                fontSize: 'clamp(22px, 3vw, 34px)',
                lineHeight: 1.05,
              }}
            >
              {t("friend.haveACode")} <span className="text-brand-yellow">{t("friend.codeSuffix")}</span>
            </h3>
            <p
              className="text-white/55 uppercase"
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
            maxLength={8}
            placeholder={t("friend.roomCodePlaceholder")}
            className="h-16 w-full rounded-[20px] border-none bg-black/25 px-6 text-center text-white uppercase outline-none placeholder:text-white/40 focus:outline-none"
            style={{
              fontFamily: poppinsFont,
              fontWeight: 600,
              fontSize: 'clamp(18px, 2vw, 24px)',
              letterSpacing: '0.18em',
            }}
          />

          <button
            type="button"
            onClick={handleJoin}
            disabled={isJoining || !inviteCode}
            className="flex h-16 w-full items-center justify-center gap-3 rounded-[20px] bg-surface-page text-white transition-colors hover:bg-surface-page/90 disabled:opacity-50"
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
