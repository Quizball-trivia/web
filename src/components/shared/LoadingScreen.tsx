import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({
  text = "Warming up...",
  className,
  fullScreen = true
}: LoadingScreenProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center bg-background text-foreground",
      fullScreen ? "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" : "h-64 w-full",
      className
    )}>
      <div className="relative">
        {/* Bouncing Ball */}
        <motion.div
           animate={{
             y: [0, -40, 0],
             scale: [1, 1.1, 0.9, 1], // Squish effect at bottom
             rotate: [0, 180, 360]
           }}
           transition={{
             duration: 0.8,
             repeat: Infinity,
             ease: "circOut", // Bouncy feel
             times: [0, 0.5, 1]
           }}
           className="relative z-10 flex size-16 items-center justify-center rounded-full bg-white shadow-xl border-4 border-black box-border overflow-hidden"
        >
           {/* Simple Football Pattern */}
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,white_40%,#e5e5e5_100%)]" />
           <svg viewBox="0 0 24 24" fill="currentColor" className="size-16 text-black opacity-80">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.07 1.09L13.5 6.5H10.5L9.6 4.6c.74-.23 1.53-.39 2.33-.51zm-4.7 1.83l2.88 3.32L6.5 10.5 4.18 8.18c.64-1.28 1.56-2.4 2.65-3.26zM4.14 12c0-.52.06-1.02.16-1.51l3.43 2L4.65 16.66c-.34-1.44-.51-2.95-.51-4.66zM5.5 18l3.5-3.5 3 1.5-1.5 5.2c-1.93-.56-3.66-1.74-5-3.2zm8 3.86l1.37-4.75 3.13-1.56L16.5 19.5c-1.34.92-2.92 1.6-4.63 2.36l-1.37-4.75zM19.34 16.5l-3.2-3.2L19 10.5l.84 2.38c-.16 1.25-.65 2.42-1.5 3.62zM19.86 12c0 .52-.06 1.02-.16 1.51l-3.43-2 3.08-4.15c.34 1.44.51 2.95.51 4.66zM18.5 6l-3.5 3.5-3-1.5 1.5-5.2c1.93.56 3.66 1.74 5 3.2z" />
           </svg>
        </motion.div>

        {/* Shadow */}
        <motion.div
           animate={{
             scale: [0.8, 1.5, 0.8],
             opacity: [0.5, 0.2, 0.5]
           }}
           transition={{
             duration: 0.8,
             repeat: Infinity,
             ease: "circOut"
           }}
           className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-2 bg-black/20 rounded-[100%] blur-sm"
        />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse"
      >
        {text}
      </motion.p>
    </div>
  );
}
