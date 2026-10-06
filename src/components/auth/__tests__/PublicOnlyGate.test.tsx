import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ replace: vi.fn(), pathname: "/auth/welcome", state: { status: "authenticated", user: { id: "u1" }, bootstrap: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }), usePathname: () => mocks.pathname }));
vi.mock("@/stores/auth.store", () => ({ useAuthStore: (pick: (s: typeof mocks.state) => unknown) => pick(mocks.state) }));
vi.mock("@/lib/auth/postAuthRedirect", () => ({ getPostAuthEntryRoute: () => "/friend/room/ABC123" }));
vi.mock("@/features/auth/AccountBannedScreen", () => ({ AccountBannedScreen: () => null }));

import PublicOnlyGate from "../PublicOnlyGate";

describe("PublicOnlyGate", () => {
  beforeEach(() => mocks.replace.mockClear());

  it("sends a signed-in visitor of a public auth page into the app", () => {
    mocks.pathname = "/auth/welcome";
    render(<PublicOnlyGate><p>page</p></PublicOnlyGate>);
    expect(mocks.replace).toHaveBeenCalledWith("/friend/room/ABC123");
  });

  it("leaves navigation to the OAuth callback (which already consumed the return path)", () => {
    mocks.pathname = "/auth/callback";
    const { getByText } = render(<PublicOnlyGate><p>callback</p></PublicOnlyGate>);
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(getByText("callback")).toBeTruthy();
  });
});
