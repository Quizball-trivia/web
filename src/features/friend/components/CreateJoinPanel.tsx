import { useEffect, useState } from "react";
import { Plus, Lock, Globe, ArrowRight, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { trackFriendInviteAccepted } from "@/lib/analytics/game-events";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useLocale } from "@/contexts/LocaleContext";
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
  const isCreating = lobbyCommands.isCreating;
  const isJoining = lobbyCommands.isJoining;

  const handleCreate = () => {
    if (lobbyCommands.isBusy) return;
    if (onActionTriggered) onActionTriggered();
    toast.info(t("friend.creatingRoom"));
    void createLobby({ mode: "friendly", isPublic }).then((result) => {
      if (!result || result.ok) return;
      toast.error(result.message);
    });
  };

  const handleJoin = () => {
    if (lobbyCommands.isBusy) return;
    if (!inviteCode || inviteCode.length < 3) {
      toast.error(t("friend.enterValidCode"));
      return;
    }

    if (onActionTriggered) onActionTriggered();
    const code = inviteCode.trim().toUpperCase();
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
