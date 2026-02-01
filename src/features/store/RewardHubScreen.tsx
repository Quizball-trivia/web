import { WalletSection } from "./components/WalletSection";
import { FeaturedBundleCard } from "./components/FeaturedBundleCard";
import { RewardQuestCard, RewardQuestProps } from "./components/RewardQuestCard";
import { BundleCard, BundleProps } from "./components/BundleCard";
import { Sparkles, Zap } from "lucide-react";

export function RewardHubScreen() {
  
  // Mock Data
  const QUESTS: RewardQuestProps[] = [
    { id: '1', title: "Daily Login", description: "Come back every day", rewardAmount: 50, type: 'daily', status: 'ready' },
    { id: '2', title: "Sponsor Message", description: "Watch a short video", rewardAmount: 100, type: 'ad', status: 'ready' },
    { id: '3', title: "Share with Friends", description: "Invite a friend to play", rewardAmount: 500, type: 'social', status: 'cooldown', cooldownTime: "23:59:10" },
  ];

  const COIN_BUNDLES: BundleProps[] = [
    { id: '1', title: "Handful", amount: 100, price: "$0.99", currencyType: 'coins' },
    { id: '2', title: "Pouch", amount: 550, bonus: 10, price: "$4.99", currencyType: 'coins', isPopular: true },
    { id: '3', title: "Chest", amount: 1200, bonus: 20, price: "$9.99", currencyType: 'coins' },
    { id: '4', title: "Vault", amount: 3000, bonus: 50, price: "$19.99", currencyType: 'coins' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
       
       <WalletSection coins={1250} tickets={2} />

       <div className="flex-1 overflow-auto">
          <div className="container mx-auto max-w-5xl py-8 space-y-12 px-4 md:px-0">
             
             {/* Hero */}
             <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <FeaturedBundleCard />
             </section>

             {/* Quests */}
             <section className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                <div className="flex items-center gap-2">
                   <Zap className="size-5 text-yellow-500 fill-current" />
                   <h3 className="font-bold text-lg">Reward Quests</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   {QUESTS.map(quest => (
                      <RewardQuestCard key={quest.id} {...quest} />
                   ))}
                </div>
             </section>

             {/* Shop Grid */}
             <section className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                <div className="flex items-center gap-2">
                   <Sparkles className="size-5 text-primary" />
                   <h3 className="font-bold text-lg">Coin Shop</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                   {COIN_BUNDLES.map(bundle => (
                      <BundleCard key={bundle.id} {...bundle} />
                   ))}
                </div>
             </section>

          </div>
       </div>

    </div>
  );
}
