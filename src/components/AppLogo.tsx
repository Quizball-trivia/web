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
    <div className={`flex items-center justify-center ${className}`}>
      <Image
        src="/assets/brand/quizball-logo.webp"
        alt="QuizBall Logo"
        width={iconOnly ? config.imgSize : config.imgSize * 4}
        height={config.imgSize}
        className={`${config.img} w-auto object-contain`}
      />
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
      img: 'h-16',
      gap: 'gap-3',
      imgSize: 64,
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
