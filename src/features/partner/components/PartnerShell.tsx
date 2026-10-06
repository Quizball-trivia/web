"use client";

import { usePartnerSession } from "../PartnerSessionProvider";
import { PartnerHeader } from "./PartnerHeader";
import { PartnerStatusScreen } from "./PartnerStatusScreen";

/** Header + gate: nothing below the header renders until redeem has confirmed the player. */
export function PartnerShell({ children }: { children: React.ReactNode }) {
  const { state } = usePartnerSession();

  return (
    <div className="flex min-h-dvh w-full flex-col overflow-x-clip bg-surface-page text-white">
      <PartnerHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        {state.status === "ready" ? children : <PartnerStatusScreen state={state} />}
      </main>
    </div>
  );
}
