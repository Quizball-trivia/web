"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { BoardPicker } from "@/features/codenames/BoardPicker";
import { codenamesCopy } from "@/features/codenames/codenames.copy";
import { takeRoomPreset } from "@/features/codenames/codenames.board";
import { wordDeckLang } from "@/features/codenames/codenames.practice";

/** The board languages and how each is written in itself. */
const LANGUAGE: Record<string, string> = { en: "English", es: "Español", tr: "Türkçe", ru: "Русский", ka: "ქართული" };

/** The room's stored options as Codenames reads them: a word board in its language, or the picture board. */
export function readCodenamesOptions(raw: Record<string, unknown> | null | undefined): { board: "words"; lang: string } | null {
  return raw?.board === "words" && typeof raw.lang === "string" ? { board: "words", lang: raw.lang } : null;
}

/**
 * Pictures or words, picked by the host in the lobby (the board is dealt at kick-off). A word board is in the host's
 * language at the moment of the pick (English while that language has no deck). A host who chose Words on the Codenames screen before opening the room gets it
 * preset once.
 */
export function CodenamesRoomOptions({ options, canEdit, onChange }: {
  options: Record<string, unknown> | null;
  canEdit: boolean;
  onChange: (options: Record<string, unknown> | null) => void;
}) {
  const { locale } = useLocale();
  const c = codenamesCopy(locale);
  const current = readCodenamesOptions(options);
  const preset = useRef(false);
  useEffect(() => {
    if (preset.current || !canEdit || current) return;
    preset.current = true;
    if (takeRoomPreset()) onChange({ board: "words", lang: wordDeckLang(locale) });
  }, [canEdit, current, locale, onChange]);
  return (
    <div data-codenames-room-options className="mt-2 w-full text-left">
      <BoardPicker locale={locale} value={current ? "words" : "pictures"}
        onChange={canEdit ? (board) => onChange(board === "words" ? { board: "words", lang: wordDeckLang(locale) } : null) : undefined} />
      {current && <p className="mt-2 text-center text-xs font-semibold text-white/70">{c.board.words} · {LANGUAGE[current.lang] ?? current.lang}</p>}
      {!canEdit && <p className="mt-1 text-center text-xs text-white/55">{c.board.hostPicks}</p>}
    </div>
  );
}
