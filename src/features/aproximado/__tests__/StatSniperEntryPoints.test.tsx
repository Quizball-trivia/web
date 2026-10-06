import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const config = vi.hoisted(() => ({ ROOM_GAMES_ENABLED: ["aproximado"] as string[], GUEST_LOBBIES_ENABLED: true }));
const auth = vi.hoisted(() => ({ status: "anonymous" }));
vi.mock("@/lib/config", () => config);
vi.mock("@/stores/auth.store", () => ({ useAuthStore: (pick: (s: { status: string }) => unknown) => pick(auth) }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "es", t: (k: string) => k }) }));
vi.mock("@/features/demos/DemoModeArt", () => ({ DemoModeArt: () => <span /> }));
vi.mock("@/utils/storage", () => ({ storage: { set: vi.fn() }, STORAGE_KEYS: { LOCALE: "quizball_locale" } }));

import { PlayRoomWithFriendsButton } from "../PlayRoomWithFriendsButton";
import { StatSniperModeModal } from "../StatSniperModeModal";

describe("Stat Sniper: play with friends entry points", () => {
  beforeEach(() => { config.ROOM_GAMES_ENABLED = ["aproximado"]; config.GUEST_LOBBIES_ENABLED = true; auth.status = "anonymous"; });

  it("the button links to a new room in this game, guests included", () => {
    render(<PlayRoomWithFriendsButton locale="es" showHint />);
    const link = screen.getByRole("link", { name: /jugar con amigos/i });
    expect(link.getAttribute("href")).toBe("/friend/room/new?room=aproximado");
    expect(link.getAttribute("aria-describedby")).toBe(screen.getByText(/sala privada/i).id);
  });

  it("the button hides when room games are off, or for guests without guest lobbies", () => {
    config.ROOM_GAMES_ENABLED = [];
    const { unmount } = render(<PlayRoomWithFriendsButton locale="es" />);
    expect(screen.queryByRole("link")).toBeNull();
    unmount();
    config.ROOM_GAMES_ENABLED = ["aproximado"];
    config.GUEST_LOBBIES_ENABLED = false;
    const second = render(<PlayRoomWithFriendsButton locale="es" />);
    expect(screen.queryByRole("link")).toBeNull();
    second.unmount();
    auth.status = "authenticated";
    render(<PlayRoomWithFriendsButton locale="es" />);
    expect(screen.getByRole("link")).toBeTruthy();
  });

  it("carousel dialog: today's daily or friends, plus the rules", () => {
    const onPlaySolo = vi.fn();
    const onPlayWithFriends = vi.fn();
    render(<StatSniperModeModal isOpen onOpenChange={vi.fn()} completed={false} unlockLabel="5h" onPlaySolo={onPlaySolo} onPlayWithFriends={onPlayWithFriends} />);
    fireEvent.click(screen.getByRole("button", { name: /jugar el reto de hoy/i }));
    fireEvent.click(screen.getByRole("button", { name: /jugar con amigos/i }));
    expect(onPlaySolo).toHaveBeenCalledOnce();
    expect(onPlayWithFriends).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: /cómo se juega/i }));
    expect(screen.getByRole("dialog", { name: /cómo se juega/i }).textContent).toContain("Gana quien más puntos");
  });

  it("carousel dialog after today's daily: no solo button, when it unlocks, friends still open", () => {
    const onPlayWithFriends = vi.fn();
    render(<StatSniperModeModal isOpen onOpenChange={vi.fn()} completed unlockLabel="12h 50m" onPlaySolo={vi.fn()} onPlayWithFriends={onPlayWithFriends} />);
    expect(screen.queryByRole("button", { name: /jugar el reto de hoy/i })).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("12h 50m");
    fireEvent.click(screen.getByRole("button", { name: /jugar con amigos/i }));
    expect(onPlayWithFriends).toHaveBeenCalledOnce();
  });

  it("closing the dialog puts focus back on what opened it (the carousel card is not a Radix trigger)", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>card</button>
          <StatSniperModeModal isOpen={open} onOpenChange={setOpen} completed={false} unlockLabel="" onPlaySolo={vi.fn()} onPlayWithFriends={vi.fn()} />
        </>
      );
    }
    render(<Harness />);
    const card = screen.getByRole("button", { name: "card" });
    card.focus();
    fireEvent.click(card);
    const dialog = await screen.findByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(card));
  });
});
