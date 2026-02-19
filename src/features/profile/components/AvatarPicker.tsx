import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMobile";
import { avatarSeeds, getDiceBearAvatarUrl } from "@/lib/avatars";
import { createStoreCheckout } from "@/lib/repositories/store.repo";
import { useStoreInventory, useStoreProducts, type StoreProductDTO } from "@/lib/queries/store.queries";
import { queryKeys } from "@/lib/queries/queryKeys";
import { Check, Loader2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";

const PREMIUM_AVATAR_CONFIG = [
  { slug: "avatar_ronaldo", seed: "ronaldo", label: "Ronaldo" },
  { slug: "avatar_messi", seed: "messi", label: "Messi" },
  { slug: "avatar_neymar", seed: "neymar", label: "Neymar" },
  { slug: "avatar_mbappe", seed: "mbappe", label: "Mbappe" },
] as const;

const PREMIUM_SEEDS: ReadonlySet<string> = new Set(PREMIUM_AVATAR_CONFIG.map((item) => item.seed));

/** Show only 8 free avatars (2 rows of 4) */
const FREE_AVATAR_LIMIT = 8;

function formatUsd(priceCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100);
}

function readAvatarMetadata(
  metadata: unknown
): { avatarKey?: string; assetUrl?: string } | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = metadata as { avatarKey?: unknown; assetUrl?: unknown };
  return {
    avatarKey: typeof raw.avatarKey === "string" ? raw.avatarKey : undefined,
    assetUrl: typeof raw.assetUrl === "string" ? raw.assetUrl : undefined,
  };
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
  const { data: productsData } = useStoreProducts();
  const { data: inventoryData } = useStoreInventory();

  useEffect(() => {
    if (!open) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.store.inventory() });
  }, [open, queryClient]);

  const seedUrls = useMemo(
    () =>
      avatarSeeds
        .filter((seed) => !PREMIUM_SEEDS.has(seed))
        .slice(0, FREE_AVATAR_LIMIT)
        .map((seed) => ({ seed, url: getDiceBearAvatarUrl(seed, 96) })),
    []
  );

  const premiumProductsBySlug = useMemo(() => {
    const map = new Map<string, StoreProductDTO>();
    for (const item of productsData?.items ?? []) {
      if (item.type !== "avatar") continue;
      map.set(item.slug, item);
    }
    return map;
  }, [productsData]);

  const ownedAvatarSlugs = useMemo(() => {
    const set = new Set<string>();
    for (const item of inventoryData?.items ?? []) {
      if (item.type === "avatar") set.add(item.slug);
    }
    return set;
  }, [inventoryData]);

  const checkoutMutation = useMutation({
    mutationFn: async (productSlug: string) => createStoreCheckout({ productSlug }),
    onSuccess: (result) => {
      window.location.href = result.url;
    },
    onError: () => {
      toast.error("Unable to start checkout. Try again.");
    },
  });

  const selectedLockedConfig = PREMIUM_AVATAR_CONFIG.find((item) => item.slug === lockedAvatarSlug) ?? null;
  const selectedLockedProduct = lockedAvatarSlug ? premiumProductsBySlug.get(lockedAvatarSlug) : undefined;
  const selectedLockedPrice = selectedLockedProduct?.priceCents ?? null;

  const handlePremiumAvatarClick = (slug: string, avatarUrl: string) => {
    const isOwned = ownedAvatarSlugs.has(slug);
    if (isOwned) {
      onSelect(avatarUrl);
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
                onClick={() => onSelect(url)}
                disabled={isSaving}
              >
                <div className="relative mx-auto size-12 rounded-full overflow-hidden border border-border bg-background">
                  <Image src={url} alt={seed} fill sizes="48px" className="object-cover" unoptimized />
                </div>
                <div className="mt-1 text-[9px] font-medium text-muted-foreground capitalize truncate">
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
          {PREMIUM_AVATAR_CONFIG.map((premium) => {
            const product = premiumProductsBySlug.get(premium.slug);
            const parsedMetadata = readAvatarMetadata(product?.metadata);
            const avatarUrl = parsedMetadata?.assetUrl ?? getDiceBearAvatarUrl(premium.seed, 96);
            const isOwned = ownedAvatarSlugs.has(premium.slug);
            const isSelected = currentAvatarUrl === avatarUrl;

            return (
              <button
                key={premium.slug}
                type="button"
                className={cn(
                  "group relative rounded-xl border p-1.5 text-left transition-all",
                  isOwned
                    ? isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/60 hover:bg-muted/30"
                    : "border-border/70 bg-muted/20 hover:border-amber-500/60"
                )}
                onClick={() => handlePremiumAvatarClick(premium.slug, avatarUrl)}
                disabled={isSaving || checkoutMutation.isPending}
              >
                <div className="relative mx-auto size-12 rounded-full overflow-hidden border border-border bg-background">
                  <Image src={avatarUrl} alt={premium.label} fill sizes="48px" className="object-cover" unoptimized />
                  {!isOwned ? (
                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                      <Lock className="size-3.5 text-white" />
                    </div>
                  ) : null}
                </div>
                <div className="mt-1 text-[9px] font-medium text-muted-foreground">
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
              {selectedLockedConfig
                ? `${selectedLockedConfig.label} is a premium avatar. Buy it to unlock and use it in your profile.`
                : "This premium avatar is locked."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2">
            <span className="text-sm font-semibold">
              {selectedLockedConfig?.label ?? "Premium Avatar"}
            </span>
            <span className="text-sm font-black text-amber-300">
              {selectedLockedPrice !== null ? formatUsd(selectedLockedPrice) : "Unavailable"}
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
                  Redirecting
                </span>
              ) : (
                "Buy now"
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
      <DialogContent className="sm:max-w-lg max-h-[85dvh] overflow-y-auto border-border/50">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Profile Avatar</DialogTitle>
          <DialogDescription>Choose an avatar for your profile.</DialogDescription>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
