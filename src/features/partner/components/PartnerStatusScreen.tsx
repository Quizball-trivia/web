"use client";

import { Ban, Loader2, RotateCcw } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { partnerCopy } from "../partnerCopy";
import type { PartnerSessionState } from "../PartnerSessionProvider";

type ScreenState = Exclude<PartnerSessionState, { status: "ready" }>;

export function PartnerStatusScreen({ state }: { state: ScreenState }) {
  const { locale } = useLocale();
  const copy = partnerCopy(locale);

  if (state.status === "redeeming") {
    return (
      <div role="status" className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-white/70">
        <Loader2 className="size-7 animate-spin text-brand-yellow" aria-hidden />
        <p className="font-poppins text-sm">{copy.signingIn}</p>
      </div>
    );
  }

  const blocked = state.status === "blocked";
  const body = blocked
    ? copy.blockedBody
    : state.status === "launch_failed" && state.reason === "token_used"
      ? copy.linkUsedBody
      : state.status === "launch_failed" && state.reason === "error"
        ? copy.launchErrorBody
        : state.status === "relaunch" && state.reason === "replaced"
          ? copy.replacedBody
          : copy.relaunchBody;

  return (
    <div role="alert" className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-white/[0.08]">
        {blocked ? <Ban className="size-7 text-brand-red-soft" aria-hidden /> : <RotateCcw className="size-7 text-brand-yellow" aria-hidden />}
      </div>
      <h1 className="mt-4 font-poppins text-lg font-semibold text-white">{blocked ? copy.blockedTitle : copy.relaunchTitle}</h1>
      <p className="mt-2 max-w-xs font-poppins text-sm leading-relaxed text-white/70">{body}</p>
    </div>
  );
}
