"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

/** Only an explicitly animated logo needs the animation engine. */
export function AnimatedAppLogo({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}
