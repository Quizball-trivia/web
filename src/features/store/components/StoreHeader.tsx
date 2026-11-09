"use client";

// StoreHeader — title, live balances and the "how to earn" entry point. The
// navbar coin/ticket pills both link here, so this is where players land when
// they want to know what they have and how to get more.

import Image from "next/image";
import { CircleHelp } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { STORE_SELLS_TICKETS } from "@/lib/tickets";
import { TICKET_CAP } from "../lib/ticketRefill";

interface StoreHeaderProps {
  coins: number | null;
  tickets: number | null;
  /** Pre-formatted time to the next free ticket ("1h 42m"); null when full or unknown. */
  nextFreeTicketIn: string | null;
  onHowToEarn: () => void;
}

export function StoreHeader({ coins, tickets, nextFreeTicketIn, onHowToEarn }: StoreHeaderProps) {
  const { t } = useLocale();
  const ticketsFull = tickets != null && tickets >= TICKET_CAP;

  return (
    <header className="font-poppins">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[32px] font-semibold uppercase leading-none text-white sm:text-[40px]">
          {t("store.title")}
        </h1>
        <button
          type="button"
          onClick={onHowToEarn}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3.5 text-[13px] font-semibold text-white/90 transition-colors hover:bg-white/[0.06] sm:text-sm"
        >
          <CircleHelp className="size-4 text-brand-yellow" aria-hidden />
          {t("store.howToEarn")}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:flex sm:gap-3">
        <div className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-store-card px-3 py-2.5 sm:min-w-[180px] sm:px-4">
          <Image src="/assets/coin-1.png?v=2" alt="" width={28} height={28} className="size-7 shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.04em] text-white/60">{t("store.coinsTitle")}</div>
            <div className="truncate text-lg font-semibold tabular-nums text-white">
              {coins == null ? "—" : coins.toLocaleString()}
            </div>
          </div>
        </div>

        {STORE_SELLS_TICKETS && <div className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-store-card px-3 py-2.5 sm:min-w-[220px] sm:px-4">
          <Image src="/assets/ticket-1.png" alt="" width={26} height={26} className="size-[26px] shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.04em] text-white/60">{t("store.ticketsTitle")}</div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-x-2">
              <span className="text-lg font-semibold tabular-nums text-white">
                {tickets == null ? "—" : `${tickets}/${TICKET_CAP}`}
              </span>
              {ticketsFull ? (
                <span className="text-[12px] leading-tight text-white/60 sm:whitespace-nowrap">{t("store.ticketsFullShort")}</span>
              ) : nextFreeTicketIn ? (
                <span className="text-[12px] leading-tight tabular-nums text-brand-green-light sm:whitespace-nowrap">
                  {t("store.nextFreeTicketIn", { time: nextFreeTicketIn })}
                </span>
              ) : null}
            </div>
          </div>
        </div>}
      </div>
    </header>
  );
}
