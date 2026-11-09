"use client";

// EarnCoinsSheet — "How to earn" explainer opened from the store header and
// from the purchase modal when an item is out of reach. The store only lets
// players spend, so this is the one place that says where coins and tickets
// come from. Amounts mirror the backend (see constants below); keep them in
// sync when the economy changes.

import Link from "next/link";
import { CalendarCheck, ChevronRight, ListChecks, Swords, Ticket, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ModalCloseButton } from "@/components/shared/ModalCloseButton";
import { useIsMobile } from "@/hooks/useMobile";
import { useLocale } from "@/contexts/LocaleContext";
import { useObjectivesEnabled } from "@/lib/hooks/useObjectivesEnabled";
import type { MessageKey } from "@/lib/i18n/messages";
import { SHOW_TICKETS } from "@/lib/tickets";
import { TICKET_CAP } from "../lib/ticketRefill";

/** quizball-backend `ranked/season-rp-formula.ts` RANKED_WIN_COINS / RANKED_LOSS_COINS (humans only). */
const RANKED_WIN_COINS = 700;
const RANKED_LOSS_COINS = 250;
/** quizball-backend `weekend-league/wl-reward-policy.ts` — 1st place coins. */
const WL_TOP_PRIZE_COINS = 40_000;
/** quizball-backend `store/ticket-refill.service.ts` TICKET_PURCHASE_MAX_TICKETS_PER_WINDOW. */
const TICKET_PURCHASES_PER_DAY = 5;

interface EarnRow {
  icon: LucideIcon;
  title: MessageKey;
  description: MessageKey;
  params?: Record<string, string | number>;
  href: string;
}

interface EarnCoinsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EarnCoinsSheet({ open, onOpenChange }: EarnCoinsSheetProps) {
  const { t } = useLocale();
  const isMobile = useIsMobile();
  const objectivesEnabled = useObjectivesEnabled();

  const rows: EarnRow[] = [
    {
      icon: Swords,
      title: "store.earnRankedTitle",
      description: "store.earnRankedDesc",
      params: { win: RANKED_WIN_COINS.toLocaleString(), loss: RANKED_LOSS_COINS.toLocaleString() },
      href: "/play",
    },
    { icon: CalendarCheck, title: "store.earnDailyTitle", description: "store.earnDailyDesc", href: "/daily/challenges" },
    ...(objectivesEnabled
      ? [{ icon: ListChecks, title: "objectives.title", description: "store.earnObjectivesDesc", href: "/objectives" } satisfies EarnRow]
      : []),
    {
      icon: Trophy,
      title: "weekendLeague.title",
      description: "store.earnWlDesc",
      params: { coins: WL_TOP_PRIZE_COINS.toLocaleString() },
      href: "/weekend-league",
    },
  ];

  const close = () => onOpenChange(false);

  const body = (
    <div className="font-poppins text-white">
      <h2 className="max-w-[calc(100%-64px)] text-[22px] font-semibold uppercase leading-tight sm:text-[26px]">
        {t(SHOW_TICKETS ? "store.earnTitle" : "store.howToEarnCoins")}
      </h2>

      <ul className="mt-5 flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.href}>
            <Link
              href={row.href}
              onClick={close}
              className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 transition-colors hover:bg-white/[0.1] focus-visible:outline-2 focus-visible:outline-brand-yellow"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-yellow/15 text-brand-yellow">
                <row.icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold leading-tight">{t(row.title)}</span>
                <span className="mt-1 block text-[13px] leading-snug text-white/70">{t(row.description, row.params)}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-white/40" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      {SHOW_TICKETS && <div className="mt-4 flex gap-3 rounded-2xl border border-white/10 p-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-green-light/15 text-brand-green-light">
          <Ticket className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-tight">{t("store.ticketsTitle")}</span>
          <span className="mt-1 block text-[13px] leading-snug text-white/70">
            {t("store.earnTicketsDesc", { cap: TICKET_CAP, daily: TICKET_PURCHASES_PER_DAY })}
          </span>
        </span>
      </div>}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl border-0 bg-store-card px-5 pt-6 pb-8 [&>button]:hidden">
          <div className="absolute top-5 right-5 z-30">
            <ModalCloseButton onClose={close} className="!static" />
          </div>
          <SheetTitle className="sr-only">{t(SHOW_TICKETS ? "store.earnTitle" : "store.howToEarnCoins")}</SheetTitle>
          <SheetDescription className="sr-only">{t("store.earnRankedTitle")}</SheetDescription>
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[520px] max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto rounded-3xl border-0 bg-store-card p-7 [&>button]:hidden">
        <div className="absolute top-6 right-6 z-30">
          <ModalCloseButton onClose={close} className="!static" />
        </div>
        <DialogTitle className="sr-only">{t(SHOW_TICKETS ? "store.earnTitle" : "store.howToEarnCoins")}</DialogTitle>
        <DialogDescription className="sr-only">{t("store.earnRankedTitle")}</DialogDescription>
        {body}
      </DialogContent>
    </Dialog>
  );
}
