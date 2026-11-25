import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/wordgames/daily/WordDailyShell", () => ({ DailyEnd: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

import { CategoryCard, D501EndView } from "../D501Solo";
import { d501Copy, d501UnitLabel } from "../d501.copy";
import type { D501Category, D501SoloState } from "../d501.view";

const LABELS = {
  en: "Market value in €m", es: "Valor de mercado en M€", pt: "Valor de mercado em milhões de euros", de: "Marktwert in Mio. €", fr: "Valeur marchande en M€",
  tr: "Piyasa değeri (milyon €)", ka: "საბაზრო ღირებულება (მლნ €)", ru: "Рыночная стоимость (млн €)", el: "Αγοραία αξία (εκατ. €)",
} as const;
const card = (unit: string, over: Partial<D501Category> = {}): D501Category => ({ title: "Invented League top values", unit, asOf: "1 Jun 2026", note: null, kind: "player", release: "fixture", ...over });
const hintLine = () => screen.getByText((_, el) => el?.tagName === "P" && el.className.includes("font-semibold"));

describe("the category card names a non-count unit", () => {
  it.each(Object.entries(LABELS))("shows the market-value label in %s", (locale, label) => {
    expect(d501UnitLabel("market_value_eur_m", locale)).toBe(label);
    render(<CategoryCard locale={locale} category={card("market_value_eur_m")} />);
    expect(hintLine().textContent).toBe(`${d501Copy(locale).maxHint} · ${label} · ${d501Copy(locale).asOf("1 Jun 2026")}`);
  });

  it("keeps the label when a note replaces the date, and when there is no date", () => {
    const { unmount } = render(<CategoryCard locale="en" category={card("market_value_eur_m", { note: "Invented source note" })} />);
    expect(hintLine().textContent).toBe("Max 180 a dart · Market value in €m");
    expect(screen.getByText("Invented source note")).toBeTruthy();
    unmount();
    render(<CategoryCard locale="en" category={card("market_value_eur_m", { asOf: null })} />);
    expect(hintLine().textContent).toBe("Max 180 a dart · Market value in €m");
  });

  it("count units keep the line exactly as before", () => {
    for (const unit of ["apps", "goals", "assists", "caps", "apps_minus_goals"]) expect(d501UnitLabel(unit, "en")).toBeNull();
    render(<CategoryCard locale="en" category={card("apps")} />);
    expect(hintLine().textContent).toBe("Max 180 a dart · As of 1 Jun 2026");
  });
});

describe("the result screen keeps the unit beside the title", () => {
  const ended = (unit: string): D501SoloState => ({
    day: "2026-12-01", category: card(unit, { title: "Invented League peaks" }), remaining: 120, darts: [], maxDarts: 10, status: "done",
    endReason: "darts", last: null, ranked: false, finishes: [{ name: "Aro Bandel", stat: 120 }],
  });
  const view = (unit: string) => render(<D501EndView locale="en" number={1} state={ended(unit)} guestOnPastBoard={false} leaderboard={null} onArchive={() => {}} />);
  it("market value", () => {
    view("market_value_eur_m");
    expect(screen.getByText("Invented League peaks · Market value in €m")).toBeTruthy();
    expect(screen.getByText("Aro Bandel")).toBeTruthy();
  });
  it("counts stay as they were", () => {
    view("apps");
    expect(screen.getByText("Invented League peaks")).toBeTruthy();
  });
});
