"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ModalCloseButton } from "@/components/shared/ModalCloseButton";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMobile";
import {
  customizationFromAvatarValue,
  encodeAvatarCustomization,
} from "@/lib/avatars";
import {
  ALL_AVATAR_PARTS,
  HAIR_PARTS,
  GLASSES_PARTS,
  FACIAL_HAIR_PARTS,
  JERSEY_PARTS,
  SKIN_PARTS,
  type AvatarPart,
  type SkinPart,
} from "@/lib/avatars/parts";
import { useStoreInventory } from "@/lib/queries/store.queries";
import { AvatarPreview } from "@/components/AvatarPreview";
import { Check, Loader2, Lock, X } from "lucide-react";
import { purchaseStoreWithCoins } from "@/lib/repositories/store.repo";
import { queryKeys } from "@/lib/queries/queryKeys";
import { ApiError } from "@/lib/api/api";
import { useLocale } from "@/contexts/LocaleContext";
import { translatePartName } from "@/lib/avatars/partNames";
import type { AvatarCustomization } from "@/types/game";

type SlotTab = "skin" | "jersey" | "hair" | "glasses" | "facialHair";

const TAB_ORDER: SlotTab[] = ["skin", "jersey", "hair", "glasses", "facialHair"];

const PURPLE = "#BA02E8";

interface AvatarPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCustomization?: AvatarCustomization | null;
  onSelect: (avatarUrl: string) => void;
  isSaving?: boolean;
}

