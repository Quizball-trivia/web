import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GoalCard, GoalPicture } from "../MinutoCard";
import type { MinutoGoalCard } from "../minuto.logic";

const name = (value: string) => ({ es: value, en: value, ka: value, tr: value });
const goal: MinutoGoalCard = {
  id: "g20221218-0000000000", tier: "easy", comp: "FIWC", year: 2022, date: "2022-12-18", stage: "final", group: null, leg: null,
  home: { kind: "club", crest: "crests/home.webp", name: name("Home Club") },
  away: { kind: "club", crest: "crests/away.webp", name: name("Away Club") },
  score: [3, 3], aet: true, pens: [4, 2], side: "home", penalty: true, scoreAfter: [2, 1],
  scorer: { name: name("First Scorer"), photo: "faces/first.webp" },
  image: { src: "minuto/photos/first.webp", credit: "First Photographer/Getty Images", license: "Rights-managed" },
};

describe("Minuto goal images across rounds", () => {
  it("a failed goal photo falls back, but the next goal loads its own photo", () => {
    const { rerender } = render(<GoalPicture goal={goal} locale="es" />);
    fireEvent.error(screen.getByRole("img", { name: "First Scorer" }));
    expect(screen.queryByRole("figure")).toBeNull();
    expect(screen.getByRole("img", { name: "First Scorer" }).getAttribute("src")).toContain("faces/first.webp");
    const next = { ...goal, scorer: { ...goal.scorer, name: name("Next Scorer") }, image: { ...goal.image!, src: "minuto/photos/next.webp" } };
    rerender(<GoalPicture goal={next} locale="es" />);
    expect(screen.getByRole("figure")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Next Scorer" }).getAttribute("src")).toContain("minuto/photos/next.webp");
  });

  it("a failed fallback face does not hide the next scorer's face", () => {
    const { rerender } = render(<GoalPicture goal={{ ...goal, image: null }} locale="es" />);
    fireEvent.error(screen.getByRole("img", { name: "First Scorer" }));
    expect(screen.queryByRole("img", { name: "First Scorer" })).toBeNull();
    const next = { ...goal, image: null, scorer: { name: name("Next Scorer"), photo: "faces/next.webp" } };
    rerender(<GoalPicture goal={next} locale="es" />);
    expect(screen.getByRole("img", { name: "Next Scorer" }).getAttribute("src")).toContain("faces/next.webp");
  });

  it("a failed team crest does not hide a different team's crest in the next round", () => {
    const { container, rerender } = render(<GoalCard goal={goal} locale="es" minute={null} />);
    const homeCrest = container.querySelector('img[src*="crests/home.webp"]')!;
    fireEvent.error(homeCrest);
    expect(homeCrest.isConnected).toBe(false);
    rerender(<GoalCard goal={{ ...goal, home: { kind: "club", crest: "crests/next-home.webp", name: name("Next Club") } }} locale="es" minute={null} />);
    expect(container.querySelector('img[src*="crests/next-home.webp"]')).toBeTruthy();
  });
});
