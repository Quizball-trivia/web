import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PartyStandingViewModel } from "@/features/party/realtime/partyQuizScreen.types";

vi.mock("@/components/AvatarDisplay", () => ({ AvatarDisplay: () => <span /> }));
vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({ locale: "es", t: (k: string, p?: Record<string, string>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));

import { PartyStandingsPill } from "../PartyStandingsPill";
import { PARTY_SUCCESS_FLIGHT_MS } from "@/features/party/realtime/partyQuizScreen.helpers";

const row = (userId: string, rank: number, totalPoints: number, extra: Partial<PartyStandingViewModel> = {}): PartyStandingViewModel => ({
  userId, username: `Player ${userId}`, avatarUrl: null, rank, totalPoints, answered: false, status: "active",
  isLeader: rank === 1, isSelf: false, rankShift: 0, roundDelta: null, ...extra,
});

describe("PartyStandingsPill", () => {
  it("shows my place and score, the gap to first and the leader; tapping opens everyone", () => {
    render(<PartyStandingsPill standings={[row("a", 1, 13), row("b", 2, 9, { isSelf: true, roundDelta: 2 }), row("c", 3, 4)]} />);
    expect(screen.getByText('partyResults.behindLeader:{"gap":"4"}')).toBeTruthy();
    expect(screen.getByText("+2")).toBeTruthy();
    const anchors = [...document.querySelectorAll<HTMLElement>("[data-party-score-anchor]")].map((el) => el.dataset.partyScoreAnchor);
    expect(anchors).toEqual(["b", "a"]);
    expect(screen.queryByText("Player c")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "partyResults.seeAllStandings" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Player c")).toBeTruthy();
  });

  it("review 2026-10-06 W8: the sheet's close control is a full-size touch target (44 px), the thin handle only drawn inside it", () => {
    render(<PartyStandingsPill standings={[row("a", 1, 13), row("b", 2, 9, { isSelf: true })]} />);
    fireEvent.click(screen.getByRole("button", { name: "partyResults.seeAllStandings" }));
    const close = screen.getByRole("button", { name: "partyResults.hideStandings" });
    expect(close.className).toMatch(/\bh-11\b/);
    expect(close.className).toMatch(/\bw-full\b|\bw-11\b/);
    expect(close.className).not.toMatch(/\bh-1\.5\b/);
  });

  it("says so when I lead (also when tied for first), with no leader on the right", () => {
    render(<PartyStandingsPill standings={[row("a", 1, 13, { isSelf: true }), row("b", 1, 13)]} />);
    expect(screen.getByText("partyResults.leading")).toBeTruthy();
    expect(document.querySelectorAll("[data-party-score-anchor]").length).toBe(1);
  });

  it("equal points at a lower rank is not leading: the leader stays on the right", () => {
    render(<PartyStandingsPill standings={[row("a", 1, 9), row("b", 2, 9, { isSelf: true })]} />);
    expect(screen.queryByText("partyResults.leading")).toBeNull();
    expect(screen.getByText('partyResults.behindLeader:{"gap":"0"}')).toBeTruthy();
  });

  it("the sheet labels dropped players (their own label, else the default)", () => {
    render(<PartyStandingsPill standings={[row("a", 1, 13, { isSelf: true }), row("b", 2, 9, { status: "dropped", statusLabel: "Desconectado" }), row("c", 3, 2, { status: "dropped" })]} />);
    fireEvent.click(screen.getByRole("button", { name: "partyResults.seeAllStandings" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Desconectado");
    expect(dialog.textContent).toContain("partyResults.dropped");
  });

  it("overtaking: the text says so at once, the old leader's avatar stays until the flights have landed", () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<PartyStandingsPill standings={[row("a", 1, 13), row("b", 2, 9, { isSelf: true })]} />);
      rerender(<PartyStandingsPill standings={[row("b", 1, 15, { isSelf: true }), row("a", 2, 13)]} />);
      expect(screen.getByText("partyResults.leading")).toBeTruthy();
      expect(document.querySelector('[data-party-score-anchor="a"]')).not.toBeNull();
      act(() => { vi.advanceTimersByTime(PARTY_SUCCESS_FLIGHT_MS + 200); });
      expect(document.querySelector('[data-party-score-anchor="a"]')).toBeNull();
    } finally { vi.useRealTimers(); }
  });

  it("a new leader: the gap is to the current first place at once, while the old leader's avatar waits", () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<PartyStandingsPill standings={[row("a", 1, 13), row("b", 2, 11), row("me", 3, 9, { isSelf: true })]} />);
      rerender(<PartyStandingsPill standings={[row("b", 1, 15), row("a", 2, 13), row("me", 3, 9, { isSelf: true })]} />);
      expect(screen.getByText(/partyResults.behindLeader/).textContent).toContain('"gap":"6"');
      expect(document.querySelector('[data-party-score-anchor="a"]')).not.toBeNull();
      act(() => { vi.advanceTimersByTime(PARTY_SUCCESS_FLIGHT_MS + 200); });
      expect(document.querySelector('[data-party-score-anchor="b"]')).not.toBeNull();
    } finally { vi.useRealTimers(); }
  });

  it("staggered flights: the old leader's avatar stays while a flight is still heading for it", () => {
    vi.useFakeTimers();
    try {
      const before = [row("a", 1, 13), row("b", 2, 11), row("me", 3, 9, { isSelf: true })];
      const after = [row("b", 1, 15), row("a", 2, 13), row("me", 3, 9, { isSelf: true })];
      const { rerender } = render(<PartyStandingsPill standings={before} />);
      rerender(<PartyStandingsPill standings={after} />);
      act(() => { vi.advanceTimersByTime(600); });
      rerender(<PartyStandingsPill standings={after} flyingTo={["a"]} />);
      act(() => { vi.advanceTimersByTime(PARTY_SUCCESS_FLIGHT_MS + 200); });
      expect(document.querySelector('[data-party-score-anchor="a"]')).not.toBeNull();
      rerender(<PartyStandingsPill standings={after} flyingTo={[]} />);
      act(() => { vi.advanceTimersByTime(PARTY_SUCCESS_FLIGHT_MS + 200); });
      expect(document.querySelector('[data-party-score-anchor="a"]')).toBeNull();
      expect(document.querySelector('[data-party-score-anchor="b"]')).not.toBeNull();
    } finally { vi.useRealTimers(); }
  });

  it("closes the sheet when the screen becomes wide (the sidebar takes over)", () => {
    const listeners: ((e: { matches: boolean }) => void)[] = [];
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener: (_: string, l: (e: { matches: boolean }) => void) => listeners.push(l), removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
    try {
      render(<PartyStandingsPill standings={[row("a", 1, 13), row("b", 2, 9, { isSelf: true })]} />);
      fireEvent.click(screen.getByRole("button", { name: "partyResults.seeAllStandings" }));
      expect(screen.getByRole("dialog")).toBeTruthy();
      act(() => { listeners.forEach((l) => l({ matches: true })); });
      expect(screen.queryByRole("dialog")).toBeNull();
    } finally { window.matchMedia = original; }
  });

  it("the sheet is a modal: Escape closes it and focus returns to the bar", async () => {
    render(<PartyStandingsPill standings={[row("a", 1, 13), row("b", 2, 9, { isSelf: true })]} />);
    const bar = screen.getByRole("button", { name: "partyResults.seeAllStandings" });
    fireEvent.click(bar);
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(bar));
  });
});

