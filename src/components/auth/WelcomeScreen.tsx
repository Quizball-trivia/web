import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Swords, Star, Shield } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onLogin?: () => void;
}

const SUBHEADING_PHRASES = [
  "Climb the ranks.",
  "Outsmart rivals.",
  "Prove your ball knowledge."
];

export function WelcomeScreen({ onGetStarted, onLogin }: WelcomeScreenProps) {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  // Subheading timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPhraseIndex((prev) => (prev + 1) % SUBHEADING_PHRASES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#0B0D12] font-sans text-foreground flex flex-col">
      {/* Navbar */}
      <header className="flex h-20 items-center justify-between px-6 md:px-12 lg:px-20 shrink-0 border-b border-white/5 bg-[#0B0D12] sticky top-0 z-50">
        <AppLogo size="md" className="!justify-start" />
        <Button
          variant="ghost"
          size="lg"
          className="font-bold text-muted-foreground hover:text-foreground text-sm uppercase tracking-wider hover:bg-transparent"
          onClick={onLogin}
        >
          I have an account
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row items-center justify-center container mx-auto px-6 py-10 md:py-0 gap-12 lg:gap-24">
        
        {/* LEFT: Hero Visual (Avatars) */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="order-2 md:order-1 relative w-full max-w-[400px] aspect-square flex items-center justify-center"
        >
           {/* Background Circles */}
           <div className="absolute inset-0 rounded-full bg-gradient-to-b from-primary/10 to-transparent blur-3xl" />
           
           {/* Floating Cards Container */}
           <div className="relative w-full h-full">
              {/* YOU Card */}
              <motion.div 
                 animate={shouldReduceMotion ? undefined : { y: [0, -10, 0] }}
                 transition={
                   shouldReduceMotion
                     ? undefined
                     : { duration: 4, repeat: Infinity, ease: "easeInOut" }
                 }
                 className="absolute top-10 left-0 md:-left-4 z-20 bg-[#161922] p-4 rounded-3xl border-2 border-[#2A2E3B] shadow-2xl skew-y-3"
              >
                  <div className="flex flex-col items-center gap-2">
                     <div className="relative">
                        <AvatarDisplay customization={{ base: "avatar-1", background: "b6e3f4" }} size="lg" className="rounded-full ring-4 ring-green-500" />
                        <div className="absolute -bottom-3 bg-green-500 text-[#0B0D12] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide border-2 border-[#0B0D12]">
                           You
                        </div>
                     </div>
                     <div className="mt-2 text-center">
                        <div className="font-black text-sm text-white">Rookie</div>
                        <div className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Division 10</div>
                     </div>
                  </div>
              </motion.div>

              {/* VS Badge */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 size-16 rounded-full bg-[#0B0D12] border-4 border-[#2A2E3B] flex items-center justify-center shadow-xl">
                 <span className="font-black text-xl italic text-muted-foreground/50 pr-1">VS</span>
              </div>

              {/* RIVAL Card */}
              <motion.div 
                 animate={shouldReduceMotion ? undefined : { y: [0, 10, 0] }}
                 transition={
                   shouldReduceMotion
                     ? undefined
                     : { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
                 }
                 className="absolute bottom-10 right-0 md:-right-4 z-10 bg-[#161922] p-4 rounded-3xl border-2 border-[#2A2E3B] shadow-xl -skew-y-3 opacity-80"
              >
                  <div className="flex flex-col items-center gap-2">
                     <div className="relative">
                        <AvatarDisplay customization={{ base: "avatar-8", background: "ffdfbf" }} size="lg" className="rounded-full ring-4 ring-red-500 grayscale-[0.3]" />
                        <div className="absolute -bottom-3 bg-red-500 text-[#0B0D12] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide border-2 border-[#0B0D12]">
                           Rival
                        </div>
                     </div>
                     <div className="mt-2 text-center">
                        <div className="font-black text-sm text-white opacity-80">Pro</div>
                        <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Division 4</div>
                     </div>
                  </div>
              </motion.div>
           </div>
        </motion.div>

        {/* RIGHT: Copy & CTA */}
        <motion.div 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="order-1 md:order-2 flex flex-col items-center md:items-start text-center md:text-left max-w-xl"
        >
           <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] mb-6 text-white">
              The free, fun, and effective way to learn <span className="text-green-500">football</span>.
           </h1>
           
           <div className="h-8 mb-8 flex items-center justify-center md:justify-start">
             <AnimatePresence mode="wait">
               <motion.p
                 key={currentPhraseIndex}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="text-lg md:text-xl font-bold text-muted-foreground"
               >
                 {SUBHEADING_PHRASES[currentPhraseIndex]}
               </motion.p>
             </AnimatePresence>
           </div>

           <div className="flex flex-col w-full sm:w-auto gap-4 min-w-[280px]">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="
                  h-14 rounded-2xl text-lg font-black uppercase tracking-wide
                  bg-green-500 text-[#0B0D12] hover:bg-green-400
                  border-b-[5px] border-green-700 active:border-b-0 active:translate-y-[5px]
                  transition-all shadow-xl hover:shadow-green-500/20
                "
              >
                Get Started
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={onLogin}
                className="
                  h-14 rounded-2xl text-lg font-black uppercase tracking-wide
                  bg-[#161922] text-white hover:bg-[#1f232e] hover:text-white
                  border-[#2A2E3B] border-2 border-b-[5px] active:border-b-2 active:translate-y-[3px]
                  transition-all
                "
              >
                I already have an account
              </Button>
           </div>
        </motion.div>

      </main>

      {/* Footer / Trust badges */}
      <footer className="py-8 border-t border-white/5 bg-[#0B0D12]">
         <div className="container mx-auto px-6 flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
             <div className="flex items-center gap-2 font-bold text-white">
                <Shield className="size-5" /> Verified Questions
             </div>
             <div className="flex items-center gap-2 font-bold text-white">
                <Swords className="size-5" /> 2.1M Duels Played
             </div>
             <div className="flex items-center gap-2 font-bold text-white">
                <Star className="size-5" /> 4.9 App Store Rating
             </div>
         </div>
      </footer>
    </div>
  );
}
