import { Shield } from "lucide-react";

import { CountryFlag } from "@/components/CountryFlag";
import { cn } from "@/lib/utils";
import { clubOf, countryLabel } from "../boards";

interface BoardBadgeProps {
  kind: "country" | "club";
  value: string;
  className?: string;
}

/** Flag or crest for a country/club board key. */
export function BoardBadge({ kind, value, className }: BoardBadgeProps) {
  if (kind === "country") {
    return <CountryFlag code={value} className={cn("rounded-[2px] text-[20px]", className)} />;
  }
  const club = clubOf(value);
  if (!club) return <Shield className={cn("size-6 text-white/40", className)} aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={club.logo} alt="" className={cn("size-7 shrink-0 object-contain", className)} />;
}

export function boardName(kind: "country" | "club", value: string, locale: string): string {
  return kind === "country" ? countryLabel(value, locale) : clubOf(value)?.label ?? value;
}
