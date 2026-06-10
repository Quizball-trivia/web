'use client';

/* eslint-disable @next/next/no-img-element -- Question images are runtime CMS data on external hosts (e.g. Wikimedia); next/image would require remotePatterns config. */

import { useState } from 'react';
import { motion } from 'motion/react';
import type { GameQuestionImage } from '@/lib/domain/gameQuestion';
import { optimizeSupabaseImage, QUESTION_IMAGE_TRANSFORM } from '@/lib/images/optimizeSupabaseImage';

interface QuestionImageCardProps {
  image: GameQuestionImage;
}

/**
 * Image shown above the prompt for an image-MCQ (e.g. the 4th question of each
 * half in ranked). The box reserves a fixed height band immediately so the image
 * decoding never shifts the layout, and uses `object-contain` so quiz-relevant
 * detail is never cropped. Hides itself if the image fails to load, leaving the
 * question fully answerable.
 *
 * Styling mirrors the football-logic image card (yellow border + soft glow).
 */
export function QuestionImageCard({ image }: QuestionImageCardProps) {
  const [failed, setFailed] = useState(false);
  // If the optimized (WebP) variant fails to load, fall back to the raw URL
  // before giving up entirely (so a transform hiccup never hides the image).
  const [useRaw, setUseRaw] = useState(false);
  if (failed || !image.url) return null;

  const optimized = optimizeSupabaseImage(image.url, QUESTION_IMAGE_TRANSFORM) ?? image.url;
  const src = useRaw ? image.url : optimized;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mb-2.5 overflow-hidden rounded-[16px] p-2"
      style={{
        border: '2px solid rgba(255,229,0,0.3)',
        boxShadow: '0 0 6.334px 1.32px rgba(255,229,0,0.1)',
      }}
    >
      <div className="flex h-[clamp(180px,42vw,300px)] w-full items-center justify-center overflow-hidden rounded-[12px] bg-surface-page">
        <img
          src={src}
          alt=""
          width={image.width}
          height={image.height}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          referrerPolicy="no-referrer"
          className="h-full max-h-full w-auto max-w-full object-contain"
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
