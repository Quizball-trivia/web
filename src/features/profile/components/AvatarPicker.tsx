import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMobile";
import { avatarSeeds, getDiceBearAvatarUrl } from "@/lib/avatars";
import { purchaseStoreWithCoins } from "@/lib/repositories/store.repo";
import { useStoreInventory, useStoreProducts, type StoreProductDTO } from "@/lib/queries/store.queries";
import { queryKeys } from "@/lib/queries/queryKeys";
import { Check, Loader2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/api";
import {
  getAvatarImage,
  getAvatarLabel,
  getAvatarSeed,
  isJerseyAvatarProduct,
  isKnownPremiumAvatarSeed,
} from "@/lib/store/avatar-products";

/** Show only 8 free avatars (2 rows of 4) */
const FREE_AVATAR_LIMIT = 8;
const HIDDEN_PREMIUM_PROFILE_SLUGS = new Set<string>([
  "avatar_neymar",
  "avatar_mbappe",
  "avatar_lion",
]);
const VISIBLE_PREMIUM_PROFILE_SLUGS = new Set<string>([
  "avatar_ronaldo",
  "avatar_messi",
  "avatar_ronaldinho",
]);
function formatCoins(value: number): string {
  return `${value.toLocaleString()} coins`;
}

function toPersistedAvatarUrl(url: string): string {
  if (!url.startsWith("/")) return url;
  if (typeof window === "undefined") return url;
  return `${window.location.origin}${url}`;
}

interface AvatarPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatarUrl: string | null;
  googleAvatarUrl?: string | null;
  onSelect: (avatarUrl: string) => void;
  isSaving?: boolean;
}

