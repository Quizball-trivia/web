import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StoreScreen } from "../StoreScreen";

// Regression for the 2026-09-19 player report: an OWNED kit's equip modal was
// gated by the wallet (balance below the kit's live price → disabled "Need
// more"), so players could not switch to kits they had bought.
const mocks = vi.hoisted(() => ({
  wallet: { coins: 2_890 },
  updateMe: vi.fn(async (body: Record<string, unknown>) => ({ ...body })),
  purchaseStoreWithCoins: vi.fn(),
  createStoreCheckout: vi.fn(),
  setAuthenticated: vi.fn(),
  updateStats: vi.fn(),
}));

const product = (slug: string, priceCents: number) => ({
  id: slug, slug, type: "avatar" as const, name: {}, description: {}, priceCents, currency: "coins", metadata: {}, displayAmount: priceCents,
});

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
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/store",
}));
// eslint-disable-next-line @next/next/no-img-element -- test stub for next/image
vi.mock("next/image", () => ({ default: ({ src, alt }: { src: unknown; alt?: string }) => <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} /> }));
vi.mock("@/lib/api/endpoints", () => ({ updateMe: (...args: unknown[]) => mocks.updateMe(...(args as [Record<string, unknown>])) }));
vi.mock("@/lib/repositories/store.repo", () => ({
  purchaseStoreWithCoins: (...args: unknown[]) => mocks.purchaseStoreWithCoins(...args),
  createStoreCheckout: (...args: unknown[]) => mocks.createStoreCheckout(...args),
}));
vi.mock("@/lib/auth/devUnlimited", () => ({ isUnlimitedDevEmail: () => false }));
vi.mock("@/contexts/PlayerContext", () => ({
  usePlayer: () => ({ player: { avatarCustomization: null }, updateStats: mocks.updateStats }),
}));
vi.mock("@/lib/analytics/game-events", () => ({ trackAvatarPartEquipped: vi.fn(), trackItemPurchased: vi.fn(), trackPurchaseCancelled: vi.fn(), trackPurchaseModalOpened: vi.fn(), trackStoreViewed: vi.fn(),  }));
vi.mock("@/lib/queries/store.queries", () => ({
  useStoreProducts: () => ({ data: { items: [product("avatar_jersey_real", 5_000), product("avatar_jersey_barcelona", 5_000)] } }),
  useStoreWallet: () => ({ data: mocks.wallet }),
  useStoreInventory: () => ({ data: { items: [{ inventoryId: "i1", productId: "avatar_jersey_real", slug: "avatar_jersey_real", type: "avatar", name: {}, description: {}, metadata: {}, quantity: 1, acquiredAt: "2026-06-09" }] } }),
}));
vi.mock("@/stores/auth.store", () => {
  const state = {
    user: { id: "u1", email: "player@example.com", avatar_customization: { skin: "skin_male_white", jersey: "jersey_green" } },
    setAuthenticated: mocks.setAuthenticated,
  };
  return { useAuthStore: (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state) };
});

function renderStore() {
  return render(<QueryClientProvider client={new QueryClient()}><StoreScreen /></QueryClientProvider>);
}

/** The card whose title is `name` — free kits also render an Owned pill, so scope by card. */
function cardFor(name: string): HTMLElement {
  let el: HTMLElement | null = screen.getByText(name).parentElement;
  while (el && !within(el).queryByRole("button", { name: /store\.owned|—/ })) el = el.parentElement;
  if (!el) throw new Error(`no card for ${name}`);
  return el;
}

describe("StoreScreen: owned kit with a wallet below its price", () => {
  it("offers an enabled Equip (never 'Need more') and equips without purchasing", async () => {
    renderStore();
    fireEvent.click(within(cardFor("Real Madrid")).getByRole("button", { name: "store.owned" }));

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

  it("still blocks buying an UNOWNED kit priced above the wallet", () => {
    renderStore();
    fireEvent.click(within(cardFor("Barcelona")).getByRole("button", { name: /—/ }));

    expect(screen.queryByRole("button", { name: "store.equip" })).toBeNull();
    expect(screen.getByRole("button", { name: "store.needMoreCoins" })).toBeDisabled();
  });
});
