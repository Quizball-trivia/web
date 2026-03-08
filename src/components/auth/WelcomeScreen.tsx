"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FcGoogle } from 'react-icons/fc';
import { Button } from '@/components/ui/button';
import { Shield, Swords, Brain, Goal, Trophy, ChevronRight } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { motion, AnimatePresence } from 'motion/react';
import { socialLogin } from '@/lib/auth/auth.service';

const SUBHEADING_PHRASES = [
  "Climb the ranks.",
  "Outsmart rivals.",
  "Prove your ball knowledge.",
  "Build up your status.",
  "Win tournaments.",
  "Earn rewards.",
  "Become a legend.",
  "Challenge friends.",
  "Rise to the top.",
  "Show your skills.",
];

// Deterministic pseudo-random duels count based on days since launch
function getDuelsCount(): number {
  const LAUNCH_DATE = Date.UTC(2026, 2, 1); // March 1, 2026 UTC
  const BASE_COUNT = 1000;
  const now = Date.now();
  const daysSinceLaunch = Math.max(0, Math.floor((now - LAUNCH_DATE) / (1000 * 60 * 60 * 24)));

  let total = BASE_COUNT;
  for (let d = 0; d < daysSinceLaunch; d++) {
    const seed = d * 2654435761;
    const daily = 5 + (Math.abs(seed) % 96);
    total += daily;
  }
  return total;
}

