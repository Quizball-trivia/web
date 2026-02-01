import Image from 'next/image';
import { motion } from 'motion/react';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
  iconOnly?: boolean;
}

type LogoContentProps = {
  config: { text: string; img: string; gap: string; imgSize: number };
  className: string;
  iconOnly: boolean;
};

function LogoContent({ config, className, iconOnly }: LogoContentProps) {
  return (
    <div className={`flex items-center justify-center ${iconOnly ? '' : config.gap} ${className}`}>
      {/* Logo Image */}
      <Image
        src="/assets/logo.png"
        alt="QuizBall Logo"
        width={config.imgSize}
        height={config.imgSize}
        className={`${config.img} w-auto object-contain drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]`}
      />

      {/* QUIZBALL Text Logo */}
      {!iconOnly && (
        <div
          className={`${config.text} tracking-wider`}
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '0.1em',
            textShadow: '0 0 30px rgba(34, 197, 94, 0.3)',
          }}
        >
          QUIZBALL
        </div>
      )}
    </div>
  );
}

export function AppLogo({ size = 'md', animated = false, className = "", iconOnly = false }: AppLogoProps) {
  const sizes = {
    sm: {
      text: 'text-xl',
      img: 'h-8',
      gap: 'gap-2',
      imgSize: 32,
    },
    md: {
      text: 'text-3xl',
      img: 'h-12',
      gap: 'gap-3',
      imgSize: 48,
    },
    lg: {
      text: 'text-5xl',
      img: 'h-20',
      gap: 'gap-4',
      imgSize: 80,
    },
    xl: {
      text: 'text-7xl',
      img: 'h-32',
      gap: 'gap-6',
      imgSize: 128,
    }
  };

  const config = sizes[size];

  if (animated) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 200,
          damping: 20
        }}
      >
        <LogoContent config={config} className={className} iconOnly={iconOnly} />
      </motion.div>
    );
  }

  return <LogoContent config={config} className={className} iconOnly={iconOnly} />;
}
