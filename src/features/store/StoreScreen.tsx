import { FeaturedBundleCard } from "./components/FeaturedBundleCard";
import { BundleCard, type BundleProps } from "./components/BundleCard";
import { ItemCard } from "./components/ItemCard";
import { PurchaseConfirmModal } from "./components/PurchaseConfirmModal";
import { CoinIcon } from "./components/CoinIcon";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/api";
import { createStoreCheckout, purchaseStoreWithCoins } from "@/lib/repositories/store.repo";
import { queryKeys } from "@/lib/queries/queryKeys";
import { useStoreProducts, useStoreWallet, useStoreInventory } from "@/lib/queries/store.queries";
import {
  trackItemPurchased,
  trackStoreViewed,
  trackPurchaseModalOpened,
  trackPurchaseCancelled,
  trackAvatarPartEquipped,
} from "@/lib/analytics/game-events";
import { useLocale } from "@/contexts/LocaleContext";
import { translatePartName as translateSharedPartName } from "@/lib/avatars/partNames";
import {
  HAIR_PARTS,
  GLASSES_PARTS,
  FACIAL_HAIR_PARTS,
  JERSEY_DESIGN_PARTS,
  ALL_AVATAR_PARTS,
  SKIN_PARTS,
  type AvatarPart,
} from "@/lib/avatars/parts";
import {
  customizationFromAvatarValue,
} from "@/lib/avatars";
import { useAuthStore } from "@/stores/auth.store";
import { isUnlimitedDevEmail } from "@/lib/auth/devUnlimited";
import { usePlayer } from "@/contexts/PlayerContext";
import { updateMe } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import type { AvatarCustomization } from "@/types/game";

const STRIPE_PURCHASES_ENABLED = false;

function formatUsd(priceCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100);
}

/** Compact "Xh Ym" / "Ym" string for a ticket-purchase cooldown countdown. */
function formatRemaining(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "<1m";
}

/** Live wallet ticket cap — mirrors backend MAX_TICKETS (economy v3). */
const TICKET_CAP = 5;
/** Daily purchase allowance in TICKETS per rolling 24h — mirrors backend
 * TICKET_PURCHASE_MAX_TICKETS_PER_WINDOW. Used only as a fallback when the
 * wallet response predates ticketsRemainingInWindow. */
const TICKET_PURCHASE_DAILY_CAP = 5;

interface TicketPackItem {
  id: string;
  title: string;
  description: string;
  price: string;
  /** Numeric coin cost (ticket packs store the coin amount in priceCents). */
  priceCoinsValue: number;
  iconAsset: string;
  productSlug?: string;
  disabled?: boolean;
  /** Why the pack is disabled — drives both the button label and the tap toast. */
  disabledReason?: "full" | "cooldown";
  /** Button label shown when disabled by the daily limit, e.g. "Unlocks in 4h". */
  disabledLabel?: string;
  /** Number of tickets this pack grants — drives the stacked-icon visual. */
  ticketCount: number;
}

interface BuyModalState {
  name: string;
  price: string;
  productSlug?: string;
  mode: "stripe" | "coins" | "equip" | "none";
  /** When set, modal renders the avatar with this part equipped + persists equip on confirm. */
  avatarPart?: AvatarPart;
  /** Avatar customization to use for the preview (built from current user). */
  previewCustomization?: AvatarCustomization;
  /**
   * Numeric coin cost of the item. Affordability is derived from this at
   * render time (against the live wallet), so it stays correct if the wallet
   * refreshes while the modal is open. Leave unset for equip/stripe flows.
   */
  priceCoinsValue?: number;
  /** When true, the price is a coin amount — the modal shows a coin icon. */
  priceInCoins?: boolean;
}

