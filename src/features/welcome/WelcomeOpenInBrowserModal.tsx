'use client';

/**
 * "Open in your browser" modal, shown inside webviews that block Google's GIS
 * popup (Messenger / Facebook). There, "Continue with Google" dead-ends on a
 * blank accounts.google.com page, so we tell the user — in their language — how
 * to reopen the page in Safari/Chrome, where sign-in works.
 *
 * Not shown in Instagram (its webview allows the popup, so Google works in place).
 */

import { Dialog, DialogContent } from '@/components/ui/dialog';
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
      <DialogContent className="max-w-[400px] rounded-3xl border-none bg-brand-blue p-6 sm:p-7">
        <InAppBrowserInstructions platform={platform} app={app} />
      </DialogContent>
    </Dialog>
  );
}
