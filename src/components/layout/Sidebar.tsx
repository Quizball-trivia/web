"use client";

import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppLogo } from "@/components/AppLogo";
import { SocialLinks } from "@/components/shared/SocialLinks";
import { ContactModal } from "@/components/shared/ContactModal";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import type { MessageKey } from "@/lib/i18n/messages";

const NAV_ITEMS = [
  { path: "/play", labelKey: "navigation.play" },
  { path: "/leaderboard", labelKey: "navigation.leaderboard" },
  { path: "/social", labelKey: "navigation.social" },
  { path: "/play/friend?tab=browse", labelKey: "navigation.lobbies", exact: true },
  // Events tab hidden until the feature ships — keep the route + translations
  // in place so we can flip it back on without re-wiring.
  // { path: "/events", labelKey: "navigation.events" },
  { path: "/store", labelKey: "navigation.store" },
  { path: "/profile", labelKey: "navigation.profile" },
  { path: "/settings", labelKey: "navigation.settings" },
] as const;

interface SidebarProps {
  currentPath: string;
  socialBadgeCount?: number;
  className?: string;
}

function isPathActive(currentPath: string, path: string, exact?: boolean) {
  if (path === "/") return currentPath === "/";
  const basePath = path.split("?")[0];
  if (exact) return currentPath === basePath;
  if (currentPath !== basePath && !currentPath.startsWith(`${basePath}/`)) return false;
  // Don't match if another nav item is a more-specific prefix match
  // e.g. "/play" should not match when on "/play/friend" because Lobbies owns that path
  const hasMoreSpecificMatch = NAV_ITEMS.some((other) => {
    const otherBase = other.path.split("?")[0];
    return otherBase !== basePath && otherBase.startsWith(`${basePath}/`) &&
      (currentPath === otherBase || currentPath.startsWith(`${otherBase}/`));
  });
  return !hasMoreSpecificMatch;
}

export function Sidebar({ currentPath, socialBadgeCount = 0, className }: SidebarProps) {
  const { t } = useLocale();

  return (
    <aside
      className={cn("sticky top-0 z-20 flex h-screen w-64 shrink-0 flex-col self-start transition-all duration-300", className)}
      style={{ backgroundColor: "#000000" }}
    >
      <div className="flex items-center justify-center px-6 pt-8 pb-6">
        <div className="flex w-full items-center justify-center overflow-hidden">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <AppLogo size="xl" />
          </Link>
        </div>
      </div>

      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col items-center space-y-3 px-5">
          {NAV_ITEMS.map((item) => {
            const isActive = isPathActive(currentPath, item.path, "exact" in item ? item.exact : undefined);
            const showSocialBadge = item.path === "/social" && socialBadgeCount > 0;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "relative inline-flex items-center justify-center py-2.5 px-4 text-sm uppercase tracking-wide transition-all",
                  isActive
                    ? "rounded-full text-black min-w-[132px]"
                    : "text-center text-white/62 hover:text-white",
                )}
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  ...(isActive ? { backgroundColor: "#38B60E" } : {}),
                }}
              >
                <span className="truncate">{t(item.labelKey as MessageKey)}</span>
                {showSocialBadge && (
                  <span className="absolute -right-6 top-1/2 min-w-5 -translate-y-1/2 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-poppins font-semibold text-white">
                    {socialBadgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="flex flex-col items-center gap-3 px-6 pb-8 pt-4">
        {/* Socials + Contact — moved here from the top navbar, sits above the
            World Cup trophy. Smaller (xs) tiles so the cluster stays compact. */}
        <div className="flex items-center justify-center gap-2">
          <SocialLinks size="xs" className="gap-2" />
          <ContactModal
            trigger={
              <button
                type="button"
                aria-label={t('feedback.contactUs')}
                title={t('feedback.contactUs')}
                className={cn(
                  'flex size-7 items-center justify-center rounded-[14px] bg-brand-yellow text-black',
                  'shadow-[0_4px_0_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-0.5 active:translate-y-0',
                )}
              >
                <MessageCircle className="size-3.5" />
              </button>
            }
          />
        </div>
        <div className="relative">
          <Image
            src="/assets/brand/world-cup-trophy.webp"
            alt="World Cup Trophy"
            width={96}
            height={96}
            className="h-16 w-auto object-contain opacity-95"
          />
        </div>
      </div>
    </aside>
  );
}
