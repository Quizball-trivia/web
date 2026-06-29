import { motion } from 'motion/react';
import { poppins, AUCTION_PURPLE } from '../../constants/auction.constants';

/**
 * Full-screen status banner for the live auction — the ranked-style overlay used
 * for "Finalizing Match", "Loading results", and "a bidder left" beats. Purple
 * card to match the auction theme (the quit modal + the card on the home page).
 */
export function AuctionStatusOverlay({
  title,
  subtitle,
  spinner = true,
}: {
  title: string;
  subtitle?: string;
  spinner?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-surface-page-alt/75 px-4 backdrop-blur-[2px]"
    >
      <motion.div
        initial={{ y: -12, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: -12, scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="w-full max-w-sm rounded-[20px] px-6 py-6 text-center shadow-2xl"
        style={{ background: AUCTION_PURPLE }}
      >
        {spinner && (
          <div className="mx-auto mb-4 size-9 rounded-full border-[4px] border-white/20 border-t-brand-yellow animate-spin" />
        )}
        <div
          className="font-poppins text-xl font-semibold uppercase text-white"
          style={poppins}
        >
          {title}
        </div>
        {subtitle && (
          <div
            className="mt-1.5 font-poppins text-sm font-semibold text-white/70"
            style={poppins}
          >
            {subtitle}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
