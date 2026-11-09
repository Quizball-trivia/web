import { SHOW_TICKETS } from "@/lib/tickets";
import { FeaturedBundleCard } from "./components/FeaturedBundleCard";
import { affordabilityAllowsConfirm, type BuyModalMode } from "./lib/modalAffordability";
import { BundleCard, type BundleProps } from "./components/BundleCard";
import { PurchaseConfirmModal } from "./components/PurchaseConfirmModal";
import { CoinIcon } from "./components/CoinIcon";
import { EarnCoinsSheet } from "./components/EarnCoinsSheet";
import { StoreHeader } from "./components/StoreHeader";
import { StoreCategoryNav, isStoreCategory, type StoreCategory } from "./components/StoreCategoryNav";
import { StorePartSections } from "./components/StorePartSections";
import { TICKET_CAP, nextTicketRefillAt, secondsUntilTicketRefill } from "./lib/ticketRefill";
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

/** Delay after a refill tick before re-reading the wallet (the cron grants the ticket). */
const REFILL_CRON_LAG_MS = 15_000;
/** Daily purchase allowance in TICKETS per fixed Georgia day — mirrors backend
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
  /** Why the pack is disabled — drives both the button label and the tap toast.
   *  "full": wallet at the cap. "noRoom": this pack is bigger than the free space. */
  disabledReason?: "full" | "noRoom" | "cooldown";
  /** Button label shown when disabled by the daily limit, e.g. "Unlocks in 4h". */
  disabledLabel?: string;
  /** Number of tickets this pack grants — drives the stacked-icon visual. */
  ticketCount: number;
  /** Lowest coin price per ticket among multi-ticket packs. */
  bestValue?: boolean;
}

