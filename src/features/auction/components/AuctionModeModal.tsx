'use client';

import { motion } from 'motion/react';
import { Users, Globe } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { cn } from '@/lib/utils';

interface AuctionModeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRoom: () => void;
  onFindOnline: () => void;
}

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

export function AuctionModeModal({
  isOpen,
  onOpenChange,
  onCreateRoom,
  onFindOnline,
}: AuctionModeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-md w-[95vw] rounded-[24px] border-0',
          'p-6 sm:p-8',
          '[&>button]:hidden',
        )}
        style={{ backgroundColor: '#1A0A2E' }}
      >
        <div className="absolute top-5 right-5 z-30">
          <ModalCloseButton onClose={() => onOpenChange(false)} className="!static" />
        </div>

        <DialogHeader>
          <DialogTitle
            className="text-center text-2xl sm:text-3xl uppercase text-white"
            style={poppins}
          >
            <span className="text-brand-yellow">Auction</span>
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-white/60 mt-1">
            Build your dream team in a live auction
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onCreateRoom}
            className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-purple-500/20">
              <Users className="size-6 text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold uppercase text-white" style={poppins}>
                Create Room
              </div>
              <div className="text-xs text-white/50 mt-0.5">
                Invite friends to play together
              </div>
            </div>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase text-white/40">
              Soon
            </span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onFindOnline}
            className="flex w-full items-center gap-4 rounded-2xl border border-brand-yellow/20 bg-brand-yellow/5 p-4 text-left transition-colors hover:bg-brand-yellow/10"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-brand-yellow/20">
              <Globe className="size-6 text-brand-yellow" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold uppercase text-white" style={poppins}>
                Find Opponents
              </div>
              <div className="text-xs text-white/50 mt-0.5">
                Match with 2 other players online
              </div>
            </div>
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
