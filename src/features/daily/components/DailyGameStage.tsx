"use client";

import { cn } from "@/lib/utils";

/**
 * The shared desktop stage for daily challenges.
 *
 * Header, timer, prompt and answers are ONE composition inside a fixed-width
 * column rather than a header pinned to the top with the gameplay floating in
 * the middle of the viewport — that split is what made the desktop layouts feel
 * disconnected. The column is capped at ~800px and sits slightly ABOVE centre
 * (game UIs read better a touch high), while short viewports fall back to a
 * plain top-aligned scroll so nothing is ever cut off.
 */
export function DailyGameStage({
  header,
  children,
  className,
  contentClassName,
}: {
  /** Rendered first inside the stage — normally <DailyChallengeHeader />. */
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Extra classes for the inner column (e.g. a wider stage for grid modes). */
  contentClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 justify-center overflow-y-auto px-4 py-4",
        // Tall screens: hold the whole unit together, a little above centre.
        "[@media(min-height:750px)]:items-center [@media(min-height:750px)]:pb-[8vh]",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-full max-w-[800px] flex-col gap-[clamp(14px,2.4vh,28px)]",
          contentClassName,
        )}
      >
        {header}
        {children}
      </div>
    </div>
  );
}
