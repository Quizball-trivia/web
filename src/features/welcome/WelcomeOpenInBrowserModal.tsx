'use client';

/**
 * "Open in your browser" modal, shown for protected landing actions inside
 * social-app webviews (Messenger, Facebook, Instagram, etc.). The landing page
 * remains visible, but auth/game entry waits until the user opens Safari/Chrome.
 */

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { InAppBrowserInstructions } from './InAppBrowserInstructions';
import type { InAppBrowserApp, Platform } from '@/lib/auth/in-app-browser';

interface WelcomeOpenInBrowserModalProps {
  open: boolean;
  platform: Platform;
  app: InAppBrowserApp | null;
  onClose: () => void;
}

export function WelcomeOpenInBrowserModal({ open, platform, app, onClose }: WelcomeOpenInBrowserModalProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[88vh] max-w-[400px] overflow-y-auto rounded-3xl border-none bg-brand-blue px-5 pb-5 pt-14 sm:p-7 [&>button:last-child]:hidden">
        <ModalCloseButton onClose={onClose} className="right-3 top-3 sm:right-4 sm:top-4" />
        <InAppBrowserInstructions platform={platform} app={app} />
      </DialogContent>
    </Dialog>
  );
}
