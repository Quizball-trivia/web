"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";

interface DemoBackButtonProps {
  href?: string;
  onClick?: () => void;
}

const buttonClassName =
  "fixed left-4 top-4 z-[100] flex size-10 shrink-0 items-center justify-center rounded-full bg-black/30 text-white/75 backdrop-blur-sm transition-colors hover:bg-black/45 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

export function DemoBackButton({ href = "/demos", onClick }: DemoBackButtonProps) {
  const { locale } = useLocale();
  const label = locale === "ka" ? "დემოებზე დაბრუნება" : "Back to demos";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={label} className={buttonClassName}>
        <ArrowLeft aria-hidden className="size-5" />
      </button>
    );
  }

  return (
    <Link href={href} aria-label={label} className={buttonClassName}>
      <ArrowLeft aria-hidden className="size-5" />
    </Link>
  );
}
