import { FeaturedBundleCard } from "./components/FeaturedBundleCard";
import { BundleCard, type BundleProps } from "./components/BundleCard";
import { User, Shirt, Shield, Sparkles, Zap, Target, LifeBuoy, Coins, Ticket } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const COIN_BUNDLES: BundleProps[] = [
  { id: '1', title: "Handful", amount: 100, price: "$0.99", currencyType: 'coins' },
  { id: '2', title: "Pouch", amount: 550, bonus: 10, price: "$4.99", currencyType: 'coins', isPopular: true },
  { id: '3', title: "Chest", amount: 1200, bonus: 20, price: "$9.99", currencyType: 'coins' },
  { id: '4', title: "Vault", amount: 3000, bonus: 50, price: "$19.99", currencyType: 'coins' },
];

interface BoosterItem {
  id: string;
  title: string;
  description: string;
  price: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  borderBottomColor: string;
  glowColor: string;
}

const BOOSTERS: BoosterItem[] = [
  {
    id: 'xp',
    title: '2x XP Boost',
    description: 'Double your XP for 1 hour',
    price: '500',
    icon: <Zap className="size-7" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    borderBottomColor: 'border-b-yellow-600/50',
    glowColor: 'bg-yellow-500',
  },
  {
    id: 'rank',
    title: '2x Rank Pts',
    description: 'Double rank points for 1 hour',
    price: '500',
    icon: <Shield className="size-7" />,
    color: 'text-[#1CB0F6]',
    bgColor: 'bg-[#1CB0F6]/10',
    borderColor: 'border-[#1CB0F6]/30',
    borderBottomColor: 'border-b-[#1CB0F6]/50',
    glowColor: 'bg-[#1CB0F6]',
  },
  {
    id: 'fifty',
    title: '50/50 Helpline',
    description: 'Removes two wrong answers',
    price: '200',
    icon: <Target className="size-7" />,
    color: 'text-[#CE82FF]',
    bgColor: 'bg-[#CE82FF]/10',
    borderColor: 'border-[#CE82FF]/30',
    borderBottomColor: 'border-b-[#CE82FF]/50',
    glowColor: 'bg-[#CE82FF]',
  },
  {
    id: 'tickets',
    title: 'Extra Tickets',
    description: '+5 daily match tickets',
    price: '300',
    icon: <Ticket className="size-7 fill-current" />,
    color: 'text-[#58CC02]',
    bgColor: 'bg-[#58CC02]/10',
    borderColor: 'border-[#58CC02]/30',
    borderBottomColor: 'border-b-[#58CC02]/50',
    glowColor: 'bg-[#58CC02]',
  },
];

interface AvatarItem {
  id: string;
  name: string;
  image: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic';
}

const AVATARS: AvatarItem[] = [
  { id: 'av1', name: 'Striker', image: '/assets/store/avatars/striker.svg', price: 1000, rarity: 'common' },
  { id: 'av2', name: 'Captain', image: '/assets/store/avatars/captain.svg', price: 1500, rarity: 'rare' },
  { id: 'av3', name: 'Keeper', image: '/assets/store/avatars/keeper.svg', price: 1200, rarity: 'rare' },
  { id: 'av4', name: 'Legend', image: '/assets/store/avatars/legend.svg', price: 2500, rarity: 'epic' },
];

interface CosmeticItem {
  id: string;
  name: string;
  image: string;
  price: number;
  type: 'jersey' | 'accessory';
}

const COSMETICS: CosmeticItem[] = [
  { id: 'j1', name: 'Home Jersey', image: '/assets/store/jersey1.svg', type: 'jersey', price: 800 },
  { id: 'j2', name: 'Away Jersey', image: '/assets/store/jersey2.svg', type: 'jersey', price: 800 },
  { id: 'j3', name: 'Third Kit', image: '/assets/store/jersey3.svg', type: 'jersey', price: 1000 },
  { id: 'j4', name: 'Retro Kit', image: '/assets/store/jersey4.svg', type: 'jersey', price: 1200 },
  { id: 'j5', name: 'Special Edition', image: '/assets/store/jesrsey5.svg', type: 'jersey', price: 1500 },
  { id: 'j6', name: 'Gold Kit', image: '/assets/store/jersey6.svg', type: 'jersey', price: 2000 },
];

