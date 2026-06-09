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
import { usePlayer } from "@/contexts/PlayerContext";
import { updateMe } from "@/lib/api/endpoints";
import type { AvatarCustomization } from "@/types/game";

const STRIPE_PURCHASES_ENABLED = false;

function formatUsd(priceCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100);
}

interface TicketPackItem {
  id: string;
  title: string;
  description: string;
  price: string;
  iconAsset: string;
  productSlug?: string;
  disabled?: boolean;
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

        {/* Bottom: pill button — coin price + coin icon */}
        <button
          type="button"
          onClick={() => onBuy(pack)}
          disabled={pack.disabled}
          className="flex h-9 w-full items-center justify-center gap-1 rounded-[16px] text-[12px] uppercase text-white transition-transform active:translate-y-[2px] disabled:opacity-50 disabled:active:translate-y-0 sm:h-[44px] sm:gap-2 sm:rounded-[20px] sm:text-[18px]"
          style={{ ...POPPINS_HEADER, backgroundColor: ACCENT_PURPLE }}
        >
          <span className="tabular-nums">{pack.disabled ? t("store.full") : pack.price}</span>
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
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const { player, updateStats } = usePlayer();
  const [buyModal, setBuyModal] = useState<BuyModalState | null>(null);

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

  const canAffordPart = (part: AvatarPart) =>
    !part.priceCoins || (wallet?.coins ?? 0) >= part.priceCoins;

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

  const ticketPacks = useMemo<TicketPackItem[]>(() => {
    const currentTickets = wallet?.tickets ?? 0;
    const TICKET_CAP = 10;
    const availableSpace = Math.max(0, TICKET_CAP - currentTickets);

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
        return {
          id: product.slug,
          title: `${ticketCount} ${ticketCount === 1 ? t("store.ticket") : t("store.tickets")}`,
          description: product.description?.en ?? t("store.topUpTicketsDesc"),
          price: product.priceCents.toLocaleString(),
          productSlug: product.slug,
          iconAsset: "/assets/ticket_icon.webp",
          disabled: ticketCount > availableSpace,
          ticketCount,
        } satisfies TicketPackItem;
      })
      .sort((a, b) => a.ticketCount - b.ticketCount);
  }, [productsData, wallet?.tickets, t]);

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
      trackPurchaseModalOpened(part.productSlug, modalMode);
    }
    setBuyModal({
      name: translatePartName(part.name),
      price: isOwned ? "" : part.priceCoins ? t("store.coinsPrice", { amount: part.priceCoins.toLocaleString() }) : "—",
      productSlug: part.productSlug,
      mode: modalMode,
      avatarPart: part,
      previewCustomization,
    });
  };

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
    if (buyModal.avatarPart && !canAffordPart(buyModal.avatarPart)) {
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
            <SectionHeader title={t("store.ticketsTitle")} subtitle={t("store.ticketsSubtitle")} />
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
                      if (b.disabled) {
                        toast.message(t("store.notEnoughTicketSpace"));
                        return;
                      }
                      setBuyModal({
                        name: b.title,
                        price: `${b.price} coins`,
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
            <SectionHeader title={t("store.hairTitle")} subtitle={t("store.hairSubtitle")} />
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
                    affordable={canAffordPart(part)}
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
            <SectionHeader title={t("store.glassesTitle")} subtitle={t("store.glassesSubtitle")} />
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
                    affordable={canAffordPart(part)}
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
            <SectionHeader title={t("store.facialHairTitle")} subtitle={t("store.facialHairSubtitle")} />
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
                    affordable={canAffordPart(part)}
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
            <SectionHeader title={t("store.jerseysTitle")} subtitle={t("store.jerseysSubtitle")} />
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
                    affordable={canAffordPart(part)}
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
              if (buyModal?.productSlug) trackPurchaseCancelled(buyModal.productSlug);
              setBuyModal(null);
            }}
            onConfirm={handleConfirm}
            isPending={purchasePending}
            name={buyModal?.name ?? ""}
            price={buyModal?.price ?? ""}
            previewCustomization={buyModal?.previewCustomization}
            confirmLabel={buyModal?.mode === "equip" ? "Equip" : undefined}
          />

        </div>
      </div>
    </div>
  );
}
