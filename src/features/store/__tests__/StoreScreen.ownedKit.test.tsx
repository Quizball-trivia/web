import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StoreScreen } from "../StoreScreen";

// Regression for the 2026-09-19 player report: an OWNED kit's equip modal was
// gated by the wallet (balance below the kit's live price → disabled "Need
// more"), so players could not switch to kits they had bought.
const mocks = vi.hoisted(() => ({
  wallet: { coins: 2_890, tickets: 3 } as { coins: number; tickets?: number },
  updateMe: vi.fn(async (body: Record<string, unknown>) => ({ ...body })),
  purchaseStoreWithCoins: vi.fn(),
  createStoreCheckout: vi.fn(),
  setAuthenticated: vi.fn(),
  updateStats: vi.fn(),
  searchParams: new URLSearchParams(),
  showTickets: true,
  customization: { skin: "skin_male_white", jersey: "jersey_green" } as Record<string, string>,
}));

const product = (slug: string, priceCents: number) => ({
  id: slug, slug, type: "avatar" as const, name: {}, description: {}, priceCents, currency: "coins", metadata: {}, displayAmount: priceCents,
});
const ticketPack = (tickets: number, priceCents: number) => ({
  id: `ticket_pack_${tickets}`, slug: `ticket_pack_${tickets}`, type: "ticket_pack" as const, name: {}, description: {}, priceCents, currency: "coins", metadata: { tickets }, displayAmount: priceCents,
});

vi.mock("@/lib/tickets", () => ({ get STORE_SELLS_TICKETS() { return mocks.showTickets; } }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "en", setLocale: vi.fn(), t: (key: string) => key }) }));
vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, {
    get: () => (props: Record<string, unknown> & { children?: React.ReactNode }) => {
      const { children, initial, animate, exit, transition, whileHover, whileTap, ...rest } = props;
      void initial; void animate; void exit; void transition; void whileHover; void whileTap;
      return <div {...rest}>{children}</div>;
    },
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => mocks.searchParams,
  usePathname: () => "/store",
}));
// eslint-disable-next-line @next/next/no-img-element -- test stub for next/image
vi.mock("next/image", () => ({ default: ({ src, alt }: { src: unknown; alt?: string }) => <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} /> }));
vi.mock("@/lib/api/endpoints", () => ({ updateMe: (...args: unknown[]) => mocks.updateMe(...(args as [Record<string, unknown>])) }));
vi.mock("@/lib/repositories/store.repo", () => ({
  purchaseStoreWithCoins: (...args: unknown[]) => mocks.purchaseStoreWithCoins(...args),
  createStoreCheckout: (...args: unknown[]) => mocks.createStoreCheckout(...args),
}));
vi.mock("@/hooks/useMobile", () => ({ useIsMobile: () => false }));
vi.mock("@/lib/auth/devUnlimited", () => ({ isUnlimitedDevEmail: () => false }));
vi.mock("@/contexts/PlayerContext", () => ({
  usePlayer: () => ({ player: { avatarCustomization: null }, updateStats: mocks.updateStats }),
}));
vi.mock("@/lib/analytics/game-events", () => ({ trackAvatarPartEquipped: vi.fn(), trackItemPurchased: vi.fn(), trackPurchaseCancelled: vi.fn(), trackPurchaseModalOpened: vi.fn(), trackStoreViewed: vi.fn(),  }));
vi.mock("@/lib/queries/store.queries", () => ({
  useStoreProducts: () => ({ data: { items: [
    product("avatar_jersey_real", 5_000), product("avatar_jersey_barcelona", 5_000),
    ticketPack(1, 2_000), ticketPack(3, 4_000), ticketPack(5, 5_000),
  ] } }),
  useStoreWallet: () => ({ data: mocks.wallet }),
  useStoreInventory: () => ({ data: { items: [{ inventoryId: "i1", productId: "avatar_jersey_real", slug: "avatar_jersey_real", type: "avatar", name: {}, description: {}, metadata: {}, quantity: 1, acquiredAt: "2026-06-09" }] } }),
}));
vi.mock("@/stores/auth.store", () => {
  const state = {
    get user() { return { id: "u1", email: "player@example.com", avatar_customization: mocks.customization }; },
    setAuthenticated: mocks.setAuthenticated,
  };
  return { useAuthStore: (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state) };
});

