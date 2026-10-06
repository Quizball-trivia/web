"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, ScrollText, User, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ModalCloseButton } from "@/components/shared/ModalCloseButton";
import { DemoModeArt } from "@/features/demos/DemoModeArt";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import type { Locale } from "@/lib/i18n/locale";

const CARD_BG = "#1238C9"; // same deeper brand blue as the Missing XI dialog, so the yellow CTA and white copy hold contrast
const poppins = { fontFamily: "var(--font-poppins)", fontWeight: 900 } as const;

const COPY: Record<Locale, {
  description: string; solo: string; done: (time: string) => string; friends: string; friendsHint: string; rules: string; rulesTitle: string; rulesList: string[];
}> = {
  es: {
    description: "Diez cifras reales del fútbol: fichajes, goles, aforos. Gana el que más se acerca, solo o en vivo contra tus amigos.",
    solo: "Jugar el reto de hoy",
    done: (time) => `Reto de hoy completado · vuelve en ${time}`,
    friends: "Jugar con amigos (2–6)",
    friendsHint: "Sala privada con enlace: todos responden la misma pregunta a la vez.",
    rules: "Cómo se juega",
    rulesTitle: "Cómo se juega",
    rulesList: [
      "Diez preguntas con una cifra real: el precio de un fichaje, los goles de una temporada, el público de una final.",
      "Reto diario (solo): deslizá tu respuesta; cuanto más cerca, más puntos. 100 es un pleno.",
      "Con amigos (2 a 6): todos ven la misma pregunta y escriben su cifra en 20 segundos.",
      "2 jugadores: el más cercano se lleva la ronda. 3 o más: el más cercano suma más (hasta 3), luego el siguiente; +1 si la clavás.",
      "Gana quien más puntos suma en las diez preguntas.",
    ],
  },
  en: {
    description: "Ten real football numbers: fees, goals, crowds. Closest wins — solo, or live against your friends.",
    solo: "Play today's challenge",
    done: (time) => `Today's challenge done · back in ${time}`,
    friends: "Play with friends (2–6)",
    friendsHint: "A private room with a link: everyone answers the same question at once.",
    rules: "How to play",
    rulesTitle: "How to play",
    rulesList: [
      "Ten questions with a real number: a transfer fee, a season's goals, a final's attendance.",
      "Daily challenge (solo): slide to your guess; the closer, the more points. 100 is a bullseye.",
      "With friends (2 to 6): everyone sees the same question and types a number within 20 seconds.",
      "2 players: the closest takes the round. 3 or more: the closest scores most (up to 3), then the next; +1 for an exact hit.",
      "Most points after ten questions wins.",
    ],
  },
  ka: {
    description: "ფეხბურთის ათი ნამდვილი რიცხვი: ტრანსფერები, გოლები, მაყურებლები. იგებს ვინც ყველაზე ახლოსაა — მარტო ან მეგობრებთან ერთად.",
    solo: "დღევანდელი გამოწვევა",
    done: (time) => `დღევანდელი დასრულდა · დაბრუნდი ${time}-ში`,
    friends: "მეგობრებთან თამაში (2–6)",
    friendsHint: "პირადი ოთახი ბმულით: ყველა ერთსა და იმავე კითხვას ერთად პასუხობს.",
    rules: "როგორ ვითამაშოთ",
    rulesTitle: "როგორ ვითამაშოთ",
    rulesList: [
      "ათი კითხვა ნამდვილი რიცხვით: ტრანსფერის ფასი, სეზონის გოლები, ფინალის მაყურებელი.",
      "დღიური გამოწვევა (მარტო): გადაწიე პასუხი; რაც უფრო ახლოს, მით მეტი ქულა. 100 — ზუსტი დარტყმა.",
      "მეგობრებთან (2-დან 6-მდე): ყველა ხედავს ერთსა და იმავე კითხვას და 20 წამში წერს რიცხვს.",
      "2 მოთამაშე: ყველაზე ახლოს მყოფი იგებს რაუნდს. 3 ან მეტი: ყველაზე ახლოს მყოფი იღებს მეტს (3-მდე), შემდეგ მომდევნო; ზუსტი პასუხი +1.",
      "იგებს ვინც ათი კითხვის შემდეგ მეტ ქულას დააგროვებს.",
    ],
  },
  tr: {
    description: "On gerçek futbol sayısı: bonservisler, goller, seyirciler. En yakın tahmin kazanır — tek başına ya da arkadaşlarına karşı canlı.",
    solo: "Bugünün görevini oyna",
    done: (time) => `Bugünkü görev bitti · ${time} sonra tekrar`,
    friends: "Arkadaşlarla oyna (2–6)",
    friendsHint: "Bağlantılı özel oda: herkes aynı soruyu aynı anda yanıtlar.",
    rules: "Nasıl oynanır",
    rulesTitle: "Nasıl oynanır",
    rulesList: [
      "Gerçek bir sayı soran on soru: bir bonservis bedeli, bir sezonun golleri, bir finalin seyircisi.",
      "Günlük görev (tek kişilik): tahminini kaydır; ne kadar yakınsan o kadar puan. 100 tam isabet.",
      "Arkadaşlarla (2–6 kişi): herkes aynı soruyu görür ve 20 saniyede sayısını yazar.",
      "2 oyuncu: en yakın olan turu alır. 3 ve üzeri: en yakın en çok puanı alır (en fazla 3), sonra sıradaki; tam isabete +1.",
      "On sorunun sonunda en çok puanı toplayan kazanır.",
    ],
  },
};

