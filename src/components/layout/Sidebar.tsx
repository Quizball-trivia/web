import Link from "next/link";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppLogo } from "@/components/AppLogo";
import { cn } from "@/lib/utils";
import { colors } from "@/lib/colors";

const NAV_ITEMS = [
  { path: "/play", label: "Play" },
  { path: "/leaderboard", label: "Leaderboard" },
  { path: "/social", label: "Social" },
  { path: "/play/friend?tab=browse", label: "Lobbies", exact: true },
  { path: "/events", label: "Events" },
  { path: "/store", label: "Store" },
  { path: "/profile", label: "Profile" },
  { path: "/settings", label: "Settings" },
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
  return (
    <aside
      className={cn("sticky top-0 flex h-screen w-64 flex-col transition-all duration-300", className)}
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
                  "relative inline-flex items-center justify-center py-2.5 px-4 text-sm font-black uppercase tracking-wide transition-all",
                  isActive
                    ? "rounded-full text-black min-w-[132px]"
                    : "text-center text-white/62 hover:text-white",
                )}
                style={isActive ? { backgroundColor: "#38B60E" } : undefined}
              >
                <span className="truncate">{item.label}</span>
                {showSocialBadge && (
                  <span className="absolute -right-6 top-1/2 min-w-5 -translate-y-1/2 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white">
                    {socialBadgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="flex items-center justify-center px-6 pb-8 pt-4">
        <Image
          src="/assets/brand/world-cup-trophy.webp"
          alt="World Cup Trophy"
          width={96}
          height={96}
          className="h-16 w-auto object-contain opacity-95"
        />
      </div>
    </aside>
  );
}