function renderStore() {
  return render(<QueryClientProvider client={new QueryClient()}><StoreScreen /></QueryClientProvider>);
}

/** The card whose title is `name` — free kits also render an Equip button, so scope by card. */
function cardFor(name: string): HTMLElement {
  let el: HTMLElement | null = screen.getByText(name).parentElement;
  while (el && !within(el).queryByRole("button", { name: /store\.equip|—/ }) && !within(el).queryByText("store.equippedBadge")) el = el.parentElement;
  if (!el) throw new Error(`no card for ${name}`);
  return el;
}

describe("StoreScreen: owned kit with a wallet below its price", () => {
  it("offers an enabled Equip (never 'Need more') and equips without purchasing", async () => {
    renderStore();
    fireEvent.click(within(cardFor("Real Madrid")).getByRole("button", { name: "Real Madrid — store.equip" }));

    expect(screen.queryByRole("button", { name: "store.needMoreCoins" })).toBeNull();
    const equip = screen.getByRole("button", { name: "store.equip" });
    expect(equip).toBeEnabled();

    fireEvent.click(equip);
    await waitFor(() => expect(mocks.updateMe).toHaveBeenCalledWith(
      expect.objectContaining({ avatar_customization: expect.objectContaining({ jersey: "jersey_real" }) }),
    ));
    expect(mocks.purchaseStoreWithCoins).not.toHaveBeenCalled();
    expect(mocks.createStoreCheckout).not.toHaveBeenCalled();
  });

  it("never offers to buy an UNOWNED kit priced above the wallet; points to earning instead", () => {
    renderStore();
    fireEvent.click(within(cardFor("Barcelona")).getByRole("button", { name: /—/ }));

    expect(screen.queryByRole("button", { name: "store.equip" })).toBeNull();
    expect(screen.queryByRole("button", { name: "profile.purchase.confirm" })).toBeNull();
    expect(screen.getByText("store.needMoreAmount")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "store.howToEarnCoins" })).toBeEnabled();
    expect(mocks.purchaseStoreWithCoins).not.toHaveBeenCalled();
  });

  it("marks the kit being worn as Equipped instead of offering Equip", () => {
    mocks.customization = { skin: "skin_male_white", jersey: "jersey_real" };
    renderStore();
    const card = cardFor("Real Madrid");
    expect(within(card).getByText("store.equippedBadge")).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /store\.equip/ })).toBeNull();
    mocks.customization = { skin: "skin_male_white", jersey: "jersey_green" };
  });
});

describe("StoreScreen: ticket packs", () => {
  const packButton = (count: number) =>
    screen.getAllByRole("button").find((b) => b.closest("div")?.textContent?.includes(`${count} store.ticket`)) ?? null;

  it("says how many fit instead of 'Full' when the wallet has room", () => {
    mocks.wallet = { coins: 10_000, tickets: 3 };
    renderStore();
    // 3/5 tickets → 2 slots: the 1-pack is buyable, the 3- and 5-packs say "room for", never "Full".
    expect(screen.queryByText("store.full")).toBeNull();
    expect(screen.getAllByText("store.roomFor")).toHaveLength(2);
    expect(packButton(1)).toBeEnabled();
  });

  it("says 'Full' only at the cap", () => {
    mocks.wallet = { coins: 10_000, tickets: 5 };
    renderStore();
    expect(screen.getAllByText("store.full")).toHaveLength(3);
    expect(screen.queryByText("store.roomFor")).toBeNull();
  });

  it("flags the cheapest-per-ticket pack as best value", () => {
    mocks.wallet = { coins: 10_000, tickets: 0 };
    renderStore();
    expect(screen.getAllByText("store.bestValue")).toHaveLength(1);
  });
});

