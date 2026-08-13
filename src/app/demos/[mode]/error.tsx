"use client";

import Link from "next/link";

const poppins = { fontFamily: "'Poppins', sans-serif" };

export default function DemoModeError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface-page px-4">
      <div className="w-full max-w-sm rounded-[16px] bg-white/5 p-8 text-center">
        <div className="text-4xl">⚠️</div>
        <h2 className="mt-4 text-lg font-semibold text-white" style={poppins}>
          This demo hit a snag
        </h2>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={reset}
            className="h-12 w-full rounded-[28px] bg-brand-green text-sm font-semibold uppercase tracking-wide text-white"
            style={poppins}
          >
            Try again
          </button>
          <Link
            href="/demos"
            className="flex h-11 w-full items-center justify-center rounded-[28px] bg-white/10 text-xs font-semibold uppercase tracking-wide text-white"
            style={poppins}
          >
            Back to demos
          </Link>
        </div>
      </div>
    </div>
  );
}