const POPPINS_HEADER = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: "0",
  lineHeight: 1,
} as const;

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-[28px] sm:text-[32px] uppercase text-white" style={POPPINS_HEADER}>
        {title}
      </h3>
      {subtitle && (
        <p
          className="mt-1.5 text-[13px] sm:text-[15px] uppercase tracking-[0.04em] text-white/70"
          style={POPPINS_HEADER}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/**
 * Stack of ticket icons, fanned out and slightly rotated. The count drives how
 * many icons are visible (capped at 5 — beyond that they overlap too much to
 * read). The title on the card communicates the actual ticket count.
 */
function TicketStack({ count }: { count: number }) {
  const visible = Math.min(Math.max(count, 1), 5);
  return (
    <div className="relative h-[clamp(76px,22vw,120px)] w-[clamp(96px,30vw,150px)]">
      {Array.from({ length: visible }).map((_, i) => {
        const mid = (visible - 1) / 2;
        const angle = (i - mid) * 9;
        const offsetX = (i - mid) * 10;
        const offsetY = Math.abs(i - mid) * 3;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src="/assets/ticket_icon.webp"
            alt=""
            className="pointer-events-none absolute object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
            style={{
              left: "50%",
              top: "50%",
              width: "min(100px, 64%)",
              height: "auto",
              transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) rotate(${angle}deg)`,
              zIndex: i,
            }}
          />
        );
      })}
    </div>
  );
}

function TicketCard({ pack, onBuy }: { pack: TicketPackItem; onBuy: (b: TicketPackItem) => void }) {
  const { t } = useLocale();
  const ACCENT_PURPLE = "#BA02E8";
  const CARD_BG = "#0B1619";

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative flex flex-col"
    >
      <div
        className="relative flex min-h-[218px] flex-col rounded-[16px] border-[3px] aspect-[4/5] px-2.5 py-3 sm:min-h-[270px] sm:rounded-[20px] sm:px-5 sm:py-5"
        style={{ backgroundColor: CARD_BG, borderColor: ACCENT_PURPLE }}
      >
        {/* Top: title + subtitle (centered) */}
        <div className="text-center">
          <div
            className="truncate text-[11px] uppercase leading-none text-white sm:text-[16px]"
            style={POPPINS_HEADER}
          >
            {pack.title}
          </div>
          <div
            className="mt-1 text-[7px] uppercase tracking-[0.04em] text-white/50 leading-snug sm:mt-1.5 sm:text-[10px]"
            style={POPPINS_HEADER}
          >
            {pack.description}
          </div>
        </div>

        {/* Center icon image (ticket stack scales with pack size) */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center py-1.5 sm:py-2">
          <TicketStack count={pack.ticketCount} />
        </div>

        {/* Bottom: pill button — coin price + coin icon.
            Both "full" and "cooldown" (daily purchase limit) packs are
            hard-disabled and greyed out so the user can't trigger a purchase
            that the backend would reject. The button label explains the reason
            (and shows when the next purchase unlocks for cooldown). */}
        <button
          type="button"
          onClick={() => onBuy(pack)}
          disabled={pack.disabled}
          className={cn(
            "flex h-9 w-full items-center justify-center gap-1 rounded-[16px] uppercase text-white transition-transform active:translate-y-[2px] disabled:opacity-50 disabled:active:translate-y-0 disabled:cursor-not-allowed sm:h-[44px] sm:gap-2 sm:rounded-[20px]",
            pack.disabledReason === "cooldown" ? "text-[10px] sm:text-[14px]" : "text-[12px] sm:text-[18px]",
          )}
          style={{ ...POPPINS_HEADER, backgroundColor: ACCENT_PURPLE }}
        >
          <span className="tabular-nums">
            {pack.disabledReason === "full"
              ? t("store.full")
              : pack.disabledReason === "cooldown"
              ? pack.disabledLabel ?? t("store.ticketLimitReached")
              : pack.price}
          </span>
          {!pack.disabled && <CoinIcon size={22} />}
        </button>
      </div>
    </motion.div>
  );
}

// Map of static English part names → translation keys. Football-related
// proper nouns (Ramos, Real Madrid, Liverpool, etc.) intentionally stay
// untranslated since they're brand names.
export function StoreScreen() {
  const { t } = useLocale();
  const translatePartName = (name: string) => translateSharedPartName(name, t);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: productsData } = useStoreProducts();
  const { data: wallet } = useStoreWallet();
  const { data: inventoryData } = useStoreInventory();
  const authUser = useAuthStore((state) => state.user);
  // Dev-allowlist accounts: the backend skips every store economy limit for
  // them, so the UI mirrors that by treating items as always affordable and
  // ticket packs as never capped.
  const isUnlimited = useMemo(
    () => isUnlimitedDevEmail(authUser?.email),
    [authUser?.email],
  );
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const { player, updateStats } = usePlayer();
  const [buyModal, setBuyModal] = useState<BuyModalState | null>(null);
  // Ticks once a minute so the ticket-cooldown "Unlocks in Xh" label stays
  // current without a full wallet refetch.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  /** Currently saved customization (decoded from avatar_url). */
  const currentCustomization = useMemo<AvatarCustomization>(() => {
    return authUser?.avatar_customization ?? customizationFromAvatarValue(authUser?.avatar_url ?? player.avatarCustomization?.base);
  }, [authUser?.avatar_customization, authUser?.avatar_url, player.avatarCustomization?.base]);

  /** Set of part ids the user already owns (free defaults + purchased). */
  const ownedPartIds = useMemo(() => {
    const set = new Set<string>();
    for (const part of ALL_AVATAR_PARTS) {
      if (part.free) set.add(part.id);
    }
    for (const skin of SKIN_PARTS) {
      if (skin.free) set.add(skin.id);
    }
    for (const entry of inventoryData?.items ?? []) {
      const part = ALL_AVATAR_PARTS.find((p) => p.productSlug === entry.slug);
      if (part) set.add(part.id);
      const skin = SKIN_PARTS.find((s) => s.productSlug === entry.slug);
      if (skin) set.add(skin.id);
    }
    return set;
  }, [inventoryData]);

  /**
   * Coin affordability check. While the wallet is still loading we treat
   * everything as affordable (the backend re-validates on purchase) so items
   * don't flash "Need more" before the balance arrives.
   */
  const canAffordCoins = (priceCoins: number | undefined) =>
    isUnlimited || !priceCoins || wallet == null || wallet.coins >= priceCoins;

  const canAffordPart = (part: AvatarPart) => canAffordCoins(part.priceCoins);

  const productsBySlug = useMemo(() => {
    return new Map((productsData?.items ?? []).map((item) => [item.slug, item]));
  }, [productsData]);

  const featuredBundleSlug = useMemo(() => {
    if (productsBySlug.has("coin_pack_1200")) return "coin_pack_1200";
    if (productsBySlug.has("coin_pack_550")) return "coin_pack_550";
    const firstCoinPack = (productsData?.items ?? []).find((item) => item.type === "coin_pack");
    return firstCoinPack?.slug ?? null;
  }, [productsBySlug, productsData]);

  const checkoutMutation = useMutation({
    mutationFn: async (productSlug: string) => createStoreCheckout({ productSlug }),
    onSuccess: (result) => {
      window.location.href = result.url;
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        toast.error(t("store.sessionExpired"));
        return;
      }
      if (error instanceof ApiError && error.status === 400) {
        const errorCode =
          typeof error.data === "object" &&
          error.data !== null &&
          "code" in error.data &&
          typeof (error.data as { code?: unknown }).code === "string"
            ? (error.data as { code: string }).code
            : null;
        if (errorCode === "TICKETS_FULL") {
          toast.error(t("store.ticketsAlreadyFull"));
          return;
        }
      }
      toast.error(t("store.unableToStartCheckout"));
    },
  });

  const coinPurchaseMutation = useMutation({
    mutationFn: async (productSlug: string) => purchaseStoreWithCoins({ productSlug }),
    onSuccess: (_data, productSlug) => {
      const product = productsBySlug.get(productSlug);
      const productName = product?.name?.en ?? product?.slug ?? productSlug;
      trackItemPurchased(productSlug, productName, product?.priceCents ?? 0, 'coins');
      toast.success(t("store.purchaseCompleted"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.inventory() });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        toast.error(t("store.sessionExpired"));
        return;
      }
      if (error instanceof ApiError && error.status === 400) {
        const errorCode =
          typeof error.data === "object" &&
          error.data !== null &&
          "code" in error.data &&
          typeof (error.data as { code?: unknown }).code === "string"
            ? (error.data as { code: string }).code
            : null;
        if (errorCode === "TICKETS_FULL") {
          toast.error(t("store.ticketsAlreadyFull"));
          return;
        }
        if (errorCode === "TICKET_PURCHASE_COOLDOWN") {
          const remainingSeconds =
            typeof error.data === "object" &&
            error.data !== null &&
            "remainingSeconds" in error.data &&
            typeof (error.data as { remainingSeconds?: unknown }).remainingSeconds === "number"
              ? (error.data as { remainingSeconds: number }).remainingSeconds
              : null;
          toast.error(
            remainingSeconds != null
              ? t("store.ticketPurchaseLimitIn", { time: formatRemaining(remainingSeconds) })
              : t("store.ticketPurchaseLimit"),
          );
          return;
        }
        toast.error(t("store.notEnoughCoins"));
        return;
      }
      toast.error(t("store.purchaseFailed"));
    },
  });

  useEffect(() => {
    trackStoreViewed();
  }, []);

  useEffect(() => {
    const purchaseStatus = searchParams.get("purchase");
    if (!purchaseStatus) return;
    if (purchaseStatus === "success") {
      toast.success(t("store.purchaseCompleted"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.inventory() });
    }
    if (purchaseStatus === "cancelled") {
      toast.message(t("store.purchaseCancelled"));
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete("purchase");
    const cleaned = params.toString();
    router.replace(cleaned ? `?${cleaned}` : pathname, { scroll: false });
  }, [searchParams, pathname, queryClient, router]);

  const coinBundles = useMemo<BundleProps[]>(() => {
    const config: Array<{ id: string; title: string; amount: number; bonus?: number; isPopular?: boolean; slug: string; imageSrc: string }> = [
      { id: "1", title: "Handful", amount: 100, slug: "coin_pack_100", imageSrc: "/assets/store/coin_handful.webp" },
      { id: "2", title: "Pouch", amount: 550, bonus: 10, isPopular: true, slug: "coin_pack_550", imageSrc: "/assets/store/coin_pouch.webp" },
      { id: "3", title: "Chest", amount: 1200, bonus: 20, slug: "coin_pack_1200", imageSrc: "/assets/store/coin_chest.webp" },
      { id: "4", title: "Vault", amount: 3000, bonus: 50, slug: "coin_pack_3000", imageSrc: "/assets/store/coin_vault.webp" },
    ];

    return config.map((item) => {
      const product = productsBySlug.get(item.slug);
      const price = product ? formatUsd(product.priceCents) : "—";
      return {
        id: item.id,
        title: item.title,
        amount: item.amount,
        bonus: item.bonus,
        isPopular: item.isPopular,
        currencyType: "coins",
        imageSrc: item.imageSrc,
        price,
        onBuy: product ? () => setBuyModal({
          name: item.title,
          price,
          productSlug: item.slug,
          mode: "stripe",
        }) : undefined,
      };
    });
  }, [productsBySlug]);

  // Backend enforces a QUANTITY-based rolling per-24h purchase limit (up to
  // 5 tickets/day): a pack is blocked when it's larger than the remaining
  // allowance, so the 1-pack can stay buyable while the 3/5-packs are not.
  // Falls back to the binary canBuy flag for wallet payloads that predate
  // ticketsRemainingInWindow. Unlimited dev accounts skip the cooldown.
  const cooldown = wallet?.ticketPurchaseCooldown;
  const ticketsRemainingInWindow = isUnlimited
    ? Number.POSITIVE_INFINITY
    : cooldown
      ? (cooldown.ticketsRemainingInWindow
        ?? (cooldown.canBuy === false ? 0 : TICKET_PURCHASE_DAILY_CAP))
      : TICKET_PURCHASE_DAILY_CAP;
  // Seconds until the next ticket-purchase slot frees up. Prefer the absolute
  // timestamp (so the label stays accurate as the wallet refetches) and fall
  // back to the server-sent remainingSeconds.
  const cooldownSeconds = cooldown?.nextAvailableAt
    ? Math.max(0, Math.ceil((Date.parse(cooldown.nextAvailableAt) - nowMs) / 1000))
    : cooldown?.remainingSeconds ?? 0;

  const ticketPacks = useMemo<TicketPackItem[]>(() => {
    const currentTickets = wallet?.tickets ?? 0;
    // Dev-allowlist accounts bypass the cap on the backend; never disable here.
    const availableSpace = isUnlimited
      ? Number.POSITIVE_INFINITY
      : Math.max(0, TICKET_CAP - currentTickets);

    const ticketPacks = (productsData?.items ?? []).filter(
      (p) => p.type === "ticket_pack",
    );
    return ticketPacks
      .map((product) => {
        const ticketCount =
          typeof product.metadata === "object" &&
          product.metadata !== null &&
          typeof (product.metadata as { tickets?: unknown }).tickets === "number"
            ? ((product.metadata as { tickets: number }).tickets)
            : 1;
        const isFull = ticketCount > availableSpace;
        const overDailyAllowance = ticketCount > ticketsRemainingInWindow;
        const disabledReason: TicketPackItem["disabledReason"] = isFull
          ? "full"
          : overDailyAllowance
          ? "cooldown"
          : undefined;
        return {
          id: product.slug,
          title: `${ticketCount} ${ticketCount === 1 ? t("store.ticket") : t("store.tickets")}`,
          description: product.description?.en ?? t("store.topUpTicketsDesc"),
          // Ticket packs are coin-priced: priceCents holds the coin amount.
          price: product.priceCents.toLocaleString(),
          priceCoinsValue: product.priceCents,
          productSlug: product.slug,
          iconAsset: "/assets/ticket_icon.webp",
          disabled: disabledReason != null,
          disabledReason,
          disabledLabel:
            disabledReason === "cooldown" && cooldownSeconds > 0
              ? t("store.ticketUnlocksIn", { time: formatRemaining(cooldownSeconds) })
              : undefined,
          ticketCount,
        } satisfies TicketPackItem;
      })
      .sort((a, b) => a.ticketCount - b.ticketCount);
  }, [productsData, wallet?.tickets, ticketsRemainingInWindow, cooldownSeconds, isUnlimited, t]);

  const purchasePending = checkoutMutation.isPending || coinPurchaseMutation.isPending;

  /** Persist structured customization to the backend. */
  const persistCustomization = async (next: AvatarCustomization) => {
    try {
      const updated = await updateMe({ avatar_customization: next });
      updateStats({ avatarCustomization: next });
      if (authUser) {
        setAuthenticated({ ...authUser, avatar_customization: updated.avatar_customization ?? next });
      }
    } catch {
      toast.error(t("store.couldNotSaveAvatar"));
    }
  };

  /** Open the buy / equip modal for an avatar part (always with preview). */
  const openAvatarPartModal = (part: AvatarPart) => {
    const previewCustomization: AvatarCustomization = {
      ...currentCustomization,
      [part.slot]: part.id,
    };
    const isOwned = ownedPartIds.has(part.id);
    const modalMode: BuyModalState["mode"] = isOwned ? "equip" : part.productSlug ? "coins" : "none";
    if (part.productSlug) {
      trackPurchaseModalOpened(part.productSlug, modalMode, {
        affordable: isOwned || canAffordPart(part),
      });
    }
    setBuyModal({
      name: translatePartName(part.name),
      price: isOwned ? "" : part.priceCoins ? part.priceCoins.toLocaleString() : "—",
      priceInCoins: !isOwned && Boolean(part.priceCoins),
      productSlug: part.productSlug,
      mode: modalMode,
      avatarPart: part,
      previewCustomization,
      priceCoinsValue: isOwned ? undefined : part.priceCoins,
    });
  };

  /** Live affordability for the open modal — re-derived when the wallet updates. */
  const modalAffordable = canAffordCoins(buyModal?.priceCoinsValue);

  const handleConfirm = () => {
    if (!buyModal || purchasePending) return;
    if (buyModal.mode === "equip" && buyModal.avatarPart) {
      const part = buyModal.avatarPart;
      void persistCustomization({ ...currentCustomization, [part.slot]: part.id });
      trackAvatarPartEquipped(part.slot, part.id);
      toast.success(t("store.equipped", { name: translatePartName(part.name) }));
      setBuyModal(null);
      return;
    }
    if (!buyModal.productSlug || buyModal.mode === "none") {
      toast.message(t("store.notPurchasableYet"));
      setBuyModal(null);
      return;
    }
    if (buyModal.mode === "stripe") {
      checkoutMutation.mutate(buyModal.productSlug);
      return;
    }
    if (!canAffordCoins(buyModal.priceCoinsValue)) {
      toast.error(t("store.notEnoughCoins"));
      setBuyModal(null);
      return;
    }
    const partToEquip = buyModal.avatarPart;
    coinPurchaseMutation.mutate(buyModal.productSlug, {
      onSuccess: async () => {
        if (partToEquip) {
          await persistCustomization({
            ...currentCustomization,
            [partToEquip.slot]: partToEquip.id,
          });
        }
      },
      onSettled: () => setBuyModal(null),
    });
  };

  return (
    <div className="min-h-screen pb-20 flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto max-w-5xl py-8 space-y-14 px-4 md:px-0">

          {STRIPE_PURCHASES_ENABLED && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <FeaturedBundleCard
                onBuy={() => {
                  if (!featuredBundleSlug) {
                    toast.error(t("store.noCoinBundle"));
                    return;
                  }
                  const product = productsBySlug.get(featuredBundleSlug);
                  setBuyModal({
                    name: t("store.unlockBundle"),
                    price: product ? formatUsd(product.priceCents) : "$0.00",
                    productSlug: featuredBundleSlug,
                    mode: "stripe",
                  });
                }}
              />
            </motion.section>
          )}

          {STRIPE_PURCHASES_ENABLED && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
            >
              <SectionHeader title={t("store.coinsTitle")} subtitle={t("store.coinsSubtitle")} />
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {coinBundles.map((bundle, i) => (
                  <motion.div
                    key={bundle.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 + i * 0.05 }}
                  >
                    <BundleCard {...bundle} />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
          >
            <SectionHeader title={t("store.ticketsTitle")} />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {ticketPacks.map((pack, i) => (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 + i * 0.05 }}
                >
                  <TicketCard
                    pack={pack}
                    onBuy={(b) => {
                      if (b.disabledReason === "full") {
                        toast.message(t("store.notEnoughTicketSpace"));
                        return;
                      }
                      if (b.disabledReason === "cooldown") {
                        const remainingSeconds = wallet?.ticketPurchaseCooldown?.remainingSeconds;
                        toast.message(
                          Number.isFinite(ticketsRemainingInWindow) && ticketsRemainingInWindow > 0
                            ? t("store.ticketDailyAllowanceLeft", { count: ticketsRemainingInWindow })
                            : remainingSeconds
                              ? t("store.ticketPurchaseLimitIn", { time: formatRemaining(remainingSeconds) })
                              : t("store.ticketPurchaseLimit"),
                        );
                        return;
                      }
                      if (b.productSlug) {
                        trackPurchaseModalOpened(b.productSlug, "coins", {
                          affordable: canAffordCoins(b.priceCoinsValue),
                        });
                      }
                      setBuyModal({
                        name: b.title,
                        price: b.price,
                        priceInCoins: true,
                        priceCoinsValue: b.priceCoinsValue,
                        productSlug: b.productSlug,
                        mode: b.productSlug ? "coins" : "none",
                      });
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 }}
          >
            <SectionHeader title={t("store.hairTitle")} />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {HAIR_PARTS.filter((p) => !p.free).map((part, i) => (
                <motion.div
                  key={part.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 + i * 0.04 }}
                >
                  <ItemCard
                    name={translatePartName(part.name)}
                    asset={part.asset}
                    price={part.priceCoins ? part.priceCoins.toLocaleString() : "—"}
                    mannequinPart={part}
                    owned={ownedPartIds.has(part.id)}
                    onBuy={() => openAvatarPartModal(part)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.35 }}
          >
            <SectionHeader title={t("store.glassesTitle")} />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {GLASSES_PARTS.map((part, i) => (
                <motion.div
                  key={part.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.35 + i * 0.04 }}
                >
                  <ItemCard
                    name={translatePartName(part.name)}
                    asset={part.asset}
                    price={part.priceCoins ? part.priceCoins.toLocaleString() : "—"}
                    mannequinPart={part}
                    owned={ownedPartIds.has(part.id)}
                    onBuy={() => openAvatarPartModal(part)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.4 }}
          >
            <SectionHeader title={t("store.facialHairTitle")} />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {FACIAL_HAIR_PARTS.map((part, i) => (
                <motion.div
                  key={part.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.4 + i * 0.04 }}
                >
                  <ItemCard
                    name={translatePartName(part.name)}
                    asset={part.asset}
                    price={part.priceCoins ? part.priceCoins.toLocaleString() : "—"}
                    mannequinPart={part}
                    owned={ownedPartIds.has(part.id)}
                    onBuy={() => openAvatarPartModal(part)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.45 }}
          >
            <SectionHeader title={t("store.jerseysTitle")} />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {JERSEY_DESIGN_PARTS.map((part, i) => (
                <motion.div
                  key={part.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.45 + i * 0.04 }}
                >
                  <ItemCard
                    name={translatePartName(part.name)}
                    asset={part.asset}
                    price={part.priceCoins ? part.priceCoins.toLocaleString() : "—"}
                    imageSize="lg"
                    owned={ownedPartIds.has(part.id)}
                    onBuy={() => openAvatarPartModal(part)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>

          <PurchaseConfirmModal
            open={!!buyModal}
            onClose={() => {
              if (purchasePending) return;
              // Dismissing an unaffordable preview isn't a purchase decision —
              // keep it out of the purchase_cancelled funnel.
              if (buyModal?.productSlug && modalAffordable) {
                trackPurchaseCancelled(buyModal.productSlug);
              }
              setBuyModal(null);
            }}
            onConfirm={handleConfirm}
            isPending={purchasePending}
            name={buyModal?.name ?? ""}
            price={buyModal?.price ?? ""}
            priceInCoins={buyModal?.priceInCoins ?? false}
            previewCustomization={buyModal?.previewCustomization}
            confirmLabel={buyModal?.mode === "equip" ? t("store.equip") : undefined}
            affordable={modalAffordable}
          />

        </div>
      </div>
    </div>
  );
}
