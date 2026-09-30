import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); }, useRouter: () => ({ replace: vi.fn() }) }));

const { generateMetadata } = await import("../page");

const meta = (code: string) => generateMetadata({ params: Promise.resolve({ code }) });

describe("shared result page (/r/[code])", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-05T15:00:00Z")); });
  afterEach(() => { vi.useRealTimers(); });

  it("resolves an Último ue- code to its own card and the public page opened on the shared day", async () => {
    const metadata = await meta("ue-2-40-cgsnc-es");
    expect(metadata.title).toBe("Último en pie futbolero #2: 40 pts");
    expect(String(metadata.alternates?.canonical)).toMatch(/\/es\/juegos-de-futbol\/ultimo-en-pie-futbolero$/);
    expect(metadata.robots).toEqual({ index: false, follow: true });
    const image = (metadata.openGraph?.images as Array<{ url: string }>)[0];
    expect(image.url).toContain("/api/og/ultimo?c=ue-2-40-cgsnc-es");
  });

  it("uses the English public page for English codes", async () => {
    const metadata = await meta("ue-1-12-ssnnn-en");
    expect(metadata.title).toBe("Last Answer Standing #1: 12 pts");
    expect(String(metadata.alternates?.canonical)).toMatch(/\/en\/football-games\/last-answer-standing$/);
  });

  it("sends the visitor to the shared day, not the newest board", async () => {
    const { default: SharedResultPage } = await import("../page");
    const element = await SharedResultPage({ params: Promise.resolve({ code: "ue-2-40-cgsnc-es" }) });
    expect(element.props.href).toBe("/es/juegos-de-futbol/ultimo-en-pie-futbolero?utm_source=share&utm_medium=ultimo&dia=2026-09-29");
  });

  it("rejects an Último code whose score the tiles cannot produce, and unknown codes", async () => {
    await expect(meta("ue-2-999-cgsnc-es")).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(meta("ue-99-40-cgsnc-es")).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(meta("zz-1-2-3")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("keeps Pistas and Buscaminas codes on their own cards", async () => {
    const pistas = await meta("pf-2-45-gggyyyoorr-es");
    expect(String(pistas.alternates?.canonical)).toContain("pistas-futboleras");
    expect((pistas.openGraph?.images as Array<{ url: string }>)[0].url).toContain("/api/og/pistas?");
  });
});