export function WelcomeScreen() {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);
  const [duelsCount, setDuelsCount] = useState(1000);
  useEffect(() => setDuelsCount(getDuelsCount()), []);

  const cards = [
    { src: "/assets/screenshot-gameplay.png", label: "Live Match", alt: "QuizBall gameplay", width: 1200, height: 700 },
    { src: "/assets/screenshot-play-modes.png", label: "Game Modes", alt: "QuizBall play modes", width: 1200, height: 900 },
    { src: "/assets/screenshot-daily-challenges.png", label: "Daily Challenges", alt: "QuizBall daily challenges", width: 1100, height: 900 },
    { src: "/assets/screenshot-leaderboard.png", label: "Leaderboard", alt: "QuizBall leaderboard", width: 900, height: 700 },
    { src: "/assets/screenshot-solo-practice.png", label: "Solo Practice", alt: "QuizBall solo practice", width: 1000, height: 800 },
    { src: "/assets/screenshot-store.png", label: "Store", alt: "QuizBall store", width: 1200, height: 900 },
  ];

  const [[page, direction], setPage] = useState([0, 0]);
  const activeCard = page;

  const paginate = (newDirection: number) => {
    const nextPage = (page + newDirection + cards.length) % cards.length;
    setPage([nextPage, newDirection]);
  };

  const jumpToPage = (index: number) => {
    if (index === page) return;
    const newDirection = index > page ? 1 : -1;
    setPage([index, newDirection]);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPhraseIndex((prev) => (prev + 1) % SUBHEADING_PHRASES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Auto-rotate
  useEffect(() => {
    const timer = setInterval(() => {
      paginate(1);
    }, 4500);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleKickOff = () => setLoginOpen(true);
  const handleGoogleLogin = async () => {
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      await socialLogin('google', redirectTo);
    } catch (error) {
      console.error('Google login failed', error);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
      scale: 0.9,
      rotate: direction > 0 ? 5 : -5,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      rotate: -1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0,
      scale: 0.9,
      rotate: direction < 0 ? 5 : -5,
    })
  };

  return (
    <div className="min-h-screen w-full bg-[#131F24] font-sans text-foreground flex flex-col">
      {/* Background Spotlight */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-green-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Navbar */}
      <header className="flex h-16 md:h-20 items-center px-6 md:px-12 lg:px-20 shrink-0 border-b border-border/30 bg-[#131F24]/80 backdrop-blur-md sticky top-0 z-50">
        <AppLogo size="md" className="!justify-start" />
      </header>

      {/* Hero - Split layout */}
      <main className="flex-1 flex flex-col lg:flex-row items-center container mx-auto px-6 py-8 md:py-12 lg:py-0 gap-10 md:gap-12 lg:gap-16">

        {/* Left: Copy */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left max-w-xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="flex -space-x-2">
              <AvatarDisplay customization={{ base: "avatar-1", background: "b6e3f4" }} size="sm" className="rounded-full ring-2 ring-[#131F24]" />
              <AvatarDisplay customization={{ base: "avatar-8", background: "ffdfbf" }} size="sm" className="rounded-full ring-2 ring-[#131F24]" />
              <AvatarDisplay customization={{ base: "avatar-3", background: "c0aede" }} size="sm" className="rounded-full ring-2 ring-[#131F24]" />
            </div>
            <span className="text-[#56707A] font-bold text-sm">{duelsCount.toLocaleString()}+ duels played</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter leading-[1.05] mb-6 text-foreground drop-shadow-2xl">
            Answer trivia.<br />
            Score goals.<br />
            <span className="bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">Win the match.</span>
          </h1>

          <p className="text-base md:text-lg text-[#56707A] font-medium mb-4 max-w-md">
            The football trivia game where your knowledge powers real-time pitch action. Battle opponents, climb divisions, and become a legend.
          </p>

          <div className="h-8 mb-8 flex items-center justify-center lg:justify-start">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentPhraseIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-lg font-bold text-green-600"
              >
                {SUBHEADING_PHRASES[currentPhraseIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          <Button
            size="lg"
            onClick={handleKickOff}
            className="
              h-14 px-12 rounded-2xl text-lg font-black uppercase tracking-wide
              bg-green-500 text-[#131F24] hover:bg-green-400
              border-b-[5px] border-green-700 active:border-b-0 active:translate-y-[5px]
              transition-all shadow-xl hover:shadow-green-500/20
            "
          >
            Kick off
          </Button>

          {/* How it works — compact */}
          <div className="mt-10 flex items-center gap-2 text-sm">
            {[
              { label: "Answer", color: "text-[#1CB0F6]" },
              { label: "Advance", color: "text-green-500" },
              { label: "Score", color: "text-[#FF9600]" },
            ].map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <ChevronRight className="size-4 text-[#56707A]/50" />}
                <span className={`font-black uppercase tracking-wide ${s.color}`}>{s.label}</span>
              </React.Fragment>
            ))}
          </div>
        </motion.div>

        {/* Right: Stacked cards */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex-1 flex items-center justify-center w-full max-w-lg lg:max-w-none relative"
        >
          <div className="relative w-full max-w-[520px] aspect-[4/3] perspective-1000">
            {/* Stack background elements for depth */}
            <div className="absolute inset-0 scale-[0.92] translate-y-6 rotate-3 opacity-10 bg-green-500/20 blur-2xl rounded-3xl" />
            
            {/* Secondary card in stack */}
            <div className="absolute inset-0 scale-[0.96] translate-y-4 rotate-2 opacity-40">
              <div className="w-full h-full bg-[#1B2F36] rounded-2xl md:rounded-3xl p-2 md:p-3 border-2 border-border/20 border-b-4 shadow-xl">
                <div className="rounded-xl md:rounded-2xl overflow-hidden h-[calc(100%-32px)] bg-[#0D1B21]" />
              </div>
            </div>

            {/* Active card container with AnimatePresence */}
            <div className="relative w-full h-full overflow-visible">
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={page}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.4 },
                    rotate: { duration: 0.5 },
                    scale: { duration: 0.5 },
                  }}
                  className="absolute inset-0 cursor-pointer"
                  onClick={() => paginate(1)}
                >
                  <div className="w-full h-full bg-[#1B2F36] rounded-2xl md:rounded-3xl p-1.5 md:p-3 border-2 border-white/5 border-b-[4px] md:border-b-[6px] border-b-black/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)] active:translate-y-1 active:border-b-[2px] transition-all">
                    <div className="relative rounded-xl md:rounded-2xl overflow-hidden h-[calc(100%-24px)] md:h-[calc(100%-32px)] group">
                      <Image
                        src={cards[activeCard].src}
                        alt={cards[activeCard].alt}
                        width={cards[activeCard].width}
                        height={cards[activeCard].height}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        priority={activeCard === 0}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="mt-1 md:mt-2 px-1 flex items-center justify-between">
                      <span className="font-bold text-[8px] md:text-xs uppercase tracking-[0.15em] text-white/40">{cards[activeCard].label}</span>
                      <div className="flex gap-1 md:gap-1.5 z-10">
                        {cards.map((_, di) => (
                          <button
                            key={di}
                            onClick={(e) => {
                              e.stopPropagation();
                              jumpToPage(di);
                            }}
                            className={`size-1 md:size-1.5 rounded-full transition-all duration-500 hover:bg-white/30 ${di === activeCard ? 'bg-green-500 w-3 md:w-6' : 'bg-white/10'}`}
                            aria-label={`Go to slide ${di + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Features Section */}
      <section className="px-6 py-16 bg-[#0D1B21] border-t border-border/30">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: Brain, title: "Answer Trivia", desc: "10k+ questions across clubs, players, history & more.", color: "text-[#1CB0F6]", bg: "bg-[#1CB0F6]/10", border: "border-[#1CB0F6]/30" },
            { icon: Goal, title: "Move Up the Pitch", desc: "Every correct answer advances your position — DEF to BOX.", color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/30" },
            { icon: Trophy, title: "Score & Win", desc: "Outscore opponents across two halves to climb divisions.", color: "text-[#FF9600]", bg: "bg-[#FF9600]/10", border: "border-[#FF9600]/30" },
          ].map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`bg-[#1B2F36] rounded-2xl p-6 border-2 ${step.border} border-b-4`}
            >
              <div className="flex items-start gap-4">
                <div className={`${step.bg} rounded-xl p-3 shrink-0`}>
                  <step.icon className={`size-6 ${step.color}`} />
                </div>
                <div>
                  <div className={`font-black text-sm uppercase tracking-wide ${step.color} mb-1`}>{step.title}</div>
                  <p className="text-xs text-[#56707A] leading-relaxed font-medium">{step.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/30 bg-[#131F24]">
        <div className="container mx-auto px-6 flex flex-wrap justify-center gap-8 md:gap-16">
          <div className="flex items-center gap-2 font-bold text-foreground/60">
            <Shield className="size-5" /> 10k+ Verified Questions
          </div>
          <div className="flex items-center gap-2 font-bold text-foreground/60">
            <Swords className="size-5" /> {duelsCount.toLocaleString()} Duels Played
          </div>
        </div>
      </footer>

      {/* Login Dialog — Google only */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-md w-full rounded-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold mb-4 text-center">Sign in to QuizBall</DialogTitle>
            <DialogDescription className="text-center">
              Continue with your Google account.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <Button
              variant="outline"
              className="flex items-center justify-center gap-3 py-4 text-lg font-semibold border-2 border-zinc-300 hover:bg-zinc-100"
              onClick={handleGoogleLogin}
            >
              <FcGoogle className="size-6" /> Continue with Google
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
