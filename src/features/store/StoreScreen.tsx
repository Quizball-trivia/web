import Image from "next/image";
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
import { trackItemPurchased } from "@/lib/analytics/game-events";
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

function formatUsd(priceCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100);
}

interface BoosterItem {
  id: string;
  title: string;
  description: string;
  price: string;
  iconAsset: string;
  productSlug?: string;
  disabled?: boolean;
}

interface BuyModalState {
  name: string;
  price: string;
  productSlug?: string;
  mode: "stripe" | "coins" | "none";
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
          className="mt-1.5 text-[10px] sm:text-[11px] uppercase tracking-[0.04em] text-white/50"
          style={POPPINS_HEADER}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function BoosterCard({ booster, onBuy }: { booster: BoosterItem; onBuy: (b: BoosterItem) => void }) {
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
        className="relative flex flex-col rounded-[20px] border-[3px] aspect-[320/268] px-5 pt-5 pb-5"
        style={{ backgroundColor: CARD_BG, borderColor: ACCENT_PURPLE }}
      >
        {/* Top-left: title + subtitle */}
        <div>
          <div
            className="text-[18px] sm:text-[20px] uppercase leading-tight text-white"
            style={POPPINS_HEADER}
          >
            {booster.title}
          </div>
          <div
            className="mt-1.5 text-[9px] sm:text-[10px] uppercase tracking-[0.04em] text-white/50 leading-snug"
            style={POPPINS_HEADER}
          >
            {booster.description}
          </div>
        </div>

        {/* Center icon image */}
        <div className="relative flex flex-1 items-center justify-center py-2">
          <Image
            src={booster.iconAsset}
            alt=""
            width={120}
            height={120}
            unoptimized
            className="max-h-full w-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
          />
        </div>

        {/* Bottom: pill button with coin icon */}
        <button
          type="button"
          onClick={() => onBuy(booster)}
          disabled={booster.disabled}
          className="mt-2 flex h-[44px] w-full items-center justify-center gap-2 rounded-[20px] text-[18px] uppercase text-white transition-transform active:translate-y-[2px] disabled:opacity-50 disabled:active:translate-y-0"
          style={{ ...POPPINS_HEADER, backgroundColor: ACCENT_PURPLE }}
        >
          <span className="tabular-nums">{booster.disabled ? "Full" : booster.price}</span>
          {!booster.disabled && <CoinIcon size={26} />}
        </button>
      </div>
    </motion.div>
  );
}

