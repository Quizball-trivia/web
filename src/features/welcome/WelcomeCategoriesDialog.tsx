'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { useLocale } from '@/contexts/LocaleContext';
import { CategoryArtwork } from './CategoryArtwork';
import { getCategoryStyle } from './welcome.helpers';

interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string | null;
}

interface WelcomeCategoriesDialogProps {
  open: boolean;
  categories: CategoryItem[];
  onOpenChange: (open: boolean) => void;
  onCategorySelect: () => void;
}

export function WelcomeCategoriesDialog({
  open,
  categories,
  onOpenChange,
  onCategorySelect,
}: WelcomeCategoriesDialogProps) {
  const { t } = useLocale();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const touchStartX = useRef(0);

  const cat = categories[currentIndex];
  if (!cat) return null;
  const style = getCategoryStyle(cat.slug, cat.name, currentIndex);
  const IconComponent = style.icon;

  const goTo = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= categories.length) return;
    setDirection(newIndex > currentIndex ? 1 : -1);
    setCurrentIndex(newIndex);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goTo(diff > 0 ? currentIndex + 1 : currentIndex - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setCurrentIndex(0); }}>
      <DialogContent className="max-w-lg w-[95vw] rounded-[24px] border-0 bg-store-card p-5 md:p-8 max-h-[85vh] flex flex-col [&>button]:hidden">
        <div className="absolute top-5 right-5 z-30">
          <ModalCloseButton onClose={() => { onOpenChange(false); setCurrentIndex(0); }} className="!static" />
        </div>
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl font-black text-center text-white">
            {t('welcome.allCategoriesTitle')}
          </DialogTitle>
          <DialogDescription className="text-center text-white/50 text-sm">
            {currentIndex + 1} / {categories.length}
          </DialogDescription>
        </DialogHeader>

        {/* Card carousel */}
        <div
          className="relative flex-1 mt-4 overflow-hidden rounded-2xl"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.button
              key={cat.id}
              type="button"
              custom={direction}
              initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-full min-h-[280px] md:min-h-[340px] cursor-pointer overflow-hidden rounded-2xl border border-white/10 p-6 md:p-8 flex flex-col justify-end transition-all hover:brightness-110"
              style={{ backgroundColor: style.color }}
              onClick={onCategorySelect}
            >
              <CategoryArtwork src={cat.imageUrl} className="absolute inset-0" />
              {cat.imageUrl ? (
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/5" />
              ) : null}

              {!cat.imageUrl && style.flag ? (
                <Image
                  src={`https://flagcdn.com/w320/${style.flag}.png`}
                  alt=""
                  width={320}
                  height={240}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 md:w-52 opacity-[0.12] pointer-events-none rounded-sm"
                />
              ) : !cat.imageUrl && style.watermarkImg ? (
                <Image
                  src={style.watermarkImg}
                  alt=""
                  width={200}
                  height={200}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-36 md:size-44 opacity-[0.12] pointer-events-none object-contain"
                />
              ) : !cat.imageUrl ? (
                <IconComponent className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-36 md:size-44 opacity-[0.08] text-white pointer-events-none" />
              ) : null}

              <div className="relative z-10">
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-wide leading-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)]">
                  {cat.name}
                </h3>
              </div>
            </motion.button>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4 gap-3">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => goTo(currentIndex - 1)}
            className="flex items-center justify-center size-10 md:size-12 rounded-full border border-white/15 bg-white/5 text-white transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="size-5 md:size-6" />
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-1.5 overflow-hidden max-w-[200px]">
            {categories.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                className={`shrink-0 rounded-full transition-all ${
                  i === currentIndex
                    ? 'w-6 h-2 bg-brand-green'
                    : 'size-2 bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            disabled={currentIndex === categories.length - 1}
            onClick={() => goTo(currentIndex + 1)}
            className="flex items-center justify-center size-10 md:size-12 rounded-full border border-white/15 bg-white/5 text-white transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="size-5 md:size-6" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
