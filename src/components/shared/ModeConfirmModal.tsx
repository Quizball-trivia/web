import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";
import { cn } from "@/lib/utils";

interface ModeConfirmModalProps {
  mode: 'ranked' | 'friendly' | 'solo' | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  ticketsRemaining?: number;
}

const CONFIG = {
  ranked: {
    titlePrefix: "1V1",
    titleRest: "Ranked Match",
    description: "3 Random categories appear - each player blocks 1, then compete in the remaining one",
    icon: "/assets/ranked-icon.webp",
    stats: ["12–18 Questions", "Duration 5 Min"],
    entryCost: 1,
  },
  friendly: {
    titlePrefix: "1V1",
    titleRest: "Friendly Match",
    description: "Play against a friend. No RP at stake.",
    icon: "/assets/friendly_match-icon.webp",
    stats: ["Custom Rules", "Variable Length"],
    entryCost: 0,
  },
  solo: {
    titlePrefix: "Solo",
    titleRest: "Practice",
    description: "Practice your skills against the AI.",
    icon: "/assets/ranked-icon.webp",
    stats: ["Self-Paced", "XP Earned"],
    entryCost: 0,
  },
} as const;

export function ModeConfirmModal({
  mode,
  isOpen,
  onOpenChange,
  onConfirm,
  ticketsRemaining = 0,
}: ModeConfirmModalProps) {
  const isMobile = useIsMobile();

  if (!mode) return null;

  const config = CONFIG[mode];
  const hasTickets = ticketsRemaining >= config.entryCost;

  const Body = (
    <div className="relative font-fun">
      <div className="mb-3 flex justify-end md:mb-2">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="z-10 flex size-11 items-center justify-center rounded-xl bg-[#FB3101] text-white transition-colors hover:bg-[#E02B00]"
        >
          <X className="size-5" strokeWidth={3} />
        </button>
      </div>

      {/* Title */}
      <h2
        className="font-poppins mx-auto text-center uppercase text-white leading-none"
        style={{ fontSize: "clamp(26px, 4.2vw, 52px)" }}
      >
        <span className="text-[#FFE500]">{config.titlePrefix}</span> {config.titleRest}
      </h2>

      {/* Description */}
      <p className="mx-auto mt-3 max-w-[28rem] text-center text-sm leading-snug font-bold text-white/80 md:mt-2 md:text-base">
        {config.description}
      </p>

      {/* Trophy watermark with stat pills */}
      <div className="relative my-6 md:my-8 h-40 md:h-52">
        <Image
          src={config.icon}
          alt=""
          fill
          className="object-contain"
        />
        {config.stats[0] && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 px-4 py-2 rounded-full bg-[#FFE500] text-black text-xs md:text-sm font-black uppercase whitespace-nowrap">
            {config.stats[0]}
          </div>
        )}
        {config.stats[1] && (
          <div className="absolute right-0 top-[30%] px-4 py-2 rounded-full bg-[#FFE500] text-black text-xs md:text-sm font-black uppercase whitespace-nowrap">
            {config.stats[1]}
          </div>
        )}
      </div>

      {/* Play button */}
      <button
        type="button"
        onClick={() => {
          if (!hasTickets) return;
          onConfirm();
        }}
        disabled={!hasTickets}
        className={cn(
          "w-full h-14 md:h-16 rounded-2xl text-lg md:text-xl font-black uppercase tracking-wide transition-all",
          hasTickets
            ? "bg-black text-white hover:bg-black/90 active:translate-y-[2px]"
            : "bg-black/60 text-white/50 cursor-not-allowed"
        )}
      >
        {config.entryCost > 0 ? (
          <>
            Play for <span className="text-[#FFE500]">{config.entryCost} Ticket{config.entryCost === 1 ? "" : "s"}</span>
          </>
        ) : (
          "Play"
        )}
      </button>

      {/* Tickets footer */}
      {config.entryCost > 0 && (
        <div className="mt-4 mb-0 flex items-center justify-center gap-2 text-[11px] font-black uppercase text-white/80 md:mt-4 md:text-xs">
          <span>You have {ticketsRemaining} Ticket{ticketsRemaining === 1 ? "" : "s"}</span>
          <Image src="/assets/ticket-1.png" alt="" width={20} height={20} className="size-5 object-contain" />
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-0 px-6 pt-6 pb-6 [&>button]:hidden"
          style={{ backgroundColor: "#38B60E" }}
        >
          <SheetTitle className="sr-only">{config.titleRest}</SheetTitle>
          <SheetDescription className="sr-only">{config.description}</SheetDescription>
          {Body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[560px] max-h-[95vh] rounded-[20px] border-0 px-10 pt-4 pb-8 sm:max-w-[560px] [&>button]:hidden"
        style={{ backgroundColor: "#38B60E" }}
      >
        <DialogTitle className="sr-only">{config.titleRest}</DialogTitle>
        <DialogDescription className="sr-only">{config.description}</DialogDescription>
        {Body}
      </DialogContent>
    </Dialog>
  );
}
