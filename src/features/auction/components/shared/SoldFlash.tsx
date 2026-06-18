'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useLocale } from '@/contexts/LocaleContext';
import { poppins } from '../../constants/auction.constants';

/** Full-screen "SOLD!" spring-scale flash. */
export function SoldFlash({ visible }: { visible: boolean }) {
  const { t } = useLocale();
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 2 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ type: 'spring', stiffness: 300, damping: 12 }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.6 }}
              className="text-6xl sm:text-8xl font-black uppercase"
              style={{
                ...poppins,
                color: '#FFE500',
                textShadow: '0 4px 40px rgba(255,229,0,0.5), 0 0 80px rgba(255,229,0,0.2)',
              }}
            >
              {t('auctionGame.sold')}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
