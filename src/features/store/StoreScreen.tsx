import { FeaturedBundleCard } from "./components/FeaturedBundleCard";
import { BundleCard, type BundleProps } from "./components/BundleCard";
import { User, Shirt, Shield, Sparkles, Zap, Target, Coins, Ticket } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/api";
import { createStoreCheckout, purchaseStoreWithCoins } from "@/lib/repositories/store.repo";
import { queryKeys } from "@/lib/queries/queryKeys";
import { useStoreProducts, useStoreWallet } from "@/lib/queries/store.queries";
import { trackItemPurchased } from "@/lib/analytics/game-events";
import { getAvatarImage, getAvatarLabel, isJerseyAvatarProduct, type AvatarStoreProductLike } from "@/lib/store/avatar-products";

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
  icon: ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  borderBottomColor: string;
  glowColor: string;
  productSlug?: string;
  disabled?: boolean;
}

interface AvatarItem {
  id: string;
  name: string;
  image: string;
  price: number;
  rarity: "common" | "rare" | "epic";
  productSlug?: string;
}

const STORE_AVATAR_ORDER: readonly string[] = [
  "avatar_striker",
  "avatar_captain",
  "avatar_goalkeeper",
  "avatar_legend",
  "avatar_ronaldo",
  "avatar_messi",
  "avatar_ronaldinho",
] as const;

const STORE_AVATAR_RARITY: Record<string, AvatarItem["rarity"]> = {
  avatar_striker: "common",
  avatar_captain: "rare",
  avatar_goalkeeper: "rare",
  avatar_legend: "epic",
  avatar_ronaldo: "epic",
  avatar_messi: "epic",
  avatar_ronaldinho: "epic",
};

interface CosmeticItem {
  id: string;
  name: string;
  image: string;
  price: number;
  type: "jersey" | "accessory";
  productSlug?: string;
}

const RARITY_STYLES = {
  common: { border: "border-[#56707A]/40", borderBottom: "border-b-[#56707A]/60", badge: "bg-[#56707A]/20 text-[#56707A]", glow: "bg-[#56707A]" },
  rare: { border: "border-[#1CB0F6]/40", borderBottom: "border-b-[#1CB0F6]/60", badge: "bg-[#1CB0F6]/20 text-[#1CB0F6]", glow: "bg-[#1CB0F6]" },
  epic: { border: "border-[#CE82FF]/40", borderBottom: "border-b-[#CE82FF]/60", badge: "bg-[#CE82FF]/20 text-[#CE82FF]", glow: "bg-[#CE82FF]" },
} as const;

interface BuyModalState {
  name: string;
  price: string;
  productSlug?: string;
  mode: "stripe" | "coins" | "none";
}

function SectionHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="size-10 rounded-xl bg-[#1CB0F6]/10 border-2 border-b-4 border-[#1CB0F6]/30 border-b-[#1CB0F6]/50 flex items-center justify-center text-[#1CB0F6]">
        {icon}
      </div>
      <div>
        <h3 className="font-black font-fun text-lg tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-[#56707A] font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}

function BoosterCard({ booster, onBuy }: { booster: BoosterItem; onBuy: (b: BoosterItem) => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className={cn(
        "relative flex flex-col items-center rounded-2xl border-2 border-b-4 bg-[#1B2F36] p-5 h-full overflow-hidden transition-colors",
        booster.borderColor, booster.borderBottomColor
      )}>
        <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-28 rounded-full blur-[50px] opacity-20", booster.glowColor)} />

        <div className={cn(
          "size-14 rounded-2xl flex items-center justify-center border-2 border-b-4 mb-3",
          booster.bgColor, booster.borderColor, booster.borderBottomColor, booster.color
        )}>
          {booster.icon}
        </div>

        <div className="text-center mb-4 flex-1">
          <div className="font-black font-fun text-sm leading-tight mb-1">{booster.title}</div>
          <div className="text-[11px] text-[#56707A] font-medium leading-tight">{booster.description}</div>
        </div>

        <Button
          type="button"
          onClick={() => onBuy(booster)}
          disabled={booster.disabled}
          className="w-full font-black text-sm rounded-xl border-b-4 active:border-b-0 active:mt-1 transition-all bg-[#FF9600] hover:bg-[#FF9600]/90 border-[#CC7800] text-white"
        >
          <Coins className="size-3.5 mr-1 fill-current" />
          {booster.disabled ? "Full" : booster.price}
        </Button>
      </div>
    </motion.div>
  );
}

