import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const counts = vi.hoisted(() => ({ gate: 0, page: 0 }));
vi.mock("@/components/auth/AppAuthGate", () => ({
  default: function PersistentGate({ children }: { children: React.ReactNode }) {
    const [draft, setDraft] = useState("");
    useEffect(() => { counts.gate++; }, []);
    return <><input aria-label="auth draft" value={draft} onChange={event => setDraft(event.target.value)} />{children}</>;
  },
}));
vi.mock("@/components/layout/AppShell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="default-shell">{children}</div> }));
vi.mock("@/components/layout/WordAppShellEntry", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="word-shell">{children}</div> }));

import HubGateLayout from "@/app/[locale]/(hub)/layout";
import DefaultShellLayout from "@/app/[locale]/(hub)/(default-shell)/layout";
import WordShellLayout from "@/app/[locale]/(hub)/(word-shell)/layout";

function Page({ name }: { name: string }) {
  useEffect(() => { counts.page++; }, []);
  return <main>{name}</main>;
}
beforeEach(() => { counts.gate = 0; counts.page = 0; });

describe("word bundle separation retains the existing parent gate", () => {
  it("does not reset a sign-in draft or mount a second gate across shell-group changes", () => {
    const view = render(<HubGateLayout><DefaultShellLayout><Page name="hub" /></DefaultShellLayout></HubGateLayout>);
    fireEvent.change(screen.getByRole("textbox", { name: "auth draft" }), { target: { value: "keep this draft" } });
    view.rerender(<HubGateLayout><WordShellLayout><Page name="word A" /></WordShellLayout></HubGateLayout>);
    expect(screen.getByRole("textbox")).toHaveValue("keep this draft"); expect(counts.gate).toBe(1);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    view.rerender(<HubGateLayout><DefaultShellLayout><Page name="hub again" /></DefaultShellLayout></HubGateLayout>);
    expect(screen.getByRole("textbox")).toHaveValue("keep this draft"); expect(counts.gate).toBe(1);
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("keeps a single shell/page instance between two word pages", () => {
    const view = render(<HubGateLayout><WordShellLayout><Page name="word A" /></WordShellLayout></HubGateLayout>);
    const shell = screen.getByTestId("word-shell");
    view.rerender(<HubGateLayout><WordShellLayout><Page name="word B" /></WordShellLayout></HubGateLayout>);
    expect(screen.getByTestId("word-shell")).toBe(shell); expect(counts.gate).toBe(1); expect(counts.page).toBe(1);
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });
});
