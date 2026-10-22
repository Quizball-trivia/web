"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { poppins } from "@/features/wordgames/ui";

export interface GameFeedbackAnswer { rating: number; wantsOnline: boolean | null; comment: string }

const COPY = {
  en: {
    title: (game: string) => `How was ${game}?`,
    online: "Would you play it online against a random opponent, like Ranked or Tic Tac Toe?",
    yes: "Yes", no: "No", comment: "Anything to tell us? (optional)", send: "Send", later: "Not now", close: "Close",
    thanks: "Thanks! We read every answer.", stars: (n: number) => `${n} of 5 stars`,
    error: "Couldn't send. Please try again.", sending: "Sending…",
  },
  es: {
    title: (game: string) => `¿Qué te pareció ${game}?`,
    online: "¿Lo jugarías online contra un rival al azar, como en Clasificatorio o el Tic Tac Toe futbolero?",
    yes: "Sí", no: "No", comment: "¿Algo para contarnos? (opcional)", send: "Enviar", later: "Ahora no", close: "Cerrar",
    thanks: "¡Gracias! Leemos todas las respuestas.", stars: (n: number) => `${n} de 5 estrellas`,
    error: "No se pudo enviar. Probá de nuevo.", sending: "Enviando…",
  },
  ka: {
    title: (game: string) => `როგორ მოგეწონა „${game}“?`,
    online: "ითამაშებდი ონლაინ შემთხვევით მეტოქესთან, როგორც რეიტინგულში ან ტიკ-ტაკ-ტოში?",
    yes: "კი", no: "არა", comment: "გინდა რამე მოგვწერო? (არასავალდებულო)", send: "გაგზავნა", later: "ახლა არა", close: "დახურვა",
    thanks: "მადლობა! ყველა პასუხს ვკითხულობთ.", stars: (n: number) => `${n} ვარსკვლავი 5-დან`,
    error: "ვერ გაიგზავნა. სცადე თავიდან.", sending: "იგზავნება…",
  },
  tr: {
    title: (game: string) => `${game} nasıldı?`,
    online: "Sıralamalı ya da XOX gibi, rastgele bir rakiple online oynar mıydın?",
    yes: "Evet", no: "Hayır", comment: "Söylemek istediğin bir şey var mı? (isteğe bağlı)", send: "Gönder", later: "Şimdi değil", close: "Kapat",
    thanks: "Teşekkürler! Her cevabı okuyoruz.", stars: (n: number) => `5 üzerinden ${n} yıldız`,
    error: "Gönderilemedi. Tekrar dene.", sending: "Gönderiliyor…",
  },
  ru: {
    title: (game: string) => `Как вам «${game}»?`,
    online: "Сыграли бы вы онлайн со случайным соперником, как в рейтинговом режиме или в крестиках-ноликах?",
    yes: "Да", no: "Нет", comment: "Хотите что-то добавить? (необязательно)", send: "Отправить", later: "Не сейчас", close: "Закрыть",
    thanks: "Спасибо! Мы читаем каждый ответ.", stars: (n: number) => `${n} из 5 звёзд`,
    error: "Не удалось отправить. Попробуйте ещё раз.", sending: "Отправка…",
  },
  pt: {
    title: (game: string) => `O que você achou de ${game}?`,
    online: "Você jogaria online contra um adversário aleatório, como no modo Ranqueado ou no Tic Tac Toe?",
    yes: "Sim", no: "Não", comment: "Quer dizer algo pra gente? (opcional)", send: "Enviar", later: "Agora não", close: "Fechar",
    thanks: "Valeu! A gente lê todas as respostas.", stars: (n: number) => `${n} de 5 estrelas`,
    error: "Não foi possível enviar. Tente novamente.", sending: "Enviando…",
  },
} as const;

const copyFor = (locale: string) => COPY[(locale in COPY ? locale : "en") as keyof typeof COPY];

