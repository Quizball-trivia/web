import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PurchaseConfirmModal } from "../PurchaseConfirmModal";

// Locale: echo keys so assertions are stable across translations.
vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

// motion/react's AnimatePresence/motion.div render fine in jsdom, but strip
// them anyway so tests don't depend on animation timing.
vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get: () => (props: Record<string, unknown> & { children?: React.ReactNode }) => {
        const { children, initial, animate, exit, transition, whileHover, whileTap, ...rest } = props;
        void initial; void animate; void exit; void transition; void whileHover; void whileTap;
        return <div {...rest}>{children}</div>;
      },
    },
  ),
}));

function renderModal(overrides: Partial<Parameters<typeof PurchaseConfirmModal>[0]> = {}) {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  render(
    <PurchaseConfirmModal
      open
      onClose={onClose}
      onConfirm={onConfirm}
      name="PSG"
      price="50,000"
      priceInCoins
      {...overrides}
    />,
  );
  return { onClose, onConfirm };
}

describe("PurchaseConfirmModal", () => {
  it("shows a confirm button that triggers the purchase when affordable", () => {
    const { onConfirm } = renderModal({ affordable: true });
    const confirm = screen.getByRole("button", { name: "profile.purchase.confirm" });
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("replaces confirm with a disabled 'Need more' button when unaffordable", () => {
    const { onConfirm } = renderModal({ affordable: false });
    expect(screen.queryByRole("button", { name: "profile.purchase.confirm" })).toBeNull();
    const needMore = screen.getByRole("button", { name: "store.needMoreCoins" });
    expect(needMore).toBeDisabled();
    fireEvent.click(needMore);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("still allows closing an unaffordable preview via the X button", () => {
    const { onClose } = renderModal({ affordable: false });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("blocks closing while a purchase is pending", () => {
    const { onClose } = renderModal({ isPending: true });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders the coin icon only for coin prices", () => {
    renderModal({ priceInCoins: true });
    expect(screen.getByText("50,000")).toBeInTheDocument();
    expect(document.querySelector('img[src="/assets/store/coin_handful.webp"]')).not.toBeNull();
  });

  it("omits the coin icon for fiat prices", () => {
    renderModal({ priceInCoins: false, price: "$9.99" });
    expect(screen.getByText("$9.99")).toBeInTheDocument();
    expect(document.querySelector('img[src="/assets/store/coin_handful.webp"]')).toBeNull();
  });

  it("uses the equip label override when provided", () => {
    renderModal({ confirmLabel: "store.equip", price: "" });
    expect(screen.getByRole("button", { name: "store.equip" })).toBeInTheDocument();
  });

  it("hides the price row in the equip flow (empty price)", () => {
    renderModal({ price: "" });
    expect(screen.queryByText("profile.purchase.price")).toBeNull();
  });
});