/**
 * These dialogs open from elements outside any Radix trigger (a carousel card, a button in another dialog), so Radix
 * cannot return focus on its own: remember what had focus when the dialog opened and put it back on close.
 */
function useReturnFocus() {
  const opener = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; },
    onCloseAutoFocus: (e: Event) => { if (opener.current?.isConnected) { e.preventDefault(); opener.current.focus(); } },
  };
}

function RulesModal({ isOpen, onOpenChange, title, rules }: { isOpen: boolean; onOpenChange: (open: boolean) => void; title: string; rules: string[] }) {
  const returnFocus = useReturnFocus();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent {...returnFocus} className={cn("max-w-md w-[92vw] rounded-[24px] border-0", "!flex max-h-[85vh] flex-col !gap-0 px-6 pt-7 pb-6 sm:px-7", "[&>button]:hidden")} style={{ backgroundColor: CARD_BG }}>
        <div className="absolute top-5 right-5 z-30">
          <ModalCloseButton onClose={() => onOpenChange(false)} className="!static !size-9 rounded-lg [&>svg]:size-4" />
        </div>
        <DialogTitle className="pr-10 text-left text-2xl uppercase leading-[0.95] text-brand-yellow" style={poppins}>{title}</DialogTitle>
        <DialogDescription className="sr-only">{title}</DialogDescription>
        <ol className="mt-4 space-y-2.5 overflow-y-auto">
          {rules.map((rule, i) => (
            <li key={rule} className="flex items-start gap-3 rounded-xl bg-black/25 px-3.5 py-2.5">
              <span className="mt-px w-4 shrink-0 text-center font-poppins text-sm font-black tabular-nums text-brand-yellow">{i + 1}</span>
              <p className="text-[13px] font-medium leading-snug text-white/90 sm:text-sm">{rule}</p>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The Stat Sniper card's entry dialog on the Play screen (signed in): today's daily (solo) or a 2–6 player room with
 * friends, plus the rules. Once today's daily is done the solo button says when it unlocks; friends stay available.
 */
export function StatSniperModeModal({ isOpen, onOpenChange, completed, unlockLabel, onPlaySolo, onPlayWithFriends }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  completed: boolean;
  unlockLabel: string;
  onPlaySolo: () => void;
  onPlayWithFriends: () => void;
}) {
  const { t, locale } = useLocale();
  const c = COPY[locale as Locale] ?? COPY.en;
  const [rulesOpen, setRulesOpen] = useState(false);
  const returnFocus = useReturnFocus();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent {...returnFocus} className={cn("max-w-md w-[92vw] rounded-[24px] border-0", "!flex max-h-[calc(100dvh-1.5rem)] flex-col !gap-0 overflow-y-auto px-6 pt-8 pb-6 sm:px-8", "[&>button]:hidden")} style={{ backgroundColor: CARD_BG }}>
        <div className="absolute top-5 right-5 z-30">
          <ModalCloseButton onClose={() => onOpenChange(false)} className="!static" />
        </div>
        {/* Short screens (a phone held sideways): drop the art so the buttons fit; the dialog scrolls past that. */}
        <div className="mb-3 flex justify-center [@media(max-height:520px)]:hidden">
          <DemoModeArt slug="daily-statSniper" className="h-32 w-56 overflow-hidden rounded-2xl drop-shadow-[0_6px_24px_rgba(0,0,0,0.35)] sm:h-36 sm:w-64" />
        </div>
        <DialogTitle className="text-center text-3xl uppercase leading-[0.95] text-brand-yellow sm:text-4xl" style={poppins}>{t("play.statSniperTitle")}</DialogTitle>
        <DialogDescription className="mx-auto mt-3 mb-5 max-w-[22rem] text-center text-[13px] font-medium leading-snug text-white/85 sm:text-sm">{c.description}</DialogDescription>
        <div>
          {completed ? (
            <div role="status" className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black/20 px-4 text-center font-poppins text-sm font-bold uppercase text-white/75">
              <CheckCircle2 className="size-5 shrink-0 text-brand-green-light" aria-hidden />
              {c.done(unlockLabel || "—")}
            </div>
          ) : (
            <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={onPlaySolo}
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-brand-yellow uppercase text-black transition-colors hover:bg-brand-yellow-deep"
              style={{ fontSize: "clamp(15px, 2.4vw, 18px)", ...poppins }}>
              <User className="size-5" strokeWidth={2.5} aria-hidden />
              {c.solo}
            </motion.button>
          )}
          <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={onPlayWithFriends} aria-describedby="stat-sniper-friends-hint"
            className={cn("mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl uppercase transition-colors",
              completed ? "bg-brand-yellow text-black hover:bg-brand-yellow-deep" : "bg-white text-brand-blue hover:bg-white/90")}
            style={{ fontSize: "clamp(14px, 2.2vw, 16px)", ...poppins }}>
            <Users className="size-5" strokeWidth={2.5} aria-hidden />
            {c.friends}
          </motion.button>
          <p id="stat-sniper-friends-hint" className="mt-1.5 text-center text-xs font-medium text-white/70">{c.friendsHint}</p>
          <button type="button" onClick={() => setRulesOpen(true)}
            className="mx-auto mt-3 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 font-poppins text-sm font-bold uppercase tracking-wide text-white/85 transition-colors hover:bg-black/20 hover:text-white">
            <ScrollText className="size-4" strokeWidth={2.5} aria-hidden />
            {c.rules}
          </button>
        </div>
      </DialogContent>
      <RulesModal isOpen={rulesOpen} onOpenChange={setRulesOpen} title={c.rulesTitle} rules={c.rulesList} />
    </Dialog>
  );
}