describe("StoreScreen: section order", () => {
  it("lists kits straight after tickets, ahead of the smaller cosmetics", () => {
    renderStore();
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    const at = (key: string) => titles.indexOf(key);

    expect(at("store.ticketsTitle")).toBeGreaterThanOrEqual(0);
    expect(at("store.hairTitle")).toBeGreaterThanOrEqual(0);
    expect(at("store.jerseysTitle")).toBe(at("store.ticketsTitle") + 1);
    expect(at("store.jerseysTitle")).toBeLessThan(at("store.hairTitle"));
  });
});

describe("StoreScreen: filters", () => {
  it("'Can afford' keeps the ticket packs the player can buy", () => {
    mocks.wallet = { coins: 10_000, tickets: 0 };
    renderStore();
    fireEvent.click(screen.getByRole("button", { name: "store.canAfford" }));
    expect(screen.getByRole("heading", { name: "store.ticketsTitle" })).toBeInTheDocument();
    expect(screen.queryByText("store.noResults")).toBeNull();
  });

  it("follows ?tab= on same-route navigation", () => {
    mocks.wallet = { coins: 10_000, tickets: 0 };
    mocks.searchParams = new URLSearchParams("tab=tickets");
    const { rerender } = renderStore();
    expect(screen.queryByRole("heading", { name: "store.jerseysTitle" })).toBeNull();

    // e.g. the navbar coin pill links to plain /store
    mocks.searchParams = new URLSearchParams();
    rerender(<QueryClientProvider client={new QueryClient()}><StoreScreen /></QueryClientProvider>);
    expect(screen.getByRole("heading", { name: "store.jerseysTitle" })).toBeInTheDocument();
  });
});

describe("StoreScreen: tickets switched off (free Ranked 2.0)", () => {
  beforeEach(() => {
    mocks.showTickets = false;
    mocks.searchParams = new URLSearchParams();
  });
  afterEach(() => {
    mocks.showTickets = true;
    mocks.searchParams = new URLSearchParams();
  });

  it("shows no ticket balance, category or packs", () => {
    renderStore();
    expect(screen.queryByText("store.ticketsTitle")).not.toBeInTheDocument();
    expect(screen.queryByText("3/5")).not.toBeInTheDocument();
    expect(screen.queryByText("store.bestValue")).not.toBeInTheDocument();
  });

  it("treats an old ?tab=tickets link as the whole store", () => {
    mocks.searchParams = new URLSearchParams("tab=tickets");
    renderStore();
    expect(screen.getByRole("button", { name: "store.categoryAll" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("store.ticketsTitle")).not.toBeInTheDocument();
  });

  it("leaves tickets out of how-to-earn", () => {
    renderStore();
    fireEvent.click(screen.getByRole("button", { name: /store\.howToEarn/ }));
    expect(screen.queryByText("store.earnTicketsDesc")).not.toBeInTheDocument();
    expect(screen.queryByText("store.earnTitle")).not.toBeInTheDocument();
    expect(screen.getAllByText("store.howToEarnCoins").length).toBeGreaterThan(0);
  });
});

describe("StoreScreen: ticket refill", () => {
  it("re-reads the wallet just after the refill tick when below the cap", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
    try {
      vi.setSystemTime(new Date("2026-11-02T15:59:00Z")); // tick at 16:00 UTC
      mocks.wallet = { coins: 1_000, tickets: 2 };
      mocks.searchParams = new URLSearchParams();
      const client = new QueryClient();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      render(<QueryClientProvider client={client}><StoreScreen /></QueryClientProvider>);
      const walletCalls = () => invalidate.mock.calls.filter(([arg]) => JSON.stringify(arg).includes("wallet")).length;
      const before = walletCalls();
      // The minute tick lands exactly on 16:00, inside the cron-lag window; it
      // must not cancel the pending 16:00:15 refresh.
      act(() => { vi.advanceTimersByTime(60_000); });
      expect(walletCalls()).toBe(before);
      act(() => { vi.advanceTimersByTime(16_000); });
      expect(walletCalls()).toBeGreaterThan(before);
    } finally {
      vi.useRealTimers();
    }
  });
});
