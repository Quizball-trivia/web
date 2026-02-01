import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Crown, 
  Check, 
  Zap, 
  Shield, 
  Star, 
  TrendingUp,
  Calendar,
  Users,
  ChartBar,
  Sparkles,
  Lock,
  ShoppingBag,
  Trophy,
  Coins
} from 'lucide-react';
import { AvatarDisplay } from './AvatarDisplay';

interface StoreScreenProps {
  currentCoins: number;
  currentAvatar: {
    base: string;
    hat?: string;
    glasses?: string;
    accessory?: string;
    background?: string;
  };
  unlockedItems: {
    heads: string[];
    jerseys: string[];
    accessories: string[];
  };
  isPremium: boolean;
  onPurchaseItem: (itemType: 'head' | 'jersey' | 'accessory', itemId: string, cost: number) => void;
  onEquipItem: (itemType: 'head' | 'jersey' | 'accessory', itemId: string) => void;
  onPurchasePremium: (tier: 'monthly' | 'yearly') => void;
  onPurchaseCoins: (packageId: string, price: string, coins: number) => void;
  initialTab?: 'coins' | 'premium' | 'avatars';
}

export function StoreScreen({
  currentCoins,
  currentAvatar,
  unlockedItems,
  isPremium,
  onPurchaseItem,
  onEquipItem,
  onPurchasePremium,
  onPurchaseCoins,
  initialTab = 'coins'
}: StoreScreenProps) {
  const [selectedTab, setSelectedTab] = useState<'coins' | 'premium' | 'avatars'>(initialTab);

  // Coin packages
  const coinPackages = [
    {
      id: 'starter',
      name: 'Starter Pack',
      coins: 1000,
      price: '$0.99',
      badge: null,
      badgeColor: '',
      popular: false,
    },
    {
      id: 'popular',
      name: 'Popular Pack',
      coins: 2500,
      price: '$1.99',
      badge: 'Popular',
      badgeColor: 'bg-blue-500',
      popular: true,
    },
    {
      id: 'value',
      name: 'Value Pack',
      coins: 5500,
      price: '$3.99',
      badge: '+10% Bonus',
      badgeColor: 'bg-primary',
      popular: false,
    },
    {
      id: 'mega',
      name: 'Mega Pack',
      coins: 12000,
      price: '$7.99',
      badge: '+20% Bonus',
      badgeColor: 'bg-primary',
      popular: false,
    },
    {
      id: 'ultimate',
      name: 'Ultimate Pack',
      coins: 30000,
      price: '$14.99',
      badge: '+50% Bonus',
      badgeColor: 'bg-amber-500',
      popular: false,
    },
  ];

  // Premium tiers
  const premiumTiers = [
    {
      id: 'monthly' as const,
      name: 'Pro Monthly',
      price: '$4.99',
      period: '/month',
      badge: 'Popular',
      badgeColor: 'bg-blue-500',
    },
    {
      id: 'yearly' as const,
      name: 'Pro Yearly',
      price: '$39.99',
      period: '/year',
      badge: 'Best Value',
      badgeColor: 'bg-primary',
      savings: 'Save 33%',
    },
  ];

  // Premium benefits
  const premiumBenefits = [
    { icon: Trophy, text: 'Unlimited tournament entries', color: 'text-yellow-500' },
    { icon: Shield, text: 'Ad-free experience', color: 'text-blue-500' },
    { icon: ShoppingBag, text: 'All store items unlocked', color: 'text-purple-500' },
    { icon: Star, text: 'Bonus story mode chapters', color: 'text-orange-500' },
    { icon: Calendar, text: 'Extra daily challenges', color: 'text-green-500' },
    { icon: Sparkles, text: 'Daily coin bonus (500 coins)', color: 'text-primary' },
    { icon: Zap, text: 'Faster matchmaking priority', color: 'text-yellow-500' },
    { icon: Users, text: 'Private match creation', color: 'text-pink-500' },
    { icon: ChartBar, text: 'Detailed tournament stats', color: 'text-indigo-500' },
    { icon: Crown, text: 'Exclusive Pro badge', color: 'text-amber-500' },
  ];

  // Avatar items - Football themed
  const avatarHeads = [
    { id: 'default', name: 'Classic', cost: 0, emoji: '⚽' },
    { id: 'player1', name: 'Player 1', cost: 500, emoji: '👨' },
    { id: 'player2', name: 'Player 2', cost: 500, emoji: '👩' },
    { id: 'player3', name: 'Player 3', cost: 800, emoji: '🧑' },
    { id: 'player4', name: 'Player 4', cost: 800, emoji: '👦' },
    { id: 'legend', name: 'Legend', cost: 1500, emoji: '🦸' },
  ];

  const avatarJerseys = [
    { id: 'default', name: 'Training', cost: 0, emoji: '👕' },
    { id: 'home', name: 'Home Kit', cost: 600, emoji: '🟢' },
    { id: 'away', name: 'Away Kit', cost: 600, emoji: '⚪' },
    { id: 'third', name: 'Third Kit', cost: 900, emoji: '🔵' },
    { id: 'retro', name: 'Retro', cost: 1200, emoji: '🟡' },
    { id: 'champion', name: 'Champion', cost: 1500, emoji: '🏆' },
  ];

  const avatarAccessories = [
    { id: 'none', name: 'None', cost: 0, emoji: '' },
    { id: 'captain', name: 'Captain Band', cost: 800, emoji: '🎗️' },
    { id: 'trophy', name: 'Trophy', cost: 1000, emoji: '🏆' },
    { id: 'medal', name: 'Gold Medal', cost: 600, emoji: '🥇' },
    { id: 'gloves', name: 'GK Gloves', cost: 700, emoji: '🧤' },
    { id: 'whistle', name: 'Whistle', cost: 500, emoji: '🎵' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="size-6 text-primary" />
              <h1 className="text-xl">Store</h1>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary">
              <Sparkles className="size-4 text-yellow-500" />
              <span className="text-sm">{currentCoins.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'coins' | 'premium' | 'avatars')} className="w-full">
          {/* Tab Selector */}
          <div className="sticky top-0 z-10 bg-background border-b px-4 pt-3">
            <TabsList className="w-full grid grid-cols-3 h-10">
              <TabsTrigger value="coins" className="text-sm">
                <Coins className="size-4 mr-1.5" />
                Coins
              </TabsTrigger>
              <TabsTrigger value="premium" className="text-sm">
                <Crown className="size-4 mr-1.5" />
                Premium
              </TabsTrigger>
              <TabsTrigger value="avatars" className="text-sm">
                <Star className="size-4 mr-1.5" />
                Avatars
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Coins Tab */}
          <TabsContent value="coins" className="mt-0 p-4 space-y-4">
            {/* Coins Hero */}
            <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 via-transparent to-transparent overflow-hidden relative">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 opacity-10">
                <Coins className="size-32 text-yellow-500" />
              </div>
              <CardContent className="pt-6 pb-6 relative z-10">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-yellow-500/20">
                    <Coins className="size-6 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg mb-1">Get More Coins</h3>
                    <p className="text-sm text-muted-foreground">
                      Use coins to unlock avatar items, enter tournaments, and customize your profile
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="size-3.5" />
                  <span>Best value packages include bonus coins!</span>
                </div>
              </CardContent>
            </Card>

            {/* Coin Packages */}
            <div className="space-y-3">
              <h3 className="text-sm px-1">Select a Package</h3>
              {coinPackages.map((pkg) => (
                <Card 
                  key={pkg.id}
                  className={`transition-all cursor-pointer relative overflow-hidden ${
                    pkg.popular 
                      ? 'border-yellow-500/40 hover:border-yellow-500/60 bg-yellow-500/5' 
                      : 'border-primary/20 hover:border-primary/40'
                  }`}
                >
                  {pkg.badge && (
                    <div className="absolute top-3 right-3">
                      <Badge className={`${pkg.badgeColor} text-white text-xs`}>
                        {pkg.badge}
                      </Badge>
                    </div>
                  )}
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-base mb-1">{pkg.name}</h4>
                        <div className="flex items-center gap-2 mb-2">
                          <Coins className="size-4 text-yellow-500" />
                          <span className="text-2xl text-yellow-500">{pkg.coins.toLocaleString()}</span>
                          <span className="text-sm text-muted-foreground">coins</span>
                        </div>
                        <div className="text-lg">{pkg.price}</div>
                      </div>
                      <Button 
                        onClick={() => onPurchaseCoins(pkg.id, pkg.price, pkg.coins)}
                        className="h-10"
                      >
                        Buy Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Earning Info */}
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-base">Earn Coins for Free</CardTitle>
                <CardDescription>You can also earn coins by playing!</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <Check className="size-3.5 text-green-500" />
                  </div>
                  <span>Win matches: 50-100 coins per win</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <Check className="size-3.5 text-green-500" />
                  </div>
                  <span>Complete daily challenges: Up to 500 coins</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <Check className="size-3.5 text-green-500" />
                  </div>
                  <span>Career mode levels: 500-10,000 coins</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <Check className="size-3.5 text-green-500" />
                  </div>
                  <span>Pro membership: Daily bonus of 500 coins</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Premium Tab */}
          <TabsContent value="premium" className="mt-0 p-4 space-y-4">
            {isPremium ? (
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="pt-6 text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="p-3 rounded-full bg-primary/20">
                      <Crown className="size-8 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg mb-1">You&apos;re a Pro Member!</h3>
                    <p className="text-sm text-muted-foreground">
                      Enjoying all premium benefits
                    </p>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-primary/30">
                    Active Subscription
                  </Badge>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Premium Hero */}
                <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-transparent to-transparent overflow-hidden relative">
                  <div className="absolute top-0 right-0 -mt-8 -mr-8 opacity-10">
                    <Crown className="size-32 text-primary" />
                  </div>
                  <CardContent className="pt-6 pb-6 relative z-10">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="p-2.5 rounded-xl bg-primary/20">
                        <Crown className="size-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg mb-1">Unlock Pro Features</h3>
                        <p className="text-sm text-muted-foreground">
                          Get unlimited access to all game modes, exclusive items, and more
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <TrendingUp className="size-3.5" />
                      <span>Join 10,000+ Pro members worldwide</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Premium Plans */}
                <div className="space-y-3">
                  <h3 className="text-sm px-1">Choose Your Plan</h3>
                  {premiumTiers.map((tier) => (
                    <Card 
                      key={tier.id}
                      className="border-primary/20 hover:border-primary/40 transition-all cursor-pointer relative overflow-hidden"
                    >
                      {tier.badge && (
                        <div className="absolute top-3 right-3">
                          <Badge className={`${tier.badgeColor} text-white text-xs`}>
                            {tier.badge}
                          </Badge>
                        </div>
                      )}
                      <CardContent className="pt-5 pb-5">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-base mb-1">{tier.name}</h4>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl">{tier.price}</span>
                              <span className="text-sm text-muted-foreground">{tier.period}</span>
                            </div>
                            {tier.savings && (
                              <Badge variant="outline" className="mt-2 text-xs border-primary/30 text-primary">
                                {tier.savings}
                              </Badge>
                            )}
                          </div>
                          <Button 
                            onClick={() => onPurchasePremium(tier.id)}
                            className="h-10"
                          >
                            Subscribe
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Premium Benefits */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">What&apos;s Included</CardTitle>
                    <CardDescription>Everything you get with Pro membership</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {premiumBenefits.map((benefit, index) => {
                      const Icon = benefit.icon;
                      return (
                        <div key={index} className="flex items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                            <Icon className={`size-4 ${benefit.color}`} />
                          </div>
                          <span className="text-sm">{benefit.text}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Avatars Tab */}
          <TabsContent value="avatars" className="mt-0 p-4 space-y-4">
            {/* Current Avatar Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Avatar</CardTitle>
                <CardDescription>Your equipped items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-4">
                  <AvatarDisplay
                    customization={currentAvatar}
                    size="lg"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Heads */}
            <div className="space-y-3">
              <h3 className="text-sm px-1">Heads</h3>
              <div className="grid grid-cols-2 gap-3">
                {avatarHeads.map((head) => {
                  const isUnlocked = unlockedItems.heads.includes(head.id) || head.cost === 0 || isPremium;
                  const isEquipped = currentAvatar.base === head.emoji;
                  
                  return (
                    <Card 
                      key={head.id}
                      className={`transition-all ${
                        isEquipped 
                          ? 'border-primary/50 bg-primary/5' 
                          : isUnlocked
                            ? 'border-primary/20 hover:border-primary/40 cursor-pointer'
                            : 'opacity-60'
                      }`}
                    >
                      <CardContent className="pt-4 pb-4 text-center">
                        <div className="text-4xl mb-2 relative">
                          {head.emoji}
                          {!isUnlocked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                              <Lock className="size-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="text-sm mb-2">{head.name}</div>
                        
                        {isEquipped ? (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                            Equipped
                          </Badge>
                        ) : isUnlocked ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs h-8"
                            onClick={() => onEquipItem('head', head.emoji)}
                          >
                            Equip
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full text-xs h-8"
                            onClick={() => onPurchaseItem('head', head.id, head.cost)}
                            disabled={currentCoins < head.cost}
                          >
                            <Sparkles className="size-3 mr-1" />
                            {head.cost}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Jerseys */}
            <div className="space-y-3">
              <h3 className="text-sm px-1">Jerseys</h3>
              <div className="grid grid-cols-2 gap-3">
                {avatarJerseys.map((jersey) => {
                  const isUnlocked = unlockedItems.jerseys.includes(jersey.id) || jersey.cost === 0 || isPremium;
                  const isEquipped = currentAvatar.hat === jersey.emoji;
                  
                  return (
                    <Card 
                      key={jersey.id}
                      className={`transition-all ${
                        isEquipped 
                          ? 'border-primary/50 bg-primary/5' 
                          : isUnlocked
                            ? 'border-primary/20 hover:border-primary/40 cursor-pointer'
                            : 'opacity-60'
                      }`}
                    >
                      <CardContent className="pt-4 pb-4 text-center">
                        <div className="text-4xl mb-2 relative">
                          {jersey.emoji}
                          {!isUnlocked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                              <Lock className="size-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="text-sm mb-2">{jersey.name}</div>
                        
                        {isEquipped ? (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                            Equipped
                          </Badge>
                        ) : isUnlocked ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs h-8"
                            onClick={() => onEquipItem('jersey', jersey.emoji)}
                          >
                            Equip
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full text-xs h-8"
                            onClick={() => onPurchaseItem('jersey', jersey.id, jersey.cost)}
                            disabled={currentCoins < jersey.cost}
                          >
                            <Sparkles className="size-3 mr-1" />
                            {jersey.cost}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Accessories */}
            <div className="space-y-3">
              <h3 className="text-sm px-1">Accessories</h3>
              <div className="grid grid-cols-2 gap-3">
                {avatarAccessories.map((accessory) => {
                  const isUnlocked = unlockedItems.accessories.includes(accessory.id) || accessory.cost === 0 || isPremium;
                  const isEquipped = currentAvatar.accessory === accessory.emoji;
                  
                  return (
                    <Card 
                      key={accessory.id}
                      className={`transition-all ${
                        isEquipped 
                          ? 'border-primary/50 bg-primary/5' 
                          : isUnlocked
                            ? 'border-primary/20 hover:border-primary/40 cursor-pointer'
                            : 'opacity-60'
                      }`}
                    >
                      <CardContent className="pt-4 pb-4 text-center">
                        <div className="text-4xl mb-2 relative h-12 flex items-center justify-center">
                          {accessory.emoji || '—'}
                          {!isUnlocked && accessory.id !== 'none' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                              <Lock className="size-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="text-sm mb-2">{accessory.name}</div>
                        
                        {isEquipped ? (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                            Equipped
                          </Badge>
                        ) : isUnlocked ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs h-8"
                            onClick={() => onEquipItem('accessory', accessory.emoji)}
                          >
                            Equip
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full text-xs h-8"
                            onClick={() => onPurchaseItem('accessory', accessory.id, accessory.cost)}
                            disabled={currentCoins < accessory.cost}
                          >
                            <Sparkles className="size-3 mr-1" />
                            {accessory.cost}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Earning Info */}
            <Card className="border-primary/10">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-secondary shrink-0">
                    <Sparkles className="size-4 text-primary" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <div className="mb-2">💰 Win matches: 50-100 coins</div>
                    <div className="mb-2">🔥 Maintain streaks: Bonus coins</div>
                    <div className="mb-2">🏆 Complete daily challenges</div>
                    <div>⚡ Ranked wins: Extra rewards</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
