import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

function Wrapper({ children }: { children: ReactNode }) { return <>{children}</>; }
vi.mock("next-themes", () => ({
  ThemeProvider: ({ children, nonce }: { children: ReactNode; nonce?: string }) => <div data-testid="theme" data-nonce={nonce}>{children}</div>,
}));
vi.mock("@/contexts/PlayerContext", () => ({ PlayerProvider: Wrapper }));
vi.mock("@/contexts/LocaleContext", () => ({ LocaleProvider: Wrapper }));
vi.mock("@/contexts/CspNonceContext", () => ({ CspNonceProvider: Wrapper }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@/components/PostHogProvider", () => ({ PostHogPageView: () => null }));
vi.mock("@/components/auth/AuthSessionBridge", () => ({ AuthSessionBridge: () => null }));
vi.mock("@tanstack/react-query-devtools", () => ({ ReactQueryDevtools: () => null }));

import { Providers } from "../providers";

describe("Providers CSP", () => {
  it("passes the request nonce to the theme script without changing the child tree", () => {
    render(<Providers cspNonce="test-request-nonce"><p>page content</p></Providers>);
    expect(screen.getByTestId("theme")).toHaveAttribute("data-nonce", "test-request-nonce");
    expect(screen.getByText("page content")).toBeInTheDocument();
  });
});
