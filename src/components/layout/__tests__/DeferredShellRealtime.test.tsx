import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RealtimePrincipal } from "@/lib/realtime/realtime-principal";

const mocks = vi.hoisted(() => ({
  principal: { kind: "none", userId: null } as RealtimePrincipal,
  load: vi.fn(),
  connect: vi.fn(),
  mount: vi.fn(),
  unmount: vi.fn(),
}));

vi.mock("@/lib/realtime/realtime-principal", () => ({ useRealtimePrincipal: () => mocks.principal }));
vi.mock("@/lib/realtime/useRealtimeConnection", () => ({ useRealtimeConnection: (options: unknown) => mocks.connect(options) }));
vi.mock("next/dynamic", async () => {
  const React = await import("react");
  return {
    default: (loader: () => Promise<{ enabled: boolean; selfUserId: string | null }>) => {
      function Loaded(props: { enabled: boolean; selfUserId: string | null }) {
        React.useEffect(() => { mocks.mount(); return () => { mocks.unmount(); }; }, []);
        mocks.connect(props);
        return null;
      }
      return function Deferred(props: { enabled: boolean; selfUserId: string | null }) {
        React.useEffect(() => { mocks.load(loader); }, []);
        return <Loaded {...props} />;
      };
    },
  };
});

import { DeferredShellRealtime } from "../app-shell/DeferredShellRealtime";
import { ShellRealtime } from "../app-shell/ShellRealtime";

describe("deferred shell connection owner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.principal = { kind: "none", userId: null };
  });

  it("does not load connection handlers for an ordinary or unresolved guest", () => {
    const view = render(<DeferredShellRealtime />);
    view.rerender(<DeferredShellRealtime />);
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("activates for a member and preserves the disabled cleanup and account-switch paths", async () => {
    const view = render(<DeferredShellRealtime />);
    mocks.principal = { kind: "member", userId: "member-a" };
    view.rerender(<DeferredShellRealtime />);
    await waitFor(() => expect(mocks.connect).toHaveBeenLastCalledWith({ enabled: true, selfUserId: "member-a" }));
    expect(mocks.mount).toHaveBeenCalledTimes(1);
    mocks.principal = { kind: "none", userId: null };
    view.rerender(<DeferredShellRealtime />);
    expect(mocks.connect).toHaveBeenLastCalledWith({ enabled: false, selfUserId: null });
    expect(mocks.unmount).not.toHaveBeenCalled();
    mocks.principal = { kind: "member", userId: "member-b" };
    view.rerender(<DeferredShellRealtime />);
    expect(mocks.connect).toHaveBeenLastCalledWith({ enabled: true, selfUserId: "member-b" });
    expect(mocks.mount).toHaveBeenCalledTimes(1);
  });

  it("activates for a resolved lobby guest, then forwards the member identity without remounting", async () => {
    mocks.principal = { kind: "guest", userId: "guest-a", guest: { userId: "guest-a", token: "test-only", nickname: null, avatarCustomization: null } };
    const view = render(<DeferredShellRealtime />);
    await waitFor(() => expect(mocks.connect).toHaveBeenLastCalledWith({ enabled: true, selfUserId: "guest-a" }));
    mocks.principal = { kind: "member", userId: "member-a" };
    view.rerender(<DeferredShellRealtime />);
    expect(mocks.connect).toHaveBeenLastCalledWith({ enabled: true, selfUserId: "member-a" });
    expect(mocks.mount).toHaveBeenCalledTimes(1);
  });

  it("delegates to the unchanged connection hook", () => {
    render(<ShellRealtime enabled={false} selfUserId={null} />);
    expect(mocks.connect).toHaveBeenCalledWith({ enabled: false, selfUserId: null });
  });
});