export function StoreScreen() {
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
  const ticketsFull = (wallet?.tickets ?? 0) >= 10;

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
        toast.error("Session expired. Please sign in again.");
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
          toast.error("Tickets are already full.");
          return;
        }
      }
      toast.error("Unable to start checkout.");
    },
  });

  const coinPurchaseMutation = useMutation({
    mutationFn: async (productSlug: string) => purchaseStoreWithCoins({ productSlug }),
    onSuccess: (_data, productSlug) => {
      const product = productsBySlug.get(productSlug);
      const productName = product?.name?.en ?? product?.slug ?? productSlug;
      trackItemPurchased(productSlug, productName, product?.priceCents ?? 0);
      toast.success("Purchase completed.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.inventory() });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        toast.error("Session expired. Please sign in again.");
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
          toast.error("Tickets are already full.");
          return;
        }
        toast.error("Not enough coins.");
        return;
      }
      toast.error("Purchase failed.");
    },
  });

  useEffect(() => {
    const purchaseStatus = searchParams.get("purchase");
    if (!purchaseStatus) return;
    if (purchaseStatus === "success") {
      toast.success("Purchase completed.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.inventory() });
    }
    if (purchaseStatus === "cancelled") {
      toast.message("Purchase cancelled.");
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

  const boosters = useMemo<BoosterItem[]>(() => {
    const ticketCard: BoosterItem = {
      id: "tickets",
      title: "Extra Tickets",
      description: "Top up ranked tickets up to the 10-ticket cap",
      price: "500",
      productSlug: "ticket_pack_3",
      iconAsset: "/assets/ticket_icon.webp",
      disabled: ticketsFull,
    };
    return [
      { ...ticketCard, id: "tickets-1" },
      { ...ticketCard, id: "tickets-2" },
      { ...ticketCard, id: "tickets-3" },
      { ...ticketCard, id: "tickets-4" },
    ];
  }, [ticketsFull]);

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
      toast.error("Could not save avatar.");
    }
  };

  /** Open the buy modal for an avatar part (with preview). */
  const openAvatarPartModal = (part: AvatarPart) => {
    if (ownedPartIds.has(part.id)) {
      // Already owned → equip immediately, no modal
      void persistCustomization({ ...currentCustomization, [part.slot]: part.id });
      toast.success(`${part.name} equipped.`);
      return;
    }
    const previewCustomization: AvatarCustomization = {
      ...currentCustomization,
      [part.slot]: part.id,
    };
    setBuyModal({
      name: part.name,
      price: part.priceCoins ? `${part.priceCoins.toLocaleString()} coins` : "—",
      productSlug: part.productSlug,
      mode: part.productSlug ? "coins" : "none",
      avatarPart: part,
      previewCustomization,
    });
  };

  const handleConfirm = () => {
    if (!buyModal || purchasePending) return;
    if (!buyModal.productSlug || buyModal.mode === "none") {
      toast.message("This item is not purchasable yet.");
      setBuyModal(null);
      return;
    }
    if (buyModal.mode === "stripe") {
      checkoutMutation.mutate(buyModal.productSlug);
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

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <FeaturedBundleCard
              onBuy={() => {
                if (!featuredBundleSlug) {
                  toast.error("No coin bundle available right now.");
                  return;
                }
                const product = productsBySlug.get(featuredBundleSlug);
                setBuyModal({
                  name: "Unlock Bundle",
                  price: product ? formatUsd(product.priceCents) : "$0.00",
                  productSlug: featuredBundleSlug,
                  mode: "stripe",
                });
              }}
            />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
          >
            <SectionHeader title="Buy Coins" subtitle="Power up your wallet" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
          >
            <SectionHeader title="Boosters & Helplines" subtitle="Gain the competitive edge" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {boosters.map((booster, i) => (
                <motion.div
                  key={booster.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 + i * 0.05 }}
                >
                  <BoosterCard
                    booster={booster}
                    onBuy={(b) => {
                      if (b.productSlug === "ticket_pack_3" && ticketsFull) {
                        toast.message("Tickets are already full.");
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
            <SectionHeader title="Hair" subtitle="Style your character" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {HAIR_PARTS.filter((p) => !p.free).map((part, i) => (
                <motion.div
                  key={part.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 + i * 0.04 }}
                >
                  <ItemCard
                    name={part.name}
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
            <SectionHeader title="Glasses" subtitle="Look the part" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {GLASSES_PARTS.map((part, i) => (
                <motion.div
                  key={part.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.35 + i * 0.04 }}
                >
                  <ItemCard
                    name={part.name}
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
            <SectionHeader title="Facial Hair" subtitle="Add some character" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {FACIAL_HAIR_PARTS.map((part, i) => (
                <motion.div
                  key={part.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.4 + i * 0.04 }}
                >
                  <ItemCard
                    name={part.name}
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
            <SectionHeader title="Jerseys" subtitle="Rep your colors" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {JERSEY_DESIGN_PARTS.map((part, i) => (
                <motion.div
                  key={part.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.45 + i * 0.04 }}
                >
                  <ItemCard
                    name={part.name}
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
            onClose={() => { if (!purchasePending) setBuyModal(null); }}
            onConfirm={handleConfirm}
            isPending={purchasePending}
            name={buyModal?.name ?? ""}
            price={buyModal?.price ?? ""}
            previewCustomization={buyModal?.previewCustomization}
          />

        </div>
      </div>
    </div>
  );
}
