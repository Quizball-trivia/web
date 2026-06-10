'use client';

import { motion } from 'motion/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] rounded-2xl p-5 md:p-8 bg-surface-page border-surface-page max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-center text-white">{t('welcome.allCategoriesTitle')}</DialogTitle>
          <DialogDescription className="text-center text-white/50">
            {t('welcome.allCategoriesDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 -mx-1 px-1 mt-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-3">
            {categories.map((cat, i) => {
              const style = getCategoryStyle(cat.slug, cat.name, i);
              return (
                <motion.button
                  key={cat.id}
                  type="button"
                  aria-label={t('welcome.openCategory', { name: cat.name })}
                  className="group relative min-h-[64px] cursor-pointer overflow-hidden rounded-xl border border-white/10 px-3 py-2.5 flex items-center justify-center transition-all duration-200 hover:brightness-110 hover:border-white/20"
                  style={{ backgroundColor: style.color }}
                  onClick={onCategorySelect}
                >
                  <CategoryArtwork src={cat.imageUrl} className="absolute inset-0" />
                  {cat.imageUrl ? (
                    <div className="absolute inset-0 bg-gradient-to-r from-black/48 via-black/18 to-black/55" />
                  ) : null}

                  <span className="relative z-10 text-center text-xs md:text-sm font-bold text-white leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
                    {cat.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
