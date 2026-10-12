import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SeoProviders } from "../seo-providers";

const mocks = vi.hoisted(() => ({ pathname: "/en/football-quiz" }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("@/components/PostHogProvider", () => ({ PostHogPageView: () => null }));

describe("SeoProviders", () => {
  it("declares the address's language after a client navigation from the app left another one", async () => {
    document.documentElement.lang = "ka";
    const view = render(<SeoProviders><p>quiz</p></SeoProviders>);
    await waitFor(() => expect(document.documentElement.lang).toBe("en"));
    mocks.pathname = "/es/quiz-de-futbol";
    view.rerender(<SeoProviders><p>quiz</p></SeoProviders>);
    await waitFor(() => expect(document.documentElement.lang).toBe("es"));
  });
});
