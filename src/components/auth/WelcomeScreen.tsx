import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Trophy, Zap, Swords, Clock, X } from 'lucide-react';
import { AppLogo } from '../AppLogo';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onLogin?: () => void;
}

const STADIUM_IMAGES = [
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?q=80&w=2070&auto=format&fit=crop"
];

const SUBHEADING_PHRASES = [
  "Challenge friends and rivals in real-time trivia competitions.",
  "Prove your football knowledge and climb the global ranks.",
  "Win exclusive rewards and trophies in daily tournaments.",
  "The ultimate destination for the world's biggest football fans."
];

export function WelcomeScreen({ onGetStarted, onLogin }: WelcomeScreenProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [showComingSoon, setShowComingSoon] = useState(false);

  // Background timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % STADIUM_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Subheading timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPhraseIndex((prev) => (prev + 1) % SUBHEADING_PHRASES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const features = [
    { 
      icon: Zap, 
      title: "Live 1v1", 
      subtitle: "Fast 1v1 matches",
      hint: "(5-10 seconds to find an opponent)"
    },
    { 
      icon: Swords, 
      title: "Multiplayer", 
      subtitle: "Ranked ladder",
      hint: "(Elo-style rating, seasons)"
    },
    { 
      icon: Trophy, 
      title: "Ranked", 
      subtitle: "Fresh questions weekly",
      hint: "(curated + verified)"
    },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background font-sans text-foreground md:h-screen md:overflow-hidden">
      {/* Background Carousel */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={STADIUM_IMAGES[currentImageIndex]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${STADIUM_IMAGES[currentImageIndex]})` }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col md:h-full">
        {/* Navbar */}
        <header className="flex h-16 items-center justify-between px-6 md:px-12 lg:px-20 shrink-0">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <AppLogo size="sm" className="!justify-start" />
          </motion.div>
          
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10"
              onClick={onLogin}
            >
              Log in
            </Button>
          </motion.div>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-6 py-8 md:py-4 text-center">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-8 md:mb-6"
          >
            <h2 className="max-w-4xl text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl md:text-6xl lg:text-7xl">
              Fast-paced football
              <br />
              trivia battles.
            </h2>
            
            <div className="h-20 mt-4 flex items-center justify-center sm:h-12">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentPhraseIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                  className="max-w-2xl text-sm text-muted-foreground sm:text-base md:text-lg"
                >
                  {SUBHEADING_PHRASES[currentPhraseIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="mt-6 flex flex-col items-center justify-center gap-6">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="btn-glow btn-glow-pulse h-12 rounded-lg px-8 text-sm font-bold transition-all bg-primary text-primary-foreground hover:bg-primary/90 sm:h-14 sm:px-10 sm:text-base"
              >
                Get Started
              </Button>
            </div>
          </motion.div>

          {/* Feature Cards Grid - Integrated Section */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="glass-surface mt-10 md:mt-14 w-full max-w-4xl p-2.5 md:p-3"
          >
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="glass-card group flex flex-col items-center gap-4 px-5 py-8 md:px-6 md:py-10"
                >
                  <div className="glass-badge flex size-12 items-center justify-center rounded-full md:size-14 relative z-10 transition-transform">
                    <feature.icon className="h-5 w-5 text-primary/80 drop-shadow-[0_0_8px_rgba(34,197,94,0.3)] md:h-6 md:w-6" />
                    <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-40 transition-opacity" />
                  </div>
                  <div className="space-y-1.5 text-center relative z-10">
                    <h3 className="text-lg font-bold text-foreground leading-tight tracking-tight md:text-xl">
                      {feature.title}
                    </h3>
                    <p className="text-sm font-medium text-muted-foreground/70 leading-snug px-4">
                      {feature.subtitle}
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-[0.15em]">
                      {feature.hint}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Pre-launch Bar */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="glass-bar mt-10 mb-8 flex w-full max-w-4xl flex-col items-center justify-between gap-4 px-6 py-4 md:mt-12 md:mb-0 md:flex-row md:gap-0 md:px-8 md:py-3"
          >
            <div className="flex items-center gap-2.5 text-xs font-semibold text-muted-foreground sm:text-sm">
              <Clock className="h-4 w-4 text-primary/70" />
              Launching soon
            </div>
            
            <div className="hidden h-4 w-[1px] bg-white/10 md:block" />

            <Button
              size="sm"
              className="btn-glow h-8 rounded-full bg-white/5 px-5 text-[10px] font-bold border border-white/10 text-foreground hover:bg-white/10 sm:h-9 sm:px-6 sm:text-xs"
              onClick={() => setShowComingSoon(true)}
            >
             Play the Demo
            </Button>

            <div className="hidden h-4 w-[1px] bg-white/10 md:block" />

            <div className="flex items-center gap-2.5 text-xs font-semibold text-muted-foreground sm:text-sm">
              <Trophy className="h-4 w-4 text-primary/70" />
              Free to play
            </div>
          </motion.div>
        </main>
      </div>

      {/* Coming Soon Modal */}
      <AnimatePresence>
        {showComingSoon && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-xl"
              onClick={() => setShowComingSoon(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-surface relative w-full max-w-md overflow-hidden p-8 text-center"
            >
              <button 
                onClick={() => setShowComingSoon(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="relative mb-8 flex justify-center">
                {/* Football Animation */}
                <motion.div
                  animate={{ 
                    y: [0, -40, 0],
                    rotate: [0, 360],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  className="relative z-10 flex size-20 items-center justify-center rounded-full bg-primary/20 text-primary shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                >
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="size-12"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 7L16.5 10.5L15 15.5H9L7.5 10.5L12 7Z" />
                    <path d="M12 7V3" />
                    <path d="M16.5 10.5L20 9" />
                    <path d="M15 15.5L18 19" />
                    <path d="M9 15.5L6 19" />
                    <path d="M7.5 10.5L4 9" />
                  </svg>
                </motion.div>
                
                {/* Pitch lines/glow */}
                <div className="absolute bottom-0 left-1/2 h-1 w-20 -translate-x-1/2 bg-primary/20 blur-md" />
              </div>

              <h3 className="mb-2 text-3xl font-black tracking-tight">Coming Soon</h3>
              <p className="mb-8 text-muted-foreground">
                We&apos;re currently finalizing the stadium for your first match. 
                Launch is just around the corner!
              </p>

              <Button 
                onClick={() => setShowComingSoon(false)}
                className="w-full bg-primary font-bold text-primary-foreground hover:bg-primary/90"
              >
                Got it!
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