function FeedbackForm({ game, locale, onSend, onClose }: {
  game: string; locale: string; onSend: (answer: GameFeedbackAnswer) => Promise<unknown>; onClose: () => void;
}) {
  const c = copyFor(locale);
  const [rating, setRating] = useState(0);
  const [wantsOnline, setWantsOnline] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  // The answer is frozen while it is on its way: a change made then would be lost behind the thanks.
  const busy = status === "sending";
  if (status === "sent") return <p className="py-2 text-center text-sm font-bold text-white" role="status">{c.thanks}</p>;
  const submit = async () => {
    setStatus("sending");
    try { await onSend({ rating, wantsOnline, comment: comment.trim() }); setStatus("sent"); } catch { setStatus("failed"); }
  };
  return (
    <>
      <fieldset disabled={busy} className="flex justify-center gap-1.5">
        <legend className="sr-only">{c.title(game)}</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-white/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-white">
            <input type="radio" name={`game-feedback-${game}`} value={n} checked={rating === n} onChange={() => setRating(n)} aria-label={c.stars(n)} className="sr-only" />
            <Star aria-hidden className={cn("size-8", n <= rating ? "fill-brand-yellow text-brand-yellow" : "text-white/35")} strokeWidth={1.75} />
          </label>
        ))}
      </fieldset>
      <p className="mt-4 text-center text-sm font-semibold text-white/85">{c.online}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {([true, false] as const).map((v) => (
          <button key={String(v)} type="button" disabled={busy} aria-pressed={wantsOnline === v} onClick={() => setWantsOnline(v)}
            className={cn("h-11 rounded-full text-sm font-black uppercase tracking-wide", wantsOnline === v ? "bg-white text-brand-blue" : "bg-white/10 text-white/85 hover:bg-white/15")} style={poppins}>
            {v ? c.yes : c.no}
          </button>
        ))}
      </div>
      <textarea disabled={busy} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} rows={2} placeholder={c.comment}
        className="mt-3 w-full resize-none rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/45 focus:border-white/40 focus:outline-none" />
      {status === "failed" && <p role="alert" className="mt-3 text-center text-sm font-semibold text-brand-red-light">{c.error}</p>}
      <button type="button" disabled={rating === 0 || busy} onClick={() => void submit()}
        className="mt-3 h-12 w-full rounded-full bg-brand-green text-sm font-black uppercase tracking-wide text-white hover:bg-brand-green-deep disabled:bg-white/15 disabled:text-white/50" style={poppins}>
        {status === "sending" ? c.sending : c.send}
      </button>
      <button type="button" onClick={onClose} className="mx-auto mt-2 block min-h-9 px-3 text-xs font-bold uppercase tracking-wide text-white/55 hover:text-white">{c.later}</button>
    </>
  );
}

/** A small card under a game's result: stars, "would you play it online", an optional comment. */
export function GameFeedbackCard({ game, locale, className, onSend, onClose }: {
  game: string; locale: string; className?: string; onSend: (answer: GameFeedbackAnswer) => Promise<unknown>; onClose: () => void;
}) {
  const c = copyFor(locale);
  return (
    <section className={cn("relative rounded-3xl border border-white/10 bg-white/[0.06] px-5 pb-3 pt-4", className)}>
      <button type="button" onClick={onClose} aria-label={c.close} className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-white/55 hover:bg-white/10 hover:text-white">
        <X className="size-4" />
      </button>
      <h2 className="mb-2 px-6 text-center text-base font-black" style={poppins}>{c.title(game)}</h2>
      <FeedbackForm game={game} locale={locale} onSend={onSend} onClose={onClose} />
    </section>
  );
}

const storageKey = (game: string) => `quizball.gameFeedback.${game}`;

/**
 * The card once per game per browser: hidden for good after it is sent or closed. A send that fails leaves no mark,
 * so the card stays on screen to retry.
 */
export function GameFeedbackSlot({ game, title, locale, className, send }: {
  game: string; title: string; locale: string; className?: string; send: (answer: GameFeedbackAnswer) => Promise<unknown>;
}) {
  // Only mounted after a game ends (client-side, after data), so reading storage on the first render is safe. Blocked
  // storage still shows the card; closing it then lasts for this screen only.
  const [show, setShow] = useState(() => {
    try { return localStorage.getItem(storageKey(game)) === null; } catch { return true; }
  });
  const mark = (value: "sent" | "closed") => { try { localStorage.setItem(storageKey(game), value); } catch { /* storage is off: the card may come back */ } };
  if (!show) return null;
  return (
    <GameFeedbackCard className={className} game={title} locale={locale}
      onSend={(answer) => send(answer).then(() => mark("sent"))}
      onClose={() => { mark("closed"); setShow(false); }} />
  );
}