const RARITY_STYLES = {
  common: { border: 'border-[#56707A]/40', borderBottom: 'border-b-[#56707A]/60', badge: 'bg-[#56707A]/20 text-[#56707A]', glow: 'bg-[#56707A]' },
  rare: { border: 'border-[#1CB0F6]/40', borderBottom: 'border-b-[#1CB0F6]/60', badge: 'bg-[#1CB0F6]/20 text-[#1CB0F6]', glow: 'bg-[#1CB0F6]' },
  epic: { border: 'border-[#CE82FF]/40', borderBottom: 'border-b-[#CE82FF]/60', badge: 'bg-[#CE82FF]/20 text-[#CE82FF]', glow: 'bg-[#CE82FF]' },
} as const;

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="size-10 rounded-xl bg-[#1CB0F6]/10 border-2 border-b-4 border-[#1CB0F6]/30 border-b-[#1CB0F6]/50 flex items-center justify-center text-[#1CB0F6]">
        {icon}
      </div>
      <div>
        <h3 className="font-black font-fun text-lg tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-[#56707A] font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}

function BoosterCard({ booster, onBuy }: { booster: BoosterItem; onBuy: (b: BoosterItem) => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className={cn(
        "relative flex flex-col items-center rounded-2xl border-2 border-b-4 bg-[#1B2F36] p-5 h-full overflow-hidden transition-colors",
        booster.borderColor, booster.borderBottomColor
      )}>
        {/* Background glow */}
        <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-28 rounded-full blur-[50px] opacity-20", booster.glowColor)} />

        {/* Icon */}
        <div className={cn(
          "size-14 rounded-2xl flex items-center justify-center border-2 border-b-4 mb-3",
          booster.bgColor, booster.borderColor, booster.borderBottomColor, booster.color
        )}>
          {booster.icon}
        </div>

        {/* Text */}
        <div className="text-center mb-4 flex-1">
          <div className="font-black font-fun text-sm leading-tight mb-1">{booster.title}</div>
          <div className="text-[11px] text-[#56707A] font-medium leading-tight">{booster.description}</div>
        </div>

        {/* Buy button */}
        <Button
          onClick={() => onBuy(booster)}
          className="w-full font-black text-sm rounded-xl border-b-4 active:border-b-0 active:mt-1 transition-all bg-[#FF9600] hover:bg-[#FF9600]/90 border-[#CC7800] text-white"
        >
          <Coins className="size-3.5 mr-1 fill-current" />
          {booster.price}
        </Button>
      </div>
    </motion.div>
  );
}

function AvatarCard({ avatar, onBuy }: { avatar: AvatarItem; onBuy: (a: AvatarItem) => void }) {
  const style = RARITY_STYLES[avatar.rarity];

  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className={cn(
        "relative flex flex-col items-center rounded-2xl border-2 border-b-4 bg-[#1B2F36] p-5 h-full overflow-hidden transition-colors",
        style.border, style.borderBottom
      )}>
        {/* Background glow */}
        <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-28 rounded-full blur-[50px] opacity-20", style.glow)} />

        {/* Rarity badge */}
        <div className={cn("absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full", style.badge)}>
          {avatar.rarity}
        </div>

        {/* Player character */}
        <div className="size-28 flex items-center justify-center mb-2">
          <img src={avatar.image} alt={avatar.name} className="size-full object-contain drop-shadow-lg" />
        </div>

        {/* Name */}
        <div className="text-center mb-3">
          <div className="font-black font-fun text-base">{avatar.name}</div>
          <div className="text-[10px] font-bold uppercase text-[#56707A] tracking-wider">Player</div>
        </div>

        {/* Buy button */}
        <Button
          onClick={() => onBuy(avatar)}
          className="w-full font-black text-sm rounded-xl border-b-4 active:border-b-0 active:mt-1 transition-all bg-[#FF9600] hover:bg-[#FF9600]/90 border-[#CC7800] text-white"
        >
          <Coins className="size-3.5 mr-1 fill-current" />
          {avatar.price.toLocaleString()}
        </Button>
      </div>
    </motion.div>
  );
}

