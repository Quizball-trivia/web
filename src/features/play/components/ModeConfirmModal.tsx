import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Trophy, Users, User, Crown, Ticket, Ban } from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";
import { cn } from "@/lib/utils";

interface ModeConfirmModalProps {
  mode: 'ranked' | 'friendly' | 'solo' | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  ticketsRemaining?: number;
}

export function ModeConfirmModal({
  mode,
  isOpen,
  onOpenChange,
  onConfirm,
  ticketsRemaining = 0,
}: ModeConfirmModalProps) {
  const isMobile = useIsMobile();

  if (!mode) return null;

  const config = {
    ranked: {
      title: "Ranked Match",
      icon: Trophy,

      accentColor: "#FF9600",
      accentDark: "#DB8200",
      description: "4 Random categories appear - each player blocks 1, then compete in the remaining 2",
      entryCost: 1,
      stats: [
        { label: "FORMAT", value: "1v1 Duel" },
        { label: "DURATION", value: "~2 min" },
        { label: "QUESTIONS", value: "10" },
      ],
    },
    friendly: {
      title: "Friendly Match",
      icon: Users,

      accentColor: "#1CB0F6",
      accentDark: "#1899D6",
      description: "Play against a friend. No RP at stake.",
      entryCost: 0,
      stats: [
        { label: "FORMAT", value: "1v1" },
        { label: "DURATION", value: "Variable" },
        { label: "CUSTOM", value: "Yes" },
      ],
    },
    solo: {
      title: "Solo Practice",
      icon: User,

      accentColor: "#58CC02",
      accentDark: "#46A302",
      description: "Practice your skills against the AI.",
      entryCost: 0,
      stats: [
        { label: "FORMAT", value: "Solo" },
        { label: "SPEED", value: "Self-paced" },
        { label: "XP", value: "Earned" },
      ],
    },
  }[mode];

  const isRanked = mode === 'ranked';
  // TODO: Re-enable ticket check when ticket system is implemented
  // const hasTickets = ticketsRemaining >= (config.entryCost || 0);
  const hasTickets = true; // Temporarily always enabled until tickets are implemented

  const Content = (
    <div className="space-y-5 font-fun">
      {/* Header Icon */}
      <div className="flex flex-col items-center text-center gap-3">
        <div
          className="size-20 rounded-full flex items-center justify-center border-4 border-b-[6px]"
          style={{ backgroundColor: config.accentColor, borderColor: config.accentDark }}
        >
          <config.icon className="size-9 text-white" strokeWidth={2.5} />
        </div>

        {isRanked && (
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border-b-[3px] text-[11px] font-black text-white uppercase tracking-wider"
            style={{ backgroundColor: config.accentColor, borderColor: config.accentDark }}
          >
            <Crown className="size-3.5" />
            Competitive
          </div>
        )}

        <p className="text-sm font-bold text-[#56707A] max-w-xs">{config.description}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        {config.stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-[#1B2F36] rounded-xl p-3 text-center border-b-[3px] border-[#0D1B21]"
          >
            <div className="text-[9px] font-black text-[#56707A] uppercase tracking-wider">{stat.label}</div>
            <div className="text-sm font-black text-white mt-0.5">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Entry Cost */}
      {config.entryCost > 0 && (
        <div className={cn(
          "rounded-2xl p-4 flex items-center justify-between border-b-[3px]",
          hasTickets
            ? "bg-[#1B2F36] border-[#0D1B21]"
            : "bg-[#FF4B4B]/10 border-[#FF4B4B]/20"
        )}>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "size-11 rounded-full flex items-center justify-center border-[3px] border-b-4",
                hasTickets
                  ? "bg-[#58CC02] border-[#46A302]"
                  : "bg-[#FF4B4B] border-[#E04242]"
              )}
            >
              <Ticket className="size-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-black text-white">Entry Cost</div>
              <div className="text-xs font-bold text-[#56707A] flex items-center gap-1">
                {config.entryCost} Ticket
                <span className="text-[#56707A]/50">|</span>
                You have: <span className={cn("font-black", hasTickets ? "text-[#58CC02]" : "text-[#FF4B4B]")}>{ticketsRemaining}</span>
              </div>
            </div>
          </div>
          {!hasTickets && (
            <div className="flex items-center gap-1 bg-[#FF4B4B] text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full border-b-2 border-[#E04242]">
              <Ban className="size-3" />
              No Tickets
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          onClick={() => onOpenChange(false)}
          className="py-3.5 rounded-2xl bg-[#1B2F36] border-b-4 border-[#0D1B21] text-base font-black text-[#56707A] uppercase tracking-wide hover:bg-[#FF4B4B] hover:border-[#E04242] hover:text-white active:translate-y-[2px] active:border-b-2 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="py-3.5 rounded-2xl bg-[#58CC02] border-b-4 border-[#46A302] text-base font-black text-white uppercase tracking-wide hover:bg-[#4CB801] active:translate-y-[2px] active:border-b-2 transition-all"
        >
          Start Match
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl border-t border-white/5 bg-[#131F24] px-5 pb-8">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="text-xl font-black text-white font-fun">
              {config.title}
            </SheetTitle>
          </SheetHeader>
          {Content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#131F24] border-[#1B2F36] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-center hidden">Confirm {config.title}</DialogTitle>
          <DialogDescription className="sr-only">
            Confirm your selected game mode before starting.
          </DialogDescription>
          <div className="text-center text-xl font-black text-white font-fun">{config.title}</div>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