interface BuyModalState {
  name: string;
  price: string;
  productSlug?: string;
  mode: BuyModalMode;
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
        {pack.bestValue && (
          <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-yellow px-2.5 py-1 text-[10px] font-bold uppercase leading-none text-black sm:text-[11px]">
            {t("store.bestValue")}
          </span>
        )}
        {/* Top: title + subtitle (centered) */}
        <div className="text-center">
          <div
            className="line-clamp-2 min-h-[2.3em] break-words text-[11px] uppercase leading-[1.15] text-white sm:text-[16px]"
            style={POPPINS_HEADER}
          >
            {pack.title}
          </div>
          <div className="mt-1 text-[11px] leading-snug text-white/60 tabular-nums sm:mt-1.5 sm:text-[13px]">
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
            pack.disabledReason === "cooldown" || pack.disabledReason === "noRoom" ? "text-[10px] sm:text-[14px]" : "text-[12px] sm:text-[18px]",
          )}
          style={{ ...POPPINS_HEADER, backgroundColor: ACCENT_PURPLE }}
        >
          <span className="tabular-nums">
            {pack.disabledReason === "full"
              ? t("store.full")
              : pack.disabledReason === "noRoom"
              ? pack.disabledLabel
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

const SECTION_SPRING = { type: "spring", stiffness: 200, damping: 20 } as const;

// Map of static English part names → translation keys. Football-related
// proper nouns (Ramos, Real Madrid, Liverpool, etc.) intentionally stay
// untranslated since they're brand names.
export interface LocalStorePreview {
  category?: StoreCategory;
  search?: string;
  /** Mock ticket balance so the preview can show ticket-pack states. */
  tickets?: number;
  customization: AvatarCustomization;
  ownedPartIds: readonly string[];
  coins: number;
  onEquip: (next: AvatarCustomization) => void;
  onPurchase: (productSlug: string) => void;
}

/** Mock ticket packs for the /dev/store-examples preview (live catalogue values, economy v3). */
const PREVIEW_TICKET_PRODUCTS = [
  { slug: "ticket_pack_1", tickets: 1, priceCents: 2_000 },
  { slug: "ticket_pack_3", tickets: 3, priceCents: 4_000 },
  { slug: "ticket_pack_5", tickets: 5, priceCents: 5_000 },
].map((p) => ({ slug: p.slug, type: "ticket_pack" as const, priceCents: p.priceCents, metadata: { tickets: p.tickets } }));

export function StoreScreen({ localPreview }: { localPreview?: LocalStorePreview } = {}) {
  const { t } = useLocale();
  const isLocalPreview = Boolean(localPreview);
  const translatePartName = (name: string) => translateSharedPartName(name, t);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  // Category + search: the live store owns them (category mirrored to ?tab=
  // so other screens can deep-link, e.g. /store?tab=tickets); the dev preview
  // drives them from its own controls.
  const tabParam = searchParams.get("tab");
  // Derived from the URL (not copied into state) so same-route navigation —
  // e.g. the navbar coin pill linking to plain /store — resets the tab.
  // Tickets are switched off for free Ranked 2.0: an old ?tab=tickets link lands on everything else.
  const ownCategory: StoreCategory = isStoreCategory(tabParam) && (SHOW_TICKETS || tabParam !== "tickets") ? tabParam : "all";
  const [ownSearch, setOwnSearch] = useState("");
  const [affordableOnly, setAffordableOnly] = useState(false);
  const [earnOpen, setEarnOpen] = useState(false);
  const category: StoreCategory = localPreview ? localPreview.category ?? "all" : ownCategory;
  const search = (localPreview ? localPreview.search ?? "" : ownSearch).trim();
  const showCategory = (id: StoreCategory) => category === "all" || category === id;
  const changeCategory = (next: StoreCategory) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  const { data: productsData } = useStoreProducts(!localPreview);
  const { data: remoteWallet } = useStoreWallet({ enabled: !localPreview });
  const wallet = localPreview ? { coins: localPreview.coins, tickets: localPreview.tickets ?? 0, ticketPurchaseCooldown: undefined } : remoteWallet;
  const { data: inventoryData } = useStoreInventory(!localPreview);
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
    return localPreview?.customization ?? authUser?.avatar_customization ?? customizationFromAvatarValue(authUser?.avatar_url ?? player.avatarCustomization?.base);
  }, [localPreview?.customization, authUser?.avatar_customization, authUser?.avatar_url, player.avatarCustomization?.base]);

  /** Set of part ids the user already owns (free defaults + purchased). */
  const ownedPartIds = useMemo(() => {
    const set = new Set<string>(localPreview?.ownedPartIds);
    for (const part of ALL_AVATAR_PARTS) {
      if (part.free) set.add(part.id);
    }
    for (const skin of SKIN_PARTS) {
      if (skin.free) set.add(skin.id);
    }
    for (const entry of (localPreview ? [] : inventoryData?.items ?? [])) {
      const part = ALL_AVATAR_PARTS.find((p) => p.productSlug === entry.slug);
      if (part) set.add(part.id);
      const skin = SKIN_PARTS.find((s) => s.productSlug === entry.slug);
      if (skin) set.add(skin.id);
    }
    return set;
  }, [inventoryData, localPreview]);

  /**
   * Coin affordability check. While the wallet is still loading we treat
   * everything as affordable (the backend re-validates on purchase) so items
   * don't flash "Need more" before the balance arrives.
   */
  const canAffordCoins = (priceCoins: number | undefined) =>
    isUnlimited || !priceCoins || wallet == null || wallet.coins >= priceCoins;

  const productsBySlug = useMemo(() => {
    return new Map((productsData?.items ?? []).map((item) => [item.slug, item]));
  }, [productsData]);

  /**
   * Live coin price for an avatar part. The backend catalogue is the source of
   * truth (priceCents holds the coin amount for coin-priced products); the
   * priceCoins baked into parts.ts is only a fallback for parts that have no
   * backing product, so repricing server-side does not need a client release.
   */
  const partPriceCoins = (part: Pick<AvatarPart, "productSlug" | "priceCoins">) => {
    const product = part.productSlug ? productsBySlug.get(part.productSlug) : undefined;
    return product?.priceCents ?? part.priceCoins;
  };

  const canAffordPart = (part: AvatarPart) => canAffordCoins(partPriceCoins(part));

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
      // wallet/inventory refresh handled by onSettled below (runs on both paths)
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
    // Re-sync wallet + inventory after EVERY attempt — success or failure — so a
    // failed purchase never leaves a stale ticket/coin count on screen (which
    // previously made a rejected buy look like it "worked" after a manual reload).
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.inventory() });
    },
  });

  useEffect(() => {
    if (!isLocalPreview) trackStoreViewed();
  }, [isLocalPreview]);

  useEffect(() => {
    const purchaseStatus = searchParams.get("purchase");
    if (!purchaseStatus || isLocalPreview) return;
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
  }, [searchParams, pathname, queryClient, router, isLocalPreview, t]);

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

    const ticketPacks = localPreview
      ? PREVIEW_TICKET_PRODUCTS
      : (productsData?.items ?? []).filter((p) => p.type === "ticket_pack");
    const packs = ticketPacks
      .map((product) => {
        const ticketCount =
          typeof product.metadata === "object" &&
          product.metadata !== null &&
          typeof (product.metadata as { tickets?: unknown }).tickets === "number"
            ? ((product.metadata as { tickets: number }).tickets)
            : 1;
        // "Full" only when the wallet is at the cap; a pack that is merely
        // bigger than the free space says how many still fit.
        const overDailyAllowance = ticketCount > ticketsRemainingInWindow;
        const disabledReason: TicketPackItem["disabledReason"] = availableSpace <= 0
          ? "full"
          : ticketCount > availableSpace
          ? "noRoom"
          : overDailyAllowance
          ? "cooldown"
          : undefined;
        return {
          id: product.slug,
          title: `${ticketCount} ${ticketCount === 1 ? t("store.ticket") : t("store.tickets")}`,
          description: t("store.perTicket", { price: Math.round(product.priceCents / Math.max(1, ticketCount)).toLocaleString() }),
          // Ticket packs are coin-priced: priceCents holds the coin amount.
          price: product.priceCents.toLocaleString(),
          priceCoinsValue: product.priceCents,
          productSlug: product.slug,
          iconAsset: "/assets/ticket_icon.webp",
          disabled: disabledReason != null,
          disabledReason,
          disabledLabel:
            disabledReason === "noRoom"
              ? t("store.roomFor", { count: availableSpace })
              : disabledReason === "cooldown" && cooldownSeconds > 0
              ? t("store.ticketUnlocksIn", { time: formatRemaining(cooldownSeconds) })
              : undefined,
          ticketCount,
        } satisfies TicketPackItem;
      })
      .sort((a, b) => a.ticketCount - b.ticketCount);
    const perTicket = (pack: TicketPackItem) => pack.priceCoinsValue / Math.max(1, pack.ticketCount);
    const multi = packs.filter((pack) => pack.ticketCount > 1);
    const cheapest = multi.length > 1 ? Math.min(...multi.map(perTicket)) : null;
    return packs.map((pack) => (cheapest != null && pack.ticketCount > 1 && perTicket(pack) === cheapest ? { ...pack, bestValue: true } : pack));
  }, [productsData, localPreview, wallet?.tickets, ticketsRemainingInWindow, cooldownSeconds, isUnlimited, t]);

  const walletTickets = wallet?.tickets ?? null;
  const awaitingRefill = walletTickets != null && walletTickets < TICKET_CAP;
  const nextFreeTicketIn = awaitingRefill ? formatRemaining(secondsUntilTicketRefill(nowMs)) : null;

  // The wallet query doesn't poll, so re-read it just after each refill tick
  // (the cron grants the ticket server-side); otherwise the header would show
  // the old count with a fresh 4h countdown.
  // Derived from (now - lag) so the target only moves on once its refresh has
  // run: a minute tick landing between the boundary and boundary+lag must not
  // cancel the pending refresh and reschedule it four hours later.
  const refillRefreshAtMs = nextTicketRefillAt(nowMs - REFILL_CRON_LAG_MS) + REFILL_CRON_LAG_MS;
  useEffect(() => {
    if (!SHOW_TICKETS || isLocalPreview || !awaitingRefill) return;
    const id = window.setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
    }, Math.max(0, refillRefreshAtMs - Date.now()));
    return () => window.clearTimeout(id);
  }, [isLocalPreview, awaitingRefill, refillRefreshAtMs, queryClient]);

  const purchasePending = checkoutMutation.isPending || coinPurchaseMutation.isPending;

  /** Persist structured customization to the backend. */
  const persistCustomization = async (next: AvatarCustomization): Promise<boolean> => {
    try {
      if (localPreview) { localPreview.onEquip(next); return true; }
      const updated = await updateMe({ avatar_customization: next });
      updateStats({ avatarCustomization: next });
      if (authUser) {
        setAuthenticated({ ...authUser, avatar_customization: updated.avatar_customization ?? next });
      }
      return true;
    } catch {
      toast.error(t("store.couldNotSaveAvatar"));
      return false;
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
    if (part.productSlug && !localPreview) {
      trackPurchaseModalOpened(part.productSlug, modalMode, {
        affordable: isOwned || canAffordPart(part),
      });
    }
    const livePrice = partPriceCoins(part);
    setBuyModal({
      name: translatePartName(part.name),
      price: isOwned ? "" : livePrice ? livePrice.toLocaleString() : "—",
      priceInCoins: !isOwned && Boolean(livePrice),
      productSlug: part.productSlug,
      mode: modalMode,
      avatarPart: part,
      previewCustomization,
      priceCoinsValue: isOwned ? undefined : livePrice,
    });
  };

  /**
   * Live coin cost for the open modal. Re-derived from the catalogue on every
   * render so a modal opened before the products query resolved does not stay
   * pinned to the parts.ts fallback captured at open time.
   */
  const modalPriceCoins = buyModal?.avatarPart
    ? partPriceCoins(buyModal.avatarPart)
    : buyModal?.priceCoinsValue;

  /** Live affordability for the open modal — re-derived when the wallet updates. */
  const modalAffordable = canAffordCoins(modalPriceCoins);
  // Retain raw coin affordability for purchase analytics; the confirm button
  // must not consult the wallet for an owned part in equip mode.
  const modalCanConfirm = affordabilityAllowsConfirm(buyModal?.mode, modalAffordable);

  const handleConfirm = () => {
    if (!buyModal || purchasePending) return;
    if (localPreview) {
      if (!buyModal.avatarPart) {
        toast.message(t("store.notPurchasableYet"));
        setBuyModal(null);
        return;
      }
      try {
        if (buyModal.mode === "coins" && buyModal.productSlug) localPreview.onPurchase(buyModal.productSlug);
        localPreview.onEquip({ ...currentCustomization, [buyModal.avatarPart.slot]: buyModal.avatarPart.id });
        toast.success(t("store.equipped", { name: buyModal.name }));
        setBuyModal(null);
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not equip item"); }
      return;
    }
    if (buyModal.mode === "equip" && buyModal.avatarPart) {
      const part = buyModal.avatarPart;
      setBuyModal(null);
      // Confirm only once the save lands — a failed save shows its own error.
      void persistCustomization({ ...currentCustomization, [part.slot]: part.id }).then((saved) => {
        if (!saved) return;
        trackAvatarPartEquipped(part.slot, part.id);
        toast.success(t("store.equipped", { name: translatePartName(part.name) }));
      });
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
    if (!canAffordCoins(modalPriceCoins)) {
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

  const spring = SECTION_SPRING;

  // Search only targets avatar items; "Can afford" keeps the buyable packs.
  const visibleTicketPacks = affordableOnly
    ? ticketPacks.filter((pack) => !pack.disabled && canAffordCoins(pack.priceCoinsValue))
    : ticketPacks;
  const showTickets = SHOW_TICKETS && showCategory("tickets") && !search && visibleTicketPacks.length > 0;

  return (
    <div className="min-h-screen pb-20 flex flex-col">
      <div className="flex-1">
        <div className="container mx-auto max-w-5xl px-4 py-6 sm:py-8">
          <StoreHeader
            coins={wallet?.coins ?? null}
            tickets={walletTickets}
            nextFreeTicketIn={nextFreeTicketIn}
            onHowToEarn={() => setEarnOpen(true)}
          />

          {!localPreview && (
              <StoreCategoryNav
                className="mt-5"
                category={ownCategory}
                onCategoryChange={changeCategory}
                search={ownSearch}
                onSearchChange={setOwnSearch}
                affordableOnly={affordableOnly}
                onAffordableOnlyChange={setAffordableOnly}
              />
          )}

          <div className="mt-8 space-y-14">
          {STRIPE_PURCHASES_ENABLED && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
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
              transition={{ ...spring, delay: 0.1 }}
            >
              <SectionHeader title={t("store.coinsTitle")} subtitle={t("store.coinsSubtitle")} />
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {coinBundles.map((bundle, i) => (
                  <motion.div
                    key={bundle.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.1 + i * 0.05 }}
                  >
                    <BundleCard {...bundle} />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {showTickets && <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
          >
            <SectionHeader title={t("store.ticketsTitle")} />
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:grid-cols-3 sm:gap-4 sm:gap-y-6 lg:grid-cols-4">
              {visibleTicketPacks.map((pack, i) => (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: 0.1 + i * 0.05 }}
                >
                  <TicketCard
                    pack={pack}
                    onBuy={(b) => {
                      if (b.disabledReason === "full" || b.disabledReason === "noRoom") {
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
                      if (b.productSlug && !localPreview) {
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
          </motion.section>}

          <StorePartSections
            category={category}
            search={search}
            affordableOnly={affordableOnly}
            includeLocalOnly={isLocalPreview}
            ownedPartIds={ownedPartIds}
            customization={currentCustomization}
            priceFor={partPriceCoins}
            canAfford={canAffordCoins}
            translateName={translatePartName}
            onSelect={openAvatarPartModal}
            showEmptyState={!showTickets}
            onClearFilters={isLocalPreview || (!search && !affordableOnly) ? undefined : () => { setOwnSearch(""); setAffordableOnly(false); }}
          />
          </div>

          <PurchaseConfirmModal
            open={!!buyModal}
            onClose={() => {
              if (purchasePending) return;
              // Dismissing an unaffordable preview isn't a purchase decision —
              // keep it out of the purchase_cancelled funnel.
              if (!localPreview && buyModal?.productSlug && modalCanConfirm) {
                trackPurchaseCancelled(buyModal.productSlug);
              }
              setBuyModal(null);
            }}
            onConfirm={handleConfirm}
            isPending={purchasePending}
            name={buyModal?.name ?? ""}
            price={
              buyModal?.mode === "equip"
                ? ""
                : modalPriceCoins
                ? modalPriceCoins.toLocaleString()
                : buyModal?.price ?? ""
            }
            priceInCoins={buyModal?.mode === "equip" ? false : buyModal?.priceInCoins ?? false}
            previewCustomization={buyModal?.previewCustomization}
            confirmLabel={buyModal?.mode === "equip" ? t("store.equip") : undefined}
            affordable={modalCanConfirm}
            balance={isUnlimited || buyModal?.mode !== "coins" ? null : wallet?.coins ?? null}
            priceCoins={modalPriceCoins}
            onEarnMore={() => { setBuyModal(null); setEarnOpen(true); }}
          />

          <EarnCoinsSheet open={earnOpen} onOpenChange={setEarnOpen} />
        </div>
      </div>
    </div>
  );
}
