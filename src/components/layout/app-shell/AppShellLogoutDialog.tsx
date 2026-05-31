'use client';

/**
 * Confirmation modal for the profile menu's Log Out action. The shell
 * owns the open/close state so both desktop and mobile profile menus
 * can trigger the same dialog.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLocale } from '@/contexts/LocaleContext';

interface AppShellLogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
}

export function AppShellLogoutDialog({ open, onOpenChange, onConfirm }: AppShellLogoutDialogProps) {
  const { t } = useLocale();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="max-w-md w-[92vw] rounded-[24px] border-0 p-8 font-poppins shadow-none sm:p-10"
        style={{ backgroundColor: '#1645FF' }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center font-poppins text-[22px] font-semibold text-white sm:text-[26px]">
            {t('accountMenu.logOutQuestion')}
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-3 text-center font-poppins text-[13px] font-medium leading-snug text-white/80 sm:text-[14px]">
            {t('accountMenu.logOutDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-col sm:space-x-0">
          <AlertDialogAction
            onClick={onConfirm}
            className="w-full rounded-[16px] border-0 bg-brand-red-soft from-brand-red-soft to-brand-red-soft px-3 py-3 font-poppins text-sm font-semibold uppercase tracking-wide text-white shadow-none hover:bg-brand-red-soft/90 hover:from-brand-red-soft/90 hover:to-brand-red-soft/90 hover:shadow-none focus-visible:ring-0"
          >
            {t('accountMenu.logOut')}
          </AlertDialogAction>
          <AlertDialogCancel className="mt-0 w-full rounded-[16px] border-0 bg-white/15 px-3 py-3 font-poppins text-sm font-semibold uppercase tracking-wide text-white shadow-none hover:bg-white/25 hover:text-white focus-visible:ring-0">
            {t('common.cancel')}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