function AvatarCard({ avatar, onBuy }: { avatar: AvatarItem; onBuy: (a: AvatarItem) => void }) {
  const style = RARITY_STYLES[avatar.rarity];

  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className={cn(
        "relative flex flex-col items-center rounded-2xl border-2 border-b-4 bg-[#1B2F36] p-5 h-full overflow-hidden transition-colors",
        style.border, style.borderBottom
      )}>
        <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-28 rounded-full blur-[50px] opacity-20", style.glow)} />

        <div className={cn("absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full", style.badge)}>
          {avatar.rarity}
        </div>

        <div className="size-32 md:size-36 flex items-center justify-center mb-2">
          <img src={avatar.image} alt={avatar.name} className="size-full object-contain drop-shadow-lg" />
        </div>

        <div className="text-center mb-3">
          <div className="font-black font-fun text-base">{avatar.name}</div>
          <div className="text-[10px] font-bold uppercase text-[#56707A] tracking-wider">Player</div>
        </div>

        <Button
          type="button"
          onClick={() => onBuy(avatar)}
          className="w-full font-black text-sm rounded-xl border-b-4 active:border-b-0 active:mt-1 transition-all bg-[#FF9600] hover:bg-[#FF9600]/90 border-[#CC7800] text-white"
        >
          <Coins className="size-3.5 mr-1 fill-current" />
          {avatar.price.toLocaleString()}
        </Button>
      </div>
    </motion.div>
  );
}

