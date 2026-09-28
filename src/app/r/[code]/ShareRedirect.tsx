"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function ShareRedirect({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  useEffect(() => { router.replace(href); }, [href, router]);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-page-alt p-6">
      <Link href={href} className="rounded-full bg-brand-green px-8 py-4 text-base font-black uppercase text-white">{label}</Link>
    </main>
  );
}
