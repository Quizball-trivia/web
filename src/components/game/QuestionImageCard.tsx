'use client';

/* eslint-disable @next/next/no-img-element -- Question images are runtime CMS data on external hosts (e.g. Wikimedia); next/image would require remotePatterns config. */

import { useState } from 'react';
import { motion } from 'motion/react';
import type { GameQuestionImage } from '@/lib/domain/gameQuestion';
import { optimizedRemoteImageProps } from '@/lib/images/remoteImage';

interface QuestionImageCardProps {
  image: GameQuestionImage;
}

/**
 * Image shown above the prompt for an image-MCQ (e.g. the 4th question of each
 * half in ranked). The box reserves a fixed height band immediately so the image
 * decoding never shifts the layout. Source photos come in wildly different
 * aspect ratios, so the card is filled edge-to-edge by a blurred `object-cover`
 * backdrop of the SAME image, with the sharp `object-contain` photo in front —
 * every photo "fits inside" uniformly (like the category cards) while
 * quiz-relevant detail is never cropped. Hides itself if the image fails to
 * load, leaving the question fully answerable.
 *
 * Styling mirrors the football-logic image card (yellow border + soft glow).
 */
export function QuestionImageCard({ image }: QuestionImageCardProps) {
  const [failed, setFailed] = useState(false);
  // If the optimized (WebP) variant fails to load, fall back to the raw URL
  // before giving up entirely (so a transform hiccup never hides the image).
  const [useRaw, setUseRaw] = useState(false);
  if (failed || !image.url) return null;

  // 450px ≈ the card's max rendered width (260px tall, landscape source); the
  // optimizer serves the right density candidate from `sizes`.
  const optimized = optimizedRemoteImageProps(image.url, 450);
  const imgProps = useRaw ? { src: image.url } : optimized;
  const sizes = '(min-width: 1024px) 450px, 100vw';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mb-2 overflow-hidden rounded-[16px] p-2"
      style={{
        border: '2px solid rgba(255,229,0,0.3)',
        boxShadow: '0 0 6.334px 1.32px rgba(255,229,0,0.1)',
      }}
    >
      <div className="relative flex h-[clamp(150px,34vw,260px)] w-full items-center justify-center overflow-hidden rounded-[12px] bg-surface-page">
        {/* Blurred cover backdrop: fills the letterbox bars with the photo's
            own colors so portrait/landscape sources all read as one uniform,
            edge-to-edge card. Boosted brightness/saturation because most
            quiz photos are dark stadium shots — at low opacity the bars read
            as plain black on the dark card and the effect disappears.
            Decorative only — errors are handled by the foreground image. */}
        <img
          {...imgProps}
          sizes={sizes}
          alt=""
          aria-hidden
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-80 blur-lg brightness-125 saturate-150"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        {/* alt is DELIBERATELY empty: the picture IS the quiz content —
            descriptive alt text ("Maradona lifting the 1986 trophy") would
            hand the answer to anyone inspecting the DOM and spoil the
            question for screen-reader users. A curated, spoiler-free alt
            field can be added to the CMS payload later if needed. */}
        <img
          {...imgProps}
          sizes={sizes}
          alt=""
          width={image.width}
          height={image.height}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          referrerPolicy="no-referrer"
          className="relative h-full max-h-full w-auto max-w-full object-contain"
          onError={() => {
            // First failure: retry with the raw URL. Second: hide the card.
            if (!useRaw) setUseRaw(true);
            else setFailed(true);
          }}
        />
      </div>
    </motion.div>
  );
}