function CosmeticCard({ item, onBuy }: { item: CosmeticItem; onBuy: (c: CosmeticItem) => void }) {
  const isJersey = item.type === 'jersey';

  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className={cn(
        "relative flex flex-col items-center rounded-2xl border-2 border-b-4 bg-[#1B2F36] p-5 h-full overflow-hidden transition-colors",
        isJersey
          ? "border-[#1CB0F6]/30 border-b-[#1CB0F6]/50"
          : "border-[#CE82FF]/30 border-b-[#CE82FF]/50"
      )}>
        {/* Background glow */}
        <div className={cn(
          "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-28 rounded-full blur-[50px] opacity-20",
          isJersey ? "bg-[#1CB0F6]" : "bg-[#CE82FF]"
        )} />

        {/* Type badge */}
        <div className={cn(
          "absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
          isJersey ? "bg-[#1CB0F6]/20 text-[#1CB0F6]" : "bg-[#CE82FF]/20 text-[#CE82FF]"
        )}>
          {item.type}
        </div>

        {/* Item image */}
        <div className={cn(
          "size-24 rounded-2xl border-2 border-b-4 flex items-center justify-center mb-3 overflow-hidden bg-white/5 p-2",
          isJersey
            ? "border-[#1CB0F6]/30 border-b-[#1CB0F6]/50"
            : "border-[#CE82FF]/30 border-b-[#CE82FF]/50"
        )}>
          <img src={item.image} alt={item.name} className="size-full object-contain" />
        </div>

        {/* Name */}
        <div className="text-center mb-4">
          <div className="font-black font-fun text-sm">{item.name}</div>
        </div>

        {/* Buy button */}
        <Button
          onClick={() => onBuy(item)}
          className="w-full font-black text-sm rounded-xl border-b-4 active:border-b-0 active:mt-1 transition-all bg-[#FF9600] hover:bg-[#FF9600]/90 border-[#CC7800] text-white"
        >
          <Coins className="size-3.5 mr-1 fill-current" />
          {item.price.toLocaleString()}
        </Button>
      </div>
    </motion.div>
  );
}

export function StoreScreen() {
  const [buyModal, setBuyModal] = useState<{ name: string; price: string } | null>(null);

  return (
    <div className="min-h-screen pb-20 flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto max-w-5xl py-8 space-y-14 px-4 md:px-0">

          {/* Featured Subscription Card */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <FeaturedBundleCard />
          </motion.section>

          {/* Coin Shop */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
          >
            <SectionHeader icon={<Sparkles className="size-5" />} title="Buy Coins" subtitle="Power up your wallet" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {COIN_BUNDLES.map((bundle, i) => (
                <motion.div
                  key={bundle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 + i * 0.05 }}
                >
                  <BundleCard {...bundle} />
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Boosters & Helplines */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
          >
            <SectionHeader icon={<Zap className="size-5" />} title="Boosters & Helplines" subtitle="Gain the competitive edge" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {BOOSTERS.map((booster, i) => (
                <motion.div
                  key={booster.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 + i * 0.05 }}
                >
                  <BoosterCard booster={booster} onBuy={(b) => setBuyModal({ name: b.title, price: `${b.price} coins` })} />
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Avatars */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 }}
          >
            <SectionHeader icon={<User className="size-5" />} title="Avatars" subtitle="Show off your style" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {AVATARS.map((avatar, i) => (
                <motion.div
                  key={avatar.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 + i * 0.05 }}
                >
                  <AvatarCard avatar={avatar} onBuy={(a) => setBuyModal({ name: a.name, price: `${a.price} coins` })} />
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Jerseys & Accessories */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.4 }}
          >
            <SectionHeader icon={<Shirt className="size-5" />} title="Jerseys" subtitle="Rep your colors" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {COSMETICS.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.4 + i * 0.05 }}
                >
                  <CosmeticCard item={item} onBuy={(c) => setBuyModal({ name: c.name, price: `${c.price} coins` })} />
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Purchase Confirmation Modal */}
          <AnimatePresence>
            {buyModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                onClick={() => setBuyModal(null)}
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: 20 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="bg-[#1B2F36] rounded-3xl border-2 border-b-4 border-[#1CB0F6]/30 border-b-[#1CB0F6]/50 p-8 shadow-2xl flex flex-col items-center gap-5 min-w-[320px] relative overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Glow */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-40 rounded-full blur-[80px] opacity-20 bg-[#1CB0F6]" />

                  <div className="size-16 rounded-2xl bg-[#FF9600]/10 border-2 border-b-4 border-[#FF9600]/30 border-b-[#FF9600]/50 flex items-center justify-center">
                    <Coins className="size-8 text-[#FF9600] fill-[#FF9600]" />
                  </div>

                  <div className="text-center">
                    <h3 className="text-xl font-black font-fun mb-1">Confirm Purchase</h3>
                    <div className="text-sm text-[#56707A] font-medium">{buyModal.name}</div>
                  </div>

                  <div className="bg-[#FF9600]/10 border-2 border-[#FF9600]/30 rounded-xl px-6 py-2">
                    <span className="text-[#FF9600] font-black font-fun text-lg">{buyModal.price}</span>
                  </div>

                  <div className="flex gap-3 w-full">
                    <Button
                      className="flex-1 font-black rounded-xl border-b-4 active:border-b-0 active:mt-1 transition-all bg-[#58CC02] hover:bg-[#58CC02]/90 border-[#46A302] text-white"
                      onClick={() => setBuyModal(null)}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1 font-black rounded-xl border-b-4 active:border-b-0 active:mt-1 transition-all border-[#2A4550] bg-[#1B2F36] hover:bg-[#243B44] text-[#56707A]"
                      onClick={() => setBuyModal(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
