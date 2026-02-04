import Image from "next/image";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMobile";
import { avatarSeeds, getDiceBearAvatarUrl } from "@/lib/avatars";
import { Check, Sparkles } from "lucide-react";

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

  const seedUrls = useMemo(
    () => avatarSeeds.map((seed) => ({ seed, url: getDiceBearAvatarUrl(seed, 96) })),
    []
  );

  const Content = (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl bg-primary/10 p-4 border border-primary/20">
        <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Sparkles className="size-5 text-primary" />
        </div>
        <div>
          <div className="font-semibold">Choose your look</div>
          <div className="text-xs text-muted-foreground">
            Pick a playful avatar or use your Google photo.
          </div>
        </div>
      </div>

      {googleAvatarUrl && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Your Google photo</span>
            {currentAvatarUrl === googleAvatarUrl && (
              <Badge variant="secondary" className="text-[10px]">
                Current
              </Badge>
            )}
          </div>
          <button
            className={cn(
              "w-full flex items-center gap-3 rounded-2xl border p-3 transition-all",
              currentAvatarUrl === googleAvatarUrl
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/60 hover:bg-muted/30"
            )}
            onClick={() => onSelect(googleAvatarUrl)}
            disabled={isSaving}
          >
            <div className="relative size-12 rounded-full overflow-hidden border border-border">
              <Image
                src={googleAvatarUrl}
                alt="Google avatar"
                fill
                sizes="48px"
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold">Use Google photo</div>
              <div className="text-xs text-muted-foreground">Great for quick recognition.</div>
            </div>
            {currentAvatarUrl === googleAvatarUrl && (
              <Check className="size-4 text-primary" />
            )}
          </button>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Duolingo-style avatars</span>
          <Badge variant="outline" className="text-[10px]">
            {avatarSeeds.length} options
          </Badge>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {seedUrls.map(({ seed, url }) => {
            const isSelected = currentAvatarUrl === url;
            return (
              <button
                key={seed}
                className={cn(
                  "group relative rounded-2xl border p-2 transition-all",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/60 hover:bg-muted/30"
                )}
                onClick={() => onSelect(url)}
                disabled={isSaving}
              >
                <div className="relative mx-auto size-16 rounded-full overflow-hidden border border-border bg-background">
                  <Image src={url} alt={seed} fill sizes="64px" className="object-cover" unoptimized />
                </div>
                <div className="mt-2 text-[10px] font-medium text-muted-foreground capitalize">
                  {seed.replace(/-/g, " ")}
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2 size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="size-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
          Close
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl border-t border-border/50">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="text-xl font-bold">Profile Avatar</SheetTitle>
          </SheetHeader>
          {Content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl border-border/50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Profile Avatar</DialogTitle>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