export function AvatarPicker({
  open,
  onOpenChange,
  currentCustomization,
  onSelect,
  isSaving = false,
}: AvatarPickerProps) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { t } = useLocale();
  const { data: inventoryData } = useStoreInventory();
  const [activeTab, setActiveTab] = useState<SlotTab>("skin");

  const TAB_LABELS: Record<SlotTab, string> = {
    skin: t('profile.avatarPicker.tabSkin'),
    jersey: t('profile.avatarPicker.tabJersey'),
    hair: t('profile.avatarPicker.tabHair'),
    glasses: t('profile.avatarPicker.tabGlasses'),
    facialHair: t('profile.avatarPicker.tabFacialHair'),
  };
  const [pendingPurchase, setPendingPurchase] = useState<{
    type: "skin" | "part";
    skin?: SkinPart;
    part?: AvatarPart;
  } | null>(null);

  /** The committed customization (from props). Missing → default avatar. */
  const current = useMemo<AvatarCustomization>(
    () => currentCustomization ?? customizationFromAvatarValue(null),
    [currentCustomization],
  );

  // Working "draft" look — selecting items only PREVIEWS them here; nothing is
  // saved until the user taps Save. Lets the user try multiple parts together.
  // Re-seeded from the committed look on each OPEN transition (so reopening
  // discards an unsaved draft). Uses the React "adjust state during render"
  // pattern (compare a tracked value, no setState-in-effect).
  const [draft, setDraft] = useState<AvatarCustomization>(current);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(current); // re-seed on the closed→open transition
  }
  const isDirty = encodeAvatarCustomization(draft) !== encodeAvatarCustomization(current);

  /** Set of part ids the user owns (free + purchased). In dev mode, everything is unlocked
   *  so designers/devs can preview all items in the picker. */
  const ownedPartIds = useMemo(() => {
    const set = new Set<string>();
    if (process.env.NODE_ENV === "development") {
      for (const part of ALL_AVATAR_PARTS) set.add(part.id);
      for (const skin of SKIN_PARTS) set.add(skin.id);
      return set;
    }
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

  // Commit the draft look (called by the Save button).
  const handleSave = () => {
    onSelect(encodeAvatarCustomization(draft));
  };

  const purchaseMutation = useMutation({
    mutationFn: async (productSlug: string) => purchaseStoreWithCoins({ productSlug }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.inventory() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
      const p = pendingPurchase;
      // Apply the freshly-bought item to the DRAFT (preview). It's saved when the
      // user taps Save, like any other selection.
      if (p?.type === "skin" && p.skin) {
        setDraft((d) => ({ ...d, skin: p.skin!.id }));
        toast.success(t('profile.skinEquipped', { name: translatePartName(p.skin.name, t) }));
      } else if (p?.type === "part" && p.part) {
        setDraft((d) => ({ ...d, [p.part!.slot]: p.part!.id }));
        toast.success(t('profile.partEquipped', { name: translatePartName(p.part.name, t) }));
      }
      setPendingPurchase(null);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 400) {
        toast.error(t('profile.notEnoughCoins'));
        return;
      }
      toast.error(t('profile.purchaseFailedRetry'));
    },
  });

  const handleSelectSkin = (skin: SkinPart) => {
    // Owned/free → preview in the draft (saved on Save). Locked → buy first.
    if (skin.free || ownedPartIds.has(skin.id)) {
      setDraft((d) => ({ ...d, skin: skin.id }));
      return;
    }
    if (skin.productSlug) {
      setPendingPurchase({ type: "skin", skin });
    }
  };

  const handleSelectPart = (
    slot: "jersey" | "hair" | "glasses" | "facialHair",
    part: AvatarPart | null,
  ) => {
    if (part === null) {
      setDraft((d) => {
        const next = { ...d };
        delete next[slot];
        return next;
      });
      return;
    }
    if (part.free || ownedPartIds.has(part.id)) {
      setDraft((d) => ({ ...d, [slot]: part.id }));
      return;
    }
    if (part.productSlug) {
      setPendingPurchase({ type: "part", part });
    }
  };

  const TabBar = (
    <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
      {TAB_ORDER.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.04em] transition-colors",
              isActive ? "text-white" : "text-white/55 hover:text-white/80",
            )}
            style={{
              backgroundColor: isActive ? PURPLE : "transparent",
              border: `1.5px solid ${isActive ? PURPLE : "rgba(255,255,255,0.1)"}`,
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        );
      })}
    </div>
  );

  /** Skin tab — shows 4 skins; locked ones open the buy modal. */
  const SkinTab = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {SKIN_PARTS.map((skin) => {
        const owned = ownedPartIds.has(skin.id);
        const selected = draft.skin === skin.id;
        const previewCustomization: AvatarCustomization = { ...draft, skin: skin.id };
        return (
          <button
            key={skin.id}
            type="button"
            disabled={isSaving}
            onClick={() => handleSelectSkin(skin)}
            className="group relative flex flex-col items-center gap-2 rounded-2xl bg-surface-page py-3 transition-all active:translate-y-[1px]"
            style={{
              border: `2px solid ${selected ? PURPLE : "rgba(255,255,255,0.1)"}`,
            }}
          >
            <div className="relative flex h-32 sm:h-36 items-center justify-center">
              <AvatarPreview customization={previewCustomization} width={isMobile ? 100 : 120} />
              {!owned && (
                <div className="absolute inset-0 rounded-2xl bg-black/25 flex items-center justify-center">
                  <Lock className="size-5 text-white/80" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/70">
                {translatePartName(skin.name, t)}
              </span>
              {!owned && skin.priceCoins && (
                <span className="text-[9px] font-black uppercase tracking-wider text-brand-yellow">
                  {skin.priceCoins}
                </span>
              )}
            </div>
            {selected && (
              <div
                className="absolute top-2 right-2 size-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: PURPLE }}
              >
                <Check className="size-3 text-white" strokeWidth={3} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  /** Generic owned-parts grid for jersey/hair/glasses/facialHair. */
  const renderSlotGrid = (
    slot: "jersey" | "hair" | "glasses" | "facialHair",
    parts: AvatarPart[],
  ) => {
    const currentValue = draft[slot];

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {/* "None" option */}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSelectPart(slot, null)}
            className="group relative flex flex-col items-center justify-center gap-2 rounded-2xl bg-surface-page py-3 transition-all active:translate-y-[1px]"
            style={{
              border: `2px solid ${!currentValue ? PURPLE : "rgba(255,255,255,0.1)"}`,
            }}
          >
            <div className="flex size-20 sm:size-24 items-center justify-center rounded-full border-2 border-dashed border-white/20">
              <X className="size-8 text-white/40" strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-white/70">
              {t('profile.avatarPicker.none')}
            </span>
            {!currentValue && (
              <div
                className="absolute top-2 right-2 size-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: PURPLE }}
              >
                <Check className="size-3 text-white" strokeWidth={3} />
              </div>
            )}
          </button>

          {parts.map((part) => {
            const owned = ownedPartIds.has(part.id);
            const selected = currentValue === part.id;
            return (
              <button
                key={part.id}
                type="button"
                disabled={isSaving}
                onClick={() => handleSelectPart(slot, part)}
                className="group relative flex flex-col items-center gap-2 rounded-2xl bg-surface-page py-3 transition-all active:translate-y-[1px]"
                style={{
                  border: `2px solid ${selected ? PURPLE : "rgba(255,255,255,0.1)"}`,
                }}
              >
                <div className="relative flex size-20 sm:size-24 items-center justify-center">
                  <Image
                    src={part.asset}
                    alt={part.name}
                    width={96}
                    height={96}
                    unoptimized
                    className="max-h-full w-auto object-contain"
                  />
                  {!owned && (
                    <div className="absolute inset-0 rounded-2xl bg-black/25 flex items-center justify-center">
                      <Lock className="size-4 text-white/80" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="max-w-[96px] text-center text-[10px] font-black uppercase tracking-wider leading-tight text-white/70 line-clamp-2">
                    {translatePartName(part.name, t)}
                  </span>
                  {!owned && part.priceCoins && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-brand-yellow">
                      {part.priceCoins}
                    </span>
                  )}
                </div>
                {selected && (
                  <div
                    className="absolute top-2 right-2 size-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: PURPLE }}
                  >
                    <Check className="size-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const Content = (
    <div className="space-y-4">
      {/* Live preview of the avatar — solid dark panel (not translucent, which
          would pick up the blue modal behind it). */}
      <div className="flex justify-center rounded-2xl border border-white/10 bg-surface-page pt-1 pb-2">
        <AvatarPreview customization={draft} width={isMobile ? 140 : 160} />
      </div>

      {TabBar}

      <div className="pt-1">
        {activeTab === "skin" && SkinTab}
        {activeTab === "jersey" && renderSlotGrid("jersey", JERSEY_PARTS)}
        {activeTab === "hair" && renderSlotGrid("hair", HAIR_PARTS)}
        {activeTab === "glasses" && renderSlotGrid("glasses", GLASSES_PARTS)}
        {activeTab === "facialHair" && renderSlotGrid("facialHair", FACIAL_HAIR_PARTS)}
      </div>

      {/* In-picker buy confirmation for locked items — brand-styled like the
          mode-confirm modal: red square close, green confirm, red-outline cancel. */}
      {pendingPurchase && (
        <Dialog open onOpenChange={() => setPendingPurchase(null)}>
          <DialogContent className="sm:max-w-md border-0 bg-brand-blue [&>button:last-child]:hidden">
            <ModalCloseButton onClose={() => setPendingPurchase(null)} />
            <DialogHeader>
              <DialogTitle className="pr-12 text-lg font-black uppercase tracking-wide text-white">
                {t('profile.purchase.confirmTitle')}
              </DialogTitle>
              <DialogDescription className="text-white/60">
                {pendingPurchase.type === "skin"
                  ? t('profile.purchase.unlockSkin', { name: translatePartName(pendingPurchase.skin?.name ?? '', t) })
                  : t('profile.purchase.unlockPart', { name: translatePartName(pendingPurchase.part?.name ?? '', t) })}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-2">
              <AvatarPreview
                customization={
                  pendingPurchase.type === "skin"
                    ? { ...draft, skin: pendingPurchase.skin!.id }
                    : { ...draft, [pendingPurchase.part!.slot]: pendingPurchase.part!.id }
                }
                width={140}
              />
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] uppercase tracking-[0.04em] text-white/50">{t('profile.purchase.price')}</span>
                <span className="text-[24px]" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: PURPLE }}>
                  {pendingPurchase.type === "skin"
                    ? pendingPurchase.skin?.priceCoins
                    : pendingPurchase.part?.priceCoins}
                </span>
                <span className="text-[10px] uppercase tracking-[0.04em] text-white/50">{t('profile.purchase.coinsLabel')}</span>
              </div>
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setPendingPurchase(null)}
                  disabled={purchaseMutation.isPending}
                  className="h-12 flex-1 rounded-[28px] border-2 border-brand-red-soft/70 bg-transparent font-poppins text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-brand-red-soft/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  disabled={purchaseMutation.isPending}
                  onClick={() => {
                    const slug =
                      pendingPurchase.type === "skin"
                        ? pendingPurchase.skin?.productSlug
                        : pendingPurchase.part?.productSlug;
                    if (slug) purchaseMutation.mutate(slug);
                  }}
                  className="h-12 flex-1 rounded-[28px] bg-brand-green font-poppins text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-brand-green-deep disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {purchaseMutation.isPending ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      {t('profile.purchase.processing')}
                    </span>
                  ) : (
                    t('profile.purchase.confirm')
                  )}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Save — commits the whole previewed look at once. Sticks to the bottom so
          it's reachable after trying several parts. Disabled until something changed. */}
      <div className="sticky bottom-0 -mx-5 mt-2 border-t border-white/15 bg-brand-blue px-5 py-3 sm:-mx-8 sm:px-8">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="h-12 w-full rounded-[28px] bg-brand-green font-poppins text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-brand-green-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              {t('common.save')}
            </span>
          ) : (
            t('common.save')
          )}
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-3xl border-0 bg-brand-blue p-5 [&>button:last-child]:hidden"
        >
          <ModalCloseButton onClose={() => onOpenChange(false)} />
          <SheetHeader className="mb-3 text-left">
            <SheetTitle className="pr-14 text-lg font-bold text-white">{t('profile.avatarPicker.title')}</SheetTitle>
          </SheetHeader>
          {Content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90dvh] overflow-y-auto rounded-[24px] border-0 bg-brand-blue p-6 sm:p-8 [&>button:last-child]:hidden">
        <ModalCloseButton onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle className="pr-14 font-poppins text-[22px] font-semibold text-white sm:text-[26px]">{t('profile.avatarPicker.title')}</DialogTitle>
          <DialogDescription className="font-poppins text-[13px] font-medium leading-snug text-white/80 sm:text-[14px]">
            {t('profile.avatarPicker.description')}
          </DialogDescription>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