function CosmeticCard({ item, onBuy }: { item: CosmeticItem; onBuy: (c: CosmeticItem) => void }) {
  const isJersey = item.type === "jersey";

  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className={cn(
        "relative flex flex-col items-center rounded-2xl border-2 border-b-4 bg-[#1B2F36] p-5 h-full overflow-hidden transition-colors",
        isJersey
          ? "border-[#1CB0F6]/30 border-b-[#1CB0F6]/50"
          : "border-[#CE82FF]/30 border-b-[#CE82FF]/50"
      )}>
        <div className={cn(
          "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-28 rounded-full blur-[50px] opacity-20",
          isJersey ? "bg-[#1CB0F6]" : "bg-[#CE82FF]"
        )} />

        <div className={cn(
          "absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
          isJersey ? "bg-[#1CB0F6]/20 text-[#1CB0F6]" : "bg-[#CE82FF]/20 text-[#CE82FF]"
        )}>
          {item.type}
        </div>

        <div className={cn(
          "size-24 rounded-2xl border-2 border-b-4 flex items-center justify-center mb-3 overflow-hidden bg-white/5 p-2",
          isJersey
            ? "border-[#1CB0F6]/30 border-b-[#1CB0F6]/50"
            : "border-[#CE82FF]/30 border-b-[#CE82FF]/50"
        )}>
          <img src={item.image} alt={item.name} className="size-full object-contain" />
        </div>

        <div className="text-center mb-4">
          <div className="font-black font-fun text-sm">{item.name}</div>
        </div>

        <Button
          type="button"
          onClick={() => onBuy(item)}
          className="w-full font-black text-sm rounded-xl border-b-4 active:border-b-0 active:mt-1 transition-all bg-[#FF9600] hover:bg-[#FF9600]/90 border-[#CC7800] text-white"
        >
          <Coins className="size-3.5 mr-1 fill-current" />
          {item.price.toLocaleString()}
        </Button>
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
  const [buyModal, setBuyModal] = useState<BuyModalState | null>(null);
  const ticketsFull = (wallet?.tickets ?? 0) >= 10;

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
    const config: Array<{ id: string; title: string; amount: number; bonus?: number; isPopular?: boolean; slug: string }> = [
      { id: "1", title: "Handful", amount: 100, slug: "coin_pack_100" },
      { id: "2", title: "Pouch", amount: 550, bonus: 10, isPopular: true, slug: "coin_pack_550" },
      { id: "3", title: "Chest", amount: 1200, bonus: 20, slug: "coin_pack_1200" },
      { id: "4", title: "Vault", amount: 3000, bonus: 50, slug: "coin_pack_3000" },
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
    const ticketProduct = productsBySlug.get("ticket_pack_3");
    const ticketPrice = ticketProduct ? formatUsd(ticketProduct.priceCents) : "$1.99";
    const fiftyPrice = productsBySlug.get("chance_card_5050")?.priceCents ?? 200;
    return [
      {
        id: "xp",
        title: "2x XP Boost",
        description: "Double your XP for 1 hour",
        price: "500",
        icon: <Zap className="size-7" />,
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/30",
        borderBottomColor: "border-b-yellow-600/50",
        glowColor: "bg-yellow-500",
      },
      {
        id: "rank",
        title: "2x Rank Pts",
        description: "Double rank points for 1 hour",
        price: "500",
        icon: <Shield className="size-7" />,
        color: "text-[#1CB0F6]",
        bgColor: "bg-[#1CB0F6]/10",
        borderColor: "border-[#1CB0F6]/30",
        borderBottomColor: "border-b-[#1CB0F6]/50",
        glowColor: "bg-[#1CB0F6]",
      },
      {
        id: "fifty",
        title: "50/50 Helpline",
        description: "Removes two wrong answers",
        price: `${fiftyPrice}`,
        productSlug: "chance_card_5050",
        icon: <Target className="size-7" />,
        color: "text-[#CE82FF]",
        bgColor: "bg-[#CE82FF]/10",
        borderColor: "border-[#CE82FF]/30",
        borderBottomColor: "border-b-[#CE82FF]/50",
        glowColor: "bg-[#CE82FF]",
      },
      {
        id: "tickets",
        title: "Extra Tickets",
        description: "Top up ranked tickets up to the 10-ticket cap",
        price: ticketPrice,
        productSlug: "ticket_pack_3",
        icon: <Ticket className="size-7 fill-current" />,
        color: "text-[#58CC02]",
        bgColor: "bg-[#58CC02]/10",
        borderColor: "border-[#58CC02]/30",
        borderBottomColor: "border-b-[#58CC02]/50",
        glowColor: "bg-[#58CC02]",
        disabled: ticketsFull,
      },
    ];
  }, [productsBySlug, ticketsFull]);

  const avatars = useMemo<AvatarItem[]>(() => {
    const orderMap = new Map(STORE_AVATAR_ORDER.map((slug, index) => [slug, index]));

    return (productsData?.items ?? [])
      .filter((item) => item.type === "avatar")
      .filter((item) => !isJerseyAvatarProduct(item as AvatarStoreProductLike))
      .filter((item) => orderMap.has(item.slug))
      .sort((a, b) => (orderMap.get(a.slug) ?? 999) - (orderMap.get(b.slug) ?? 999))
      .map((item) => ({
        id: item.id,
        name: getAvatarLabel(item),
        image: getAvatarImage(item, 160),
        price: item.priceCents,
        rarity: STORE_AVATAR_RARITY[item.slug] ?? "epic",
        productSlug: item.slug,
      }));
  }, [productsData]);

  const cosmetics = useMemo<CosmeticItem[]>(() => {
    const getPrice = (slug: string, fallback: number) => productsBySlug.get(slug)?.priceCents ?? fallback;
    return [
      { id: "j1", name: "Home Jersey", image: "/assets/store/jersey1.svg", type: "jersey", price: getPrice("avatar_jersey_home", 800), productSlug: "avatar_jersey_home" },
      { id: "j2", name: "Away Jersey", image: "/assets/store/jersey2.svg", type: "jersey", price: getPrice("avatar_jersey_away", 800), productSlug: "avatar_jersey_away" },
      { id: "j3", name: "Third Kit", image: "/assets/store/jersey3.svg", type: "jersey", price: getPrice("avatar_jersey_third", 1000), productSlug: "avatar_jersey_third" },
      { id: "j4", name: "Retro Kit", image: "/assets/store/jersey4.svg", type: "jersey", price: getPrice("avatar_jersey_retro", 1200), productSlug: "avatar_jersey_retro" },
      { id: "j5", name: "Special Edition", image: "/assets/store/jersey5.svg", type: "jersey", price: getPrice("avatar_jersey_special", 1500), productSlug: "avatar_jersey_special" },
      { id: "j6", name: "Gold Kit", image: "/assets/store/jersey6.svg", type: "jersey", price: getPrice("avatar_jersey_gold", 2000), productSlug: "avatar_jersey_gold" },
    ];
  }, [productsBySlug]);

  const purchasePending = checkoutMutation.isPending || coinPurchaseMutation.isPending;

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
    coinPurchaseMutation.mutate(buyModal.productSlug, {
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
            <SectionHeader icon={<Sparkles className="size-5" />} title="Buy Coins" subtitle="Power up your wallet" />
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
            <SectionHeader icon={<Zap className="size-5" />} title="Boosters & Helplines" subtitle="Gain the competitive edge" />
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
                      if (b.productSlug === "ticket_pack_10" && ticketsFull) {
                        toast.message("Tickets are already full.");
                        return;
                      }
                      if (b.productSlug === "ticket_pack_3" && ticketsFull) {
                        toast.message("Tickets are already full.");
                        return;
                      }
                      setBuyModal({
                        name: b.title,
                        price: b.price,
                        productSlug: b.productSlug,
                        mode: b.productSlug === "ticket_pack_3" ? "stripe" : (b.productSlug ? "coins" : "none"),
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
            <SectionHeader icon={<User className="size-5" />} title="Avatars" subtitle="Show off your style" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {avatars.map((avatar, i) => (
                <motion.div
                  key={avatar.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 + i * 0.05 }}
                >
                  <AvatarCard
                    avatar={avatar}
                    onBuy={(a) => setBuyModal({
                      name: a.name,
                      price: `${a.price} coins`,
                      productSlug: a.productSlug,
                      mode: a.productSlug ? "coins" : "none",
                    })}
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
            <SectionHeader icon={<Shirt className="size-5" />} title="Jerseys" subtitle="Rep your colors" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {cosmetics.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.4 + i * 0.05 }}
                >
                  <CosmeticCard
                    item={item}
                    onBuy={(c) => setBuyModal({
                      name: c.name,
                      price: `${c.price} coins`,
                      productSlug: c.productSlug,
                      mode: c.productSlug ? "coins" : "none",
                    })}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>

          <AnimatePresence>
            {buyModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                onClick={() => { if (!purchasePending) setBuyModal(null); }}
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: 20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="bg-[#1B2F36] rounded-3xl border-2 border-b-4 border-[#1CB0F6]/30 border-b-[#1CB0F6]/50 p-8 shadow-2xl flex flex-col items-center gap-5 min-w-[320px] relative overflow-hidden"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-40 rounded-full blur-[80px] opacity-20 bg-[#1CB0F6]" />

                  <div className="size-16 rounded-2xl bg-[#FF9600]/10 border-2 border-b-4 border-[#FF9600]/30 border-b-[#FF9600]/50 flex items-center justify-center">
                    <Coins className="size-8 text-[#FF9600] fill-[#FF9600]" />
                  </div>

                  <div className="text-center">
                    <h3 className="text-xl font-black font-fun mb-1">Confirm Purchase</h3>
                    <div className="text-sm text-[#56707A] font-medium">{buyModal.name}</div>
                  </div>

                  <div className="bg-[#FF9600]/10 border-2 border-[#FF9600]/30 rounded-xl px-6 py-2">
                    <span className="text-[#FF9600] font-black font-fun text-lg">{buyModal.price}</span>
                  </div>

                  <div className="flex gap-3 w-full">
                    <Button
                      type="button"
                      disabled={purchasePending}
                      className="flex-1 font-black rounded-xl border-b-4 active:border-b-0 active:mt-1 transition-all bg-[#58CC02] hover:bg-[#58CC02]/90 border-[#46A302] text-white disabled:opacity-60 disabled:pointer-events-none"
                      onClick={handleConfirm}
                    >
                      {purchasePending ? 'Processing...' : 'Confirm'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={purchasePending}
                      className="flex-1 font-black rounded-xl border-b-4 active:border-b-0 active:mt-1 transition-all border-[#2A4550] bg-[#1B2F36] hover:bg-[#243B44] text-[#56707A]"
                      onClick={() => setBuyModal(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
