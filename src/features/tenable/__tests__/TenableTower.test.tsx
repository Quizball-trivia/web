import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TenableTower } from "../TenableTower";
import type { TenableSlot } from "../tenable.view";

// Invented names only (the repository is public).
const LONG = "Tarinho Bakovelli de Orlenhausen Santos";
const slots: TenableSlot[] = [
  { rank: 1, name: "Tarin Bako", detail: null, by: 0 },
  { rank: 2, name: LONG, detail: null, by: null, missed: true },
];
const list = { title: "Invented list", asOf: null };

describe("TenableTower result rows", () => {
  it("wraps long names and tells screen readers which slots were found and which were missed", () => {
    render(<TenableTower list={list} slots={slots} fresh={null} hiddenLabel="The full list" asOfLabel={(d) => d} compact wrapNames stateLabels={{ found: "Found", missed: "Missed" }} />);
    const name = screen.getByText(LONG);
    expect(name.className).not.toContain("truncate");
    expect(name.className).toContain("break-words");
    expect(name.closest("li")?.className).not.toMatch(/(^|\s)h-9(\s|$)/);
    const found = document.querySelector('[data-tenable-slot="1"]');
    const missed = document.querySelector('[data-tenable-slot="2"]');
    expect(found?.querySelector(".sr-only")?.textContent).toBe("Found: ");
    expect(missed?.querySelector(".sr-only")?.textContent).toBe("Missed: ");
  });

  it("keeps the play tower's fixed rows, truncation and no extra labels by default", () => {
    render(<TenableTower list={list} slots={slots} fresh={null} hiddenLabel="Hidden list" asOfLabel={(d) => d} compact />);
    expect(screen.getByText(LONG).className).toContain("truncate");
    expect(document.querySelector(".sr-only")).toBeNull();
  });
});