export function AvatarPicker({
  open,
  onOpenChange,
  currentAvatarUrl,
  googleAvatarUrl,
  onSelect,
  isSaving = false,
}: AvatarPickerProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [lockedAvatarSlug, setLockedAvatarSlug] = useState<string | null>(null);
  const [optimisticOwnedSlugs, setOptimisticOwnedSlugs] = useState<Set<string>>(new Set());
  const { data: productsData } = useStoreProducts();
  const { data: inventoryData } = useStoreInventory();

  const premiumProducts = useMemo(() => {
    const items: Array<{
      product: StoreProductDTO;
      label: string;
      avatarUrl: string;
      avatarKey: string;
    }> = [];

    for (const item of productsData?.items ?? []) {
      if (item.type !== "avatar") continue;
      if (isJerseyAvatarProduct(item)) continue;
      if (HIDDEN_PREMIUM_PROFILE_SLUGS.has(item.slug)) continue;
      if (!VISIBLE_PREMIUM_PROFILE_SLUGS.has(item.slug)) continue;
      const avatarKey = getAvatarSeed(item);
      const avatarUrl = getAvatarImage(item, 96);
      const label = getAvatarLabel(item);

      items.push({
        product: item,
        label,
        avatarUrl,
        avatarKey,
      });
    }

    return items;
  }, [productsData]);

  const premiumAvatarKeys = useMemo(
    () => new Set(premiumProducts.map((item) => item.avatarKey)),
    [premiumProducts]
  );

  const seedUrls = useMemo(
    () =>
      avatarSeeds
        .filter((seed) => {
          const normalized = seed.toLowerCase();
          if (isKnownPremiumAvatarSeed(normalized)) return false;
          return !premiumAvatarKeys.has(normalized);
        })
        .slice(0, FREE_AVATAR_LIMIT)
        .map((seed) => ({ seed, url: getDiceBearAvatarUrl(seed, 96) })),
    [premiumAvatarKeys]
  );

  const ownedAvatarSlugs = useMemo(() => {
    const set = new Set<string>(optimisticOwnedSlugs);
    for (const item of inventoryData?.items ?? []) {
      if (item.type === "avatar") set.add(item.slug);
    }
    return set;
  }, [inventoryData, optimisticOwnedSlugs]);

  const checkoutMutation = useMutation({
    mutationFn: async (productSlug: string) => purchaseStoreWithCoins({ productSlug }),
    onSuccess: (_response, productSlug) => {
      setOptimisticOwnedSlugs((previous) => {
        const next = new Set(previous);
        next.add(productSlug);
        return next;
      });
      toast.success("Avatar unlocked.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.inventory() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
      setLockedAvatarSlug(null);

      const unlockedAvatar = premiumProducts.find((item) => item.product.slug === productSlug);
      if (unlockedAvatar) {
        onSelect(toPersistedAvatarUrl(unlockedAvatar.avatarUrl));
      }
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 400) {
        toast.error("Not enough coins for this avatar.");
        return;
      }
      if (error instanceof ApiError && error.status === 401) {
        toast.error("Session expired. Please sign in again.");
        return;
      }
      toast.error("Unable to complete purchase. Try again.");
    },
  });

  const selectedLockedProduct = premiumProducts.find((item) => item.product.slug === lockedAvatarSlug);
  const selectedLockedPrice = selectedLockedProduct?.product.priceCents ?? null;

  const handlePremiumAvatarClick = (slug: string, avatarUrl: string) => {
    const isOwned = ownedAvatarSlugs.has(slug);
    if (isOwned) {
      onSelect(toPersistedAvatarUrl(avatarUrl));
      return;
    }
    setLockedAvatarSlug(slug);
  };

  const Content = (
    <div className="space-y-4">
      {googleAvatarUrl && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Google Photo</span>
          <button
            className={cn(
              "w-full flex items-center gap-3 rounded-xl border p-2.5 transition-all",
              currentAvatarUrl === googleAvatarUrl
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/60 hover:bg-muted/30"
            )}
            onClick={() => onSelect(googleAvatarUrl)}
            disabled={isSaving}
          >
            <div className="relative size-10 rounded-full overflow-hidden border border-border">
              <Image
                src={googleAvatarUrl}
                alt="Google avatar"
                fill
                sizes="40px"
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold">Use Google photo</div>
            </div>
            {currentAvatarUrl === googleAvatarUrl && (
              <Check className="size-4 text-primary" />
            )}
          </button>
        </div>
      )}

      <div className="space-y-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Free Avatars</span>
        <div className="grid grid-cols-4 gap-2">
          {seedUrls.map(({ seed, url }) => {
            const isSelected = currentAvatarUrl === url;
            return (
              <button
                key={seed}
                className={cn(
                  "group relative rounded-xl border p-1.5 transition-all",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/60 hover:bg-muted/30"
                )}
                onClick={() => onSelect(toPersistedAvatarUrl(url))}
                disabled={isSaving}
              >
                <div className="relative mx-auto size-16 rounded-full overflow-hidden border border-border bg-background">
                  <Image src={url} alt={seed} fill sizes="64px" className="object-cover" unoptimized />
                </div>
                <div className="mt-1.5 text-[10px] font-medium text-muted-foreground capitalize truncate">
                  {seed.replace(/-/g, " ")}
                </div>
                {isSelected && (
                  <div className="absolute top-1 right-1 size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="size-2.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Premium</span>
          <Sparkles className="size-3 text-amber-400" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {premiumProducts.map((premium) => {
            const isOwned = ownedAvatarSlugs.has(premium.product.slug);
            const avatarUrl = premium.avatarUrl;
            const isSelected = currentAvatarUrl === avatarUrl;

            return (
              <button
                key={premium.product.slug}
                type="button"
                className={cn(
                  "group relative rounded-xl border p-1.5 text-left transition-all",
                  isOwned
                    ? isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/60 hover:bg-muted/30"
                    : "border-border/70 bg-muted/20 hover:border-amber-500/60"
                )}
                onClick={() => handlePremiumAvatarClick(premium.product.slug, avatarUrl)}
                disabled={isSaving || checkoutMutation.isPending}
              >
                <div className="relative mx-auto size-16 rounded-full overflow-hidden border border-border bg-background">
                  <Image src={avatarUrl} alt={premium.label} fill sizes="64px" className="object-cover" unoptimized />
                  {!isOwned ? (
                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                      <Lock className="size-3.5 text-white" />
                    </div>
                  ) : null}
                </div>
                <div className="mt-1.5 text-[10px] font-medium text-muted-foreground">
                  {premium.label}
                </div>
                {isOwned && isSelected ? (
                  <div className="absolute top-1 right-1 size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="size-2.5" />
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSaving}>
          Close
        </Button>
      </div>

      <Dialog open={open && lockedAvatarSlug !== null} onOpenChange={(next) => !next && setLockedAvatarSlug(null)}>
        <DialogContent className="sm:max-w-md border-border/60">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Premium avatar locked</DialogTitle>
            <DialogDescription>
              {selectedLockedProduct
                ? `${selectedLockedProduct.label} is a premium avatar. Buy it to unlock and use it in your profile.`
                : "This premium avatar is locked."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2">
            <span className="text-sm font-semibold">
              {selectedLockedProduct?.label ?? "Premium Avatar"}
            </span>
            <span className="text-sm font-black text-amber-300">
              {selectedLockedPrice !== null ? formatCoins(selectedLockedPrice) : "Unavailable"}
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setLockedAvatarSlug(null);
                onOpenChange(false);
                router.push("/store");
              }}
            >
              Open Store
            </Button>
            <Button
              onClick={() => {
                if (!lockedAvatarSlug || !selectedLockedProduct) return;
                checkoutMutation.mutate(lockedAvatarSlug);
              }}
              disabled={!selectedLockedProduct || checkoutMutation.isPending}
            >
              {checkoutMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Processing
                </span>
              ) : (
                "Buy with coins"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-border/50">
          <SheetHeader className="mb-3 text-left">
            <SheetTitle className="text-lg font-bold">Profile Avatar</SheetTitle>
          </SheetHeader>
          {Content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85dvh] overflow-y-auto border-border/50">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Profile Avatar</DialogTitle>
          <DialogDescription>Choose an avatar for your profile.</DialogDescription>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
