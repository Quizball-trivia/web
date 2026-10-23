"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { Bot, Check, Eye, Minus, Plus, Shuffle, Timer } from "lucide-react";
import { DuelAvatar } from "@/features/duel/DuelAvatar";
import { Frame, GreenButton, QuietButton, TopBar, poppins } from "@/features/wordgames/ui";
import { cn } from "@/lib/utils";
import { BoardPicker } from "./BoardPicker";
import { CodenamesBoard, type BoardCard } from "./CodenamesBoard";
import { useFlipSounds } from "./codenames.sounds";
import { codenamesCopy, type CodenamesCopy } from "./codenames.copy";
import { ClueBanner } from "./CodenamesSolo";
import { useCardAlt } from "./codenames.alt";
import { knownName, suggestNames } from "./codenames.names";
import { cardArt, cardsLeft, clueOnBoard, foldClue, kindFor, me, myTeamOf, type BoardKind, type CodenamesCommand, type CodenamesRoomView, type RoomPlayer, type Team } from "./codenames.view";

const other = (t: Team): Team => (t === 0 ? 1 : 0);

function TeamPill({ c, players, left, mine, active, label, bot }: { c: CodenamesCopy; players: RoomPlayer[]; left: number; mine: boolean; active: boolean; label: string; bot: boolean }) {
  return (
    <div data-codenames-team={mine ? "mine" : "rival"}
      className={cn("min-w-0 flex-1 rounded-2xl px-3 py-2 transition-colors", active ? (mine ? "bg-brand-green/15 ring-2 ring-brand-green" : "bg-brand-blue/25 ring-2 ring-brand-blue") : "bg-white/[0.05]")}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-black uppercase tracking-wide text-white/70">{label}</p>
        <p className={cn("text-2xl font-black leading-none tabular-nums", mine ? "text-brand-green-light" : "text-white")} style={poppins} aria-label={c.left(left)}>{left}</p>
      </div>
      <div className="mt-1.5 flex -space-x-1.5">
        {bot && (
          <span className="relative flex size-6 items-center justify-center rounded-full bg-white/15 ring-2 ring-surface-page-alt" title={c.botScout}>
            <Bot className="size-3.5 text-white" aria-hidden />
            <Eye className="absolute -bottom-1 -right-1 size-3.5 rounded-full bg-white p-0.5 text-black" aria-label={c.botScout} />
          </span>
        )}
        {players.map((p) => (
          <span key={p.seat} className={cn("relative", p.status !== "in" && "opacity-40")} title={p.name}>
            <DuelAvatar customization={p.avatar} size="xs" />
            {p.scout && <Eye className="absolute -bottom-1 -right-1 size-3.5 rounded-full bg-white p-0.5 text-black" aria-label={c.scout} />}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The refusals a player can act on (a clue to change); late taps the server refused stay quiet. */
const CLUE_ERRORS = new Set(["used", "blocked", "empty", "words", "long", "board"]);

const MAX_CLUE = 30;
const MAX_WORDS = 4;

/** Any football clue the Scout types; names from our list are suggested while typing. */
function ClueForm({ c, locale, disabled, used, boardWords, marked, onClear, onGive }: {
  c: CodenamesCopy; locale: string; disabled: boolean; used: string[];
  /** Word boards: the words still showing, which a clue may not use. Picture boards suggest football names instead. */
  boardWords?: string[];
  /** Own cards the Scout marked on the board: the clue's number follows them. */
  marked: number;
  onClear: () => void;
  onGive: (word: string, count: number) => void;
}) {
  const [draft, setDraft] = useState("");
  const [picked, setCount] = useState(2);
  const count = marked > 0 ? marked : picked;
  const [tried, setTried] = useState(false);
  // The suggestion highlighted with the arrow keys, for the draft it was highlighted in; Escape closes the list.
  const [active, setActive] = useState<{ draft: string; index: number } | null>(null);
  const [closedFor, setClosedFor] = useState<string | null>(null);
  const listId = useId();
  const text = draft.trim().replace(/\s+/g, " ");
  const known = boardWords ? undefined : knownName(text, locale);
  const isUsed = (word: string) => used.includes(foldClue(word));
  const shown = boardWords || known || closedFor === draft ? [] : suggestNames(draft, locale);
  const onBoard = boardWords && text ? clueOnBoard(text, boardWords) : null;
  const activeIndex = active?.draft === draft && active.index < shown.length ? active.index : -1;
  const choose = (label: string) => { if (!isUsed(label)) setDraft(label); };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && shown.length > 0) { e.preventDefault(); setClosedFor(draft); return; }
    if (shown.length === 0 || (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter")) return;
    if (e.key === "Enter") {
      if (activeIndex < 0) return;
      e.preventDefault();
      choose(shown[activeIndex].label);
      return;
    }
    e.preventDefault();
    const step = e.key === "ArrowDown" ? 1 : -1;
    setActive({ draft, index: (activeIndex + step + shown.length) % shown.length });
  };
  // Characters as the server counts them (code points: an emoji is one).
  const problem = !text ? "empty" : isUsed(text) ? "used" : onBoard ? "board" : [...text].length > MAX_CLUE ? "long" : text.split(" ").length > MAX_WORDS ? "words" : null;
  const submit = () => {
    setTried(true);
    if (problem || disabled) return;
    // The form goes away once the clue is taken; a refused clue keeps its text to fix.
    onGive(known?.label ?? text, count);
    setTried(false);
  };
  return (
    <form data-codenames-clue-form className="sticky bottom-0 mt-3 space-y-2 bg-surface-page-alt/95 pb-1 pt-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      {shown.length > 0 && (
        <ul id={listId} role="listbox" aria-label={c.cluePlaceholder} className="max-h-56 overflow-y-auto rounded-2xl bg-surface-card p-1 shadow-2xl shadow-black/40">
          {shown.map((n, i) => (
            <li key={n.id} id={`${listId}-${i}`} role="option" aria-selected={i === activeIndex} aria-disabled={isUsed(n.label)} onPointerDown={(e) => e.preventDefault()} onClick={() => choose(n.label)}
              className={cn("flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm", isUsed(n.label) ? "cursor-not-allowed text-white/35" : "cursor-pointer text-white/90 hover:bg-white/10", i === activeIndex && "bg-white/15")}>
              <span className={cn("min-w-0 truncate font-semibold", isUsed(n.label) && "line-through")}>{n.label}</span>
              <span className="shrink-0 text-xs text-white/60">{isUsed(n.label) ? c.clueUsed : c.nameKinds[n.kind]}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input value={draft} onChange={(e) => setDraft(e.target.value.slice(0, MAX_CLUE + 10))} disabled={disabled} placeholder={boardWords ? c.words.placeholder : c.cluePlaceholder} aria-label={boardWords ? c.words.placeholder : c.cluePlaceholder}
            role="combobox" aria-expanded={shown.length > 0} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            onKeyDown={onKeyDown} autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="send"
            className={cn("font-poppins h-14 w-full rounded-[20px] border-none px-5 text-center text-base font-semibold uppercase tracking-[0.06em] text-white outline-none placeholder:text-[13px] placeholder:normal-case placeholder:tracking-normal placeholder:text-white/55 disabled:opacity-50",
              known ? "bg-brand-green pb-3 text-black" : "bg-brand-blue")} />
          {known && <span className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[10px] font-black uppercase text-black/60">{c.nameKinds[known.kind]}</span>}
        </div>
        <div className="flex h-14 shrink-0 items-center gap-1 rounded-[20px] bg-white/10 px-1.5" role="group" aria-label={c.number}>
          <button type="button" onClick={() => setCount((n) => Math.max(1, n - 1))} disabled={marked > 0} aria-label="−" className="flex size-10 items-center justify-center rounded-full enabled:hover:bg-white/10 disabled:opacity-30"><Minus className="size-4" /></button>
          <span className="w-6 text-center text-xl font-black tabular-nums" style={poppins}>{count}</span>
          <button type="button" onClick={() => setCount((n) => Math.min(9, n + 1))} disabled={marked > 0} aria-label="+" className="flex size-10 items-center justify-center rounded-full enabled:hover:bg-white/10 disabled:opacity-30"><Plus className="size-4" /></button>
        </div>
      </div>
      <p className="text-center text-xs text-white/55">{boardWords ? c.words.rule : c.clueRule}</p>
      {marked > 0 ? (
        <p data-codenames-marks className="flex items-center justify-center gap-2 text-xs font-bold text-white/80">
          <Check className="size-3.5" aria-hidden />{c.meant.marked(marked, count)}
          <button type="button" onClick={onClear} className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-black uppercase hover:bg-white/15">{c.meant.clear}</button>
        </p>
      ) : <p className="text-center text-xs text-white/55">{c.meant.mark}</p>}
      {/* A board word is flagged while typing: it is the rule players forget. */}
      {(tried || problem === "board") && problem && <p role="alert" className="text-center text-sm font-semibold text-brand-red-light">{problem === "used" ? c.clueUsed : problem === "board" ? c.words.onBoard(onBoard!) : c.clueProblems[problem]}</p>}
      <GreenButton onClick={submit} disabled={disabled}>{c.giveClue}</GreenButton>
    </form>
  );
}

/** A card the recap names: its word, or a small picture. Ringed when the team found it on that clue. */
function MeantCard({ card, found, alt }: { card: CodenamesRoomView["cards"][number] | undefined; found: boolean; alt: string }) {
  if (!card) return null;
  return card.word ? (
    <span className={cn("flex h-7 items-center rounded-md bg-white px-1.5 text-[11px] font-black uppercase leading-none text-black", found ? "ring-2 ring-brand-green" : "opacity-60")} style={poppins}>{card.word}</span>
  ) : (
    <span className={cn("relative size-10 shrink-0 overflow-hidden rounded-md bg-white", found ? "ring-2 ring-brand-green" : "opacity-60")}>
      <Image src={cardArt(card.id)} alt={alt} fill sizes="40px" className="object-cover" />
      {found && <span className="absolute bottom-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-brand-green"><Check className="size-3 text-black" strokeWidth={3.5} /></span>}
    </span>
  );
}

/** The clues so far; once the game is over (`recap`), each with the cards it was meant for. */
function History({ c, view, myTeam, recap = false, altOf }: { c: CodenamesCopy; view: CodenamesRoomView; myTeam: Team; recap?: boolean; altOf?: (id: string) => string | undefined }) {
  if (view.history.length === 0) return null;
  const cardOf = new Map(view.cards.map((card) => [card.id, card]));
  return (
    <div className="mt-4">
      <p className="text-xs font-black uppercase tracking-wide text-white/55">{recap ? c.meant.title : c.history}</p>
      <ul className="mt-2 space-y-1.5">
        {view.history.map((t, i) => (
          <li key={i} data-codenames-turn={i} className={cn("rounded-2xl px-3 py-2 text-sm", t.team === myTeam ? "bg-brand-green/10" : "bg-brand-blue/15")}>
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-black uppercase" style={poppins}>
                {t.clue ? `${t.clue.word} · ${t.clue.count}` : t.timeout ? <span className="inline-flex items-center gap-1"><Timer className="size-3.5" aria-hidden />{c.timer.timeUp}</span> : c.passed}
              </span>
              <span className="flex gap-1" aria-hidden>
                {t.flips.map((k, j) => {
                  const kind = kindFor(k, myTeam);
                  return <span key={j} className={cn("size-3 rounded-sm", kind === "mine" ? "bg-brand-green" : kind === "theirs" ? "bg-brand-blue" : kind === "neutral" ? "bg-brand-slate-light" : "bg-brand-red")} />;
                })}
              </span>
            </div>
            {recap && t.clue && (
              t.meant && t.meant.length > 0 ? (
                <div data-codenames-meant className="mt-2 flex flex-wrap gap-1.5">
                  {t.meant.map((id) => <MeantCard key={id} card={cardOf.get(id)} found={t.flipped?.includes(id) ?? false} alt={altOf?.(id) ?? ""} />)}
                </div>
              ) : <p className="mt-1 text-xs text-white/50">{c.meant.none}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The turn timer: the phase's seconds left, red for the last ten. */
function TurnClock({ c, seconds }: { c: CodenamesCopy; seconds: number }) {
  const m = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <span data-codenames-clock role="timer" aria-label={c.timer.secondsLeft(seconds)}
      className={cn("flex h-11 shrink-0 items-center gap-1.5 rounded-2xl px-3 text-lg font-black tabular-nums", seconds <= 10 ? "animate-pulse bg-brand-red text-white" : "bg-white/10 text-white")} style={poppins}>
      <Timer className="size-4" aria-hidden />{m}:{ss}
    </span>
  );
}

export function CodenamesTeams({ view, locale, error, onSend, onExit, onBoard }: {
  view: CodenamesRoomView; locale: string; error?: string | null; onSend: (cmd: CodenamesCommand) => void; onExit: () => void;
  /** Playground only: the board switch on this screen (a live room picks its board in the lobby, before the deal). */
  onBoard?: (board: BoardKind) => void;
}) {
  const c = codenamesCopy(locale);
  const mine = me(view);
  const host = view.mySeat === view.host;
  const wordBoard = view.board === "words";
  const botNeeded = ([0, 1] as const).some((t) => !view.players.some((p) => p.team === t && p.scout) || view.players.filter((p) => p.team === t).length < 2);
  // At kick-off whoever has no side joins the smaller team: only a room where everyone picked the same side cannot start.
  const here = view.players.filter((p) => p.status !== "withdrawn");
  const oneSided = here.every((p) => p.team !== null) && new Set(here.map((p) => p.team)).size < 2;
  const unseated = view.players.filter((p) => p.team === null);
  const name = (p: RoomPlayer) => (p.seat === view.mySeat ? `${p.name} ★` : p.name);
  const column = (t: Team) => {
    const tone = mine.team === null ? "none" : mine.team === t ? "mine" : "rival";
    const scout = view.players.find((p) => p.team === t && p.scout);
    const guessers = view.players.filter((p) => p.team === t && !p.scout);
    const imScout = mine.team === t && mine.scout;
    const imGuesser = mine.team === t && !mine.scout;
    return (
      <div key={t} data-codenames-team-column={t === 0 ? "home" : "away"}
        className={cn("rounded-3xl p-3", tone === "mine" ? "bg-brand-green/10 ring-2 ring-brand-green/60" : tone === "rival" ? "bg-brand-blue/15 ring-2 ring-brand-blue/50" : "bg-white/[0.05] ring-1 ring-white/15")}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-black uppercase" style={poppins}>{t === 0 ? c.home : c.away}{tone === "mine" && <span className="ml-2 text-brand-green">· {c.yourTeam}</span>}</p>
          <span className="text-[11px] font-bold text-white/60">{view.starting === t ? (wordBoard ? c.words.starts : c.starts) : wordBoard ? c.words.otherCards : c.otherCards}</span>
        </div>
        <p className="mt-3 flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-white/55"><Eye className="size-3" />{c.scout}</p>
        <div className="mt-1 flex items-center gap-2 rounded-2xl bg-black/20 px-2 py-1.5">
          {scout ? (<><DuelAvatar customization={scout.avatar} size="xs" /><span className="min-w-0 flex-1 truncate text-sm font-bold">{name(scout)}</span></>)
            : <span className="flex-1 py-1.5 pl-1 text-sm font-semibold text-white/45">{c.noScout}</span>}
          {!imScout && (
            <button type="button" onClick={() => onSend({ type: "join", team: t, scout: true })}
              className="h-8 shrink-0 rounded-full bg-white px-3 text-[11px] font-black uppercase text-black hover:bg-white/85">{c.joinScout}</button>
          )}
        </div>
        <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-white/55">{c.guessers}</p>
        <ul className="mt-1 space-y-1.5">
          {guessers.map((p) => (
            <li key={p.seat} className="flex items-center gap-2 rounded-2xl bg-black/20 px-2 py-1.5">
              <DuelAvatar customization={p.avatar} size="xs" />
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{name(p)}</span>
            </li>
          ))}
        </ul>
        {!imGuesser && (
          <button type="button" onClick={() => onSend({ type: "join", team: t, scout: false })}
            className="mt-2 h-10 w-full rounded-full bg-white/10 text-xs font-black uppercase tracking-wide hover:bg-white/15">{c.joinGuesser}</button>
        )}
      </div>
    );
  };
  return (
    <Frame lang={locale} wide>
      <TopBar brand={c.brand} exitLabel={c.leave} onExit={onExit} wrap />
      <h1 className="mt-5 text-2xl font-black uppercase" style={poppins}>{c.teamsTitle}</h1>
      <p className="mt-1 text-sm text-white/70">{c.teamsNote}</p>
      {onBoard && (
        <div className="mt-4">
          <p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-white/55">{c.board.label}</p>
          <BoardPicker locale={locale} value={view.board ?? "pictures"} onChange={host ? onBoard : undefined} />
          {!host && <p className="mt-1.5 text-xs text-white/55">{c.board.hostPicks}</p>}
        </div>
      )}
      {unseated.length > 0 && (
        <div data-codenames-unseated className="mt-4 rounded-2xl border border-dashed border-white/20 px-3 py-2">
          <p className="text-[11px] font-black uppercase tracking-wide text-white/55">{c.noTeam}</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {unseated.map((p) => (
              <span key={p.seat} className="flex items-center gap-1.5 rounded-full bg-white/10 py-0.5 pl-0.5 pr-3 text-sm font-bold">
                <DuelAvatar customization={p.avatar} size="xs" />{name(p)}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{column(0)}{column(1)}</div>
      <div className="flex-1" />
      {oneSided ? <p className="mt-4 text-center text-sm font-semibold text-brand-yellow">{c.needBothTeams}</p>
        : botNeeded && <p className="mt-4 text-center text-sm font-semibold text-white/70"><Bot className="mr-1 inline size-4" aria-hidden />{c.botScoutNote}</p>}
      {error && <p role="alert" className="mt-2 text-center text-sm font-semibold text-brand-red-light">{error === "need_teams" ? c.needBothTeams : c.tryAgain}</p>}
      {host && <QuietButton className="mt-3" onClick={() => onSend({ type: "shuffle" })}><Shuffle className="mr-1.5 inline size-4" />{c.shuffle}</QuietButton>}
      {host ? <GreenButton className="mt-3" disabled={oneSided} onClick={() => onSend({ type: "kickoff" })}>{c.kickOff}</GreenButton>
        : <p className="mt-3 text-center text-sm text-white/60">{c.waitingHost}</p>}
    </Frame>
  );
}

export function CodenamesGame({ view, locale, busy, sending = false, error, onSend, onExit, finale = false, secondsLeft = null }: {
  view: CodenamesRoomView; locale: string; busy: boolean; error?: string | null; onSend: (cmd: CodenamesCommand) => void; onExit: () => void;
  /** The turn timer's seconds left in this phase (null: no clock). */
  secondsLeft?: number | null;
  /** A command of this screen is on its way (the clue form waits for it). */
  sending?: boolean;
  /** The game just ended on this board: no controls, the Own Goal goes off. */
  finale?: boolean;
}) {
  const c = codenamesCopy(locale);
  const altOf = useCardAlt(locale);
  // The card picked for confirmation, in the turn it was picked: a new turn starts with nothing picked.
  const [picked, setPicked] = useState<{ turn: number; id: string } | null>(null);
  const selected = picked?.turn === view.turnNo ? picked.id : null;
  const setSelected = (id: string | null) => setPicked(id === null ? null : { turn: view.turnNo, id });
  // The Scout's marks for the clue being written, in the turn they were made.
  const [marks, setMarks] = useState<{ turn: number; ids: string[] }>({ turn: -1, ids: [] });
  const marked = marks.turn === view.turnNo ? marks.ids : [];
  const toggleMark = (id: string) => setMarks({ turn: view.turnNo, ids: marked.includes(id) ? marked.filter((x) => x !== id) : marked.length >= 9 ? marked : [...marked, id] });
  const self = me(view);
  const myTeam = myTeamOf(view);
  const myTurn = view.turn === myTeam;
  const scoutName = (t: Team) => (view.botScout[t] ? c.botScout : view.players.find((p) => p.team === t && p.scout)?.name ?? "—");
  const canGuess = !finale && view.phase === "guess" && myTurn && !self.scout && !self.sawKey && !busy;
  const flipCount = view.history.reduce((n, t) => n + t.flips.length, 0);
  const flippedThisTurn = view.phase === "guess" && (view.history.at(-1)?.flips.length ?? 0) > 0;
  const lastTurn = view.history.findLast((t) => t.flips.length > 0);
  const lastKey = lastTurn?.flips.at(-1);
  useFlipSounds(flipCount, lastKey ? kindFor(lastKey, myTeam) : null, lastTurn?.team === myTeam);
  const wordBoard = view.board === "words";
  const cards: BoardCard[] = view.cards.map((card) => ({
    id: card.id,
    word: card.word,
    kind: card.key ? kindFor(card.key, myTeam) : null,
    revealed: card.revealed ? kindFor(card.revealed, myTeam) : null,
    picks: card.picks.filter((s) => s !== view.mySeat).flatMap((s) => view.players.find((p) => p.seat === s)?.avatar ?? []),
  }));
  const writingClue = !finale && view.phase === "clue" && myTurn && self.scout;
  const tap = (id: string) => {
    if (writingClue) { toggleMark(id); return; }
    if (selected !== id) {
      setSelected(id);
      onSend({ type: "pick", cardId: id });
      return;
    }
    setSelected(null);
    onSend({ type: "flip", cardId: id });
  };
  const banner = (() => {
    if (view.phase === "clue") {
      if (myTurn && self.scout) {
        return (
          <div className="rounded-2xl bg-brand-green px-4 py-2.5 text-black">
            <p className="flex items-center gap-1.5 text-sm font-black uppercase" style={poppins}><Eye className="size-4" />{c.youAreScout}</p>
            <p className="mt-0.5 text-xs font-semibold text-black/75">{wordBoard ? c.words.scoutKeyNote : c.scoutKeyNote}</p>
          </div>
        );
      }
      return (
        <div className={cn("rounded-2xl px-4 py-3", myTurn ? "bg-brand-green/15" : "bg-white/[0.06]")}>
          <p className="text-sm font-bold text-white/85">{myTurn ? c.yourScoutThinking(scoutName(view.turn)) : c.rivalScoutThinking(scoutName(view.turn))}</p>
        </div>
      );
    }
    if (!view.clue) return null;
    return (
      <ClueBanner word={view.clue.word} count={view.clue.count} tone={myTurn ? "you" : "rival"}
        top={myTurn ? c.yourTurn : c.rivalGuessing}
        bottom={view.guessesLeft !== null && c.guessesLeft(view.guessesLeft)} />
    );
  })();
  return (
    <Frame lang={locale} wide>
      <TopBar brand={c.brand} exitLabel={c.leave} onExit={onExit} wrap />
      <div className="mt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
        <div className="flex min-w-0 flex-col">
          <div className="flex gap-2 lg:hidden">
            <TeamPill c={c} label={c.yourTeam} players={view.players.filter((p) => p.team === myTeam)} left={cardsLeft(view, myTeam)} mine active={myTurn} bot={view.botScout[myTeam]} />
            <TeamPill c={c} label={c.rivalTeam} players={view.players.filter((p) => p.team !== myTeam)} left={cardsLeft(view, other(myTeam))} mine={false} active={!myTurn} bot={view.botScout[other(myTeam)]} />
          </div>
          <div className="mt-3 flex items-stretch gap-2 lg:mt-0">
            <div className="min-w-0 flex-1">{banner}</div>
            {secondsLeft !== null && !finale && <TurnClock c={c} seconds={secondsLeft} />}
          </div>
          {error && CLUE_ERRORS.has(error) && <p role="alert" className="mt-2 text-center text-sm font-semibold text-brand-red-light">{error === "used" ? c.clueUsed : error === "blocked" ? c.clueBlocked : error === "board" ? c.words.onBoardAny : c.clueProblems[error as "empty" | "words" | "long"]}</p>}
          <CodenamesBoard className="mt-3" cards={cards} mode={self.scout && !finale ? "scout" : "guess"} selected={selected} marked={writingClue ? marked : undefined} disabled={writingClue ? busy || sending : !canGuess} kinds={c.kinds} flipLabel={c.flip} cardLabel={c.cardLabel} altOf={altOf} onTap={tap} finale={finale} />
          {writingClue && <ClueForm key={view.turnNo} c={c} locale={locale} disabled={busy || sending} used={view.used} boardWords={wordBoard ? view.cards.filter((x) => !x.revealed && x.word).map((x) => x.word!) : undefined}
            marked={marked.length} onClear={() => setMarks({ turn: view.turnNo, ids: [] })}
            onGive={(word, count) => onSend({ type: "clue", word, count, ...(marked.length > 0 ? { cardIds: marked } : {}) })} />}
          {self.sawKey && !self.scout && view.phase !== "over" && <p className="mt-3 text-center text-xs text-white/60">{c.sawKeyNote}</p>}
          {canGuess && flippedThisTurn && <QuietButton className="mt-3" onClick={() => { setSelected(null); onSend({ type: "endTurn" }); }}>{c.endTurn}</QuietButton>}
          <div className="lg:hidden"><History c={c} view={view} myTeam={myTeam} /></div>
        </div>
        <aside className="hidden lg:block">
          <div className="space-y-2">
            <TeamPill c={c} label={c.yourTeam} players={view.players.filter((p) => p.team === myTeam)} left={cardsLeft(view, myTeam)} mine active={myTurn} bot={view.botScout[myTeam]} />
            <TeamPill c={c} label={c.rivalTeam} players={view.players.filter((p) => p.team !== myTeam)} left={cardsLeft(view, other(myTeam))} mine={false} active={!myTurn} bot={view.botScout[other(myTeam)]} />
          </div>
          <History c={c} view={view} myTeam={myTeam} />
        </aside>
      </div>
    </Frame>
  );
}

export function CodenamesResult({ view, locale, onRoom, onExit }: { view: CodenamesRoomView; locale: string; onRoom: () => void; onExit: () => void }) {
  const c = codenamesCopy(locale);
  const altOf = useCardAlt(locale);
  const myTeam = myTeamOf(view);
  const r = view.result!;
  const won = r.winner === myTeam;
  const reason = r.reason === "cleared" ? c.cleared : r.reason === "left" ? (won ? c.rivalLeft : c.yourTeamLeft) : c.ownGoalBy(r.winner !== myTeam);
  const cards: BoardCard[] = view.cards.map((card) => ({ id: card.id, word: card.word, kind: card.key ? kindFor(card.key, myTeam) : null, revealed: card.revealed ? kindFor(card.revealed, myTeam) : null }));
  return (
    <Frame lang={locale} wide>
      <TopBar brand={c.brand} exitLabel={c.leave} onExit={onExit} wrap />
      <div className="mt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
        <div>
          <div data-codenames-result={won ? "win" : "lose"} className={cn("rounded-3xl px-5 py-4 text-center", won ? "bg-brand-green text-black" : "bg-brand-blue text-white")}>
            <p className="text-3xl font-black uppercase" style={poppins}>{won ? c.youWon : c.youLost}</p>
            <p className="mt-1 text-sm font-bold opacity-80">{reason}</p>
            <p data-codenames-cards-left className="mt-2 text-sm font-black tabular-nums" style={poppins}>
              <span className="block text-[11px] font-bold opacity-75">{c.cardsLeftTitle}</span>
              <span className="whitespace-nowrap">{c.yourTeam}: {cardsLeft(view, myTeam)}</span> · <span className="whitespace-nowrap">{c.rivalTeam}: {cardsLeft(view, other(myTeam))}</span>
            </p>
          </div>
          <CodenamesBoard className="mt-3" cards={cards} mode="end" kinds={c.kinds} cardLabel={c.cardLabel} altOf={altOf} />
        </div>
        <aside>
          <History c={c} view={view} myTeam={myTeam} recap altOf={altOf} />
          <GreenButton className="mt-5" onClick={onRoom}>{c.backToRoom}</GreenButton>
          <QuietButton className="mt-3" onClick={onExit}>{c.leave}</QuietButton>
        </aside>
      </div>
    </Frame>
  );
}
