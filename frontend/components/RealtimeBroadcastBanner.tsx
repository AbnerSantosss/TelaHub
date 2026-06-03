import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, CheckCircle, Flame, ShieldAlert, X } from 'lucide-react';
import { cn } from '../libs/utils';

// Eldora UI inspired Word Pull Up Text animation component built with motion/react
export const WordPullUp: React.FC<{
  text: string;
  className?: string;
  delayOffset?: number;
}> = ({ text, className, delayOffset = 0 }) => {
  const words = text.split(" ");
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { 
        staggerChildren: 0.08, 
        delayChildren: delayOffset 
      },
    },
  };

  const wordVariants = {
    hidden: { 
      opacity: 0, 
      y: 25,
      filter: "blur(4px)"
    },
    visible: { 
      opacity: 1, 
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 120,
      }
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("flex flex-wrap justify-center gap-x-2 gap-y-1", className)}
    >
      {words.map((word, idx) => (
        <motion.span
          key={idx}
          variants={wordVariants}
          className="inline-block"
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};

interface RealtimeBroadcastBannerProps {
  isOpen: boolean;
  onClose?: () => void;
  title: string;
  message: string;
  type?: 'emergency' | 'rh' | 'alert' | 'general';
}

export const RealtimeBroadcastBanner: React.FC<RealtimeBroadcastBannerProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'rh',
}) => {
  
  const config = {
    emergency: {
      icon: <ShieldAlert className="text-rose-500 w-12 h-12" />,
      themeColor: 'rgba(239, 68, 68, 0.95)',
      borderColor: 'border-rose-500/50',
      shadowColor: 'rgba(239, 68, 68, 0.4)',
      bgGradient: 'from-rose-950/90 via-slate-950/95 to-rose-950/80',
      glowClass: 'bg-rose-500/20'
    },
    rh: {
      icon: <Info className="text-purple-400 w-12 h-12" />,
      themeColor: 'rgba(124, 58, 237, 0.95)',
      borderColor: 'border-[#0ea5e9]/50',
      shadowColor: 'rgba(124, 58, 237, 0.4)',
      bgGradient: 'from-[#0ea5e9]/15 via-slate-950/95 to-[#0ea5e9]/5',
      glowClass: 'bg-[#0ea5e9]/20'
    },
    alert: {
      icon: <AlertTriangle className="text-amber-500 w-12 h-12" />,
      themeColor: 'rgba(245, 158, 11, 0.95)',
      borderColor: 'border-amber-500/50',
      shadowColor: 'rgba(245, 158, 11, 0.4)',
      bgGradient: 'from-amber-950/20 via-slate-950/95 to-amber-950/5',
      glowClass: 'bg-amber-500/20'
    },
    general: {
      icon: <CheckCircle className="text-[#00D8F6] w-12 h-12" />,
      themeColor: 'rgba(0, 216, 246, 0.95)',
      borderColor: 'border-[#00D8F6]/50',
      shadowColor: 'rgba(0, 216, 246, 0.4)',
      bgGradient: 'from-[#00D8F6]/10 via-slate-950/95 to-slate-950',
      glowClass: 'bg-[#00D8F6]/10'
    }
  }[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 md:p-12 overflow-hidden bg-black/70 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Neon Ambient Pulse Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full filter blur-[150px] opacity-40 mix-blend-screen pointer-events-none animate-pulse">
            <div className={cn("w-full h-full rounded-full transition-colors duration-1000", config.glowClass)} />
          </div>

          {/* Grid background on overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1px,transparent_1px)]" style={{ backgroundSize: '16px 16px' }} />

          {/* Modal Container */}
          <motion.div
            className={cn(
              "relative w-full max-w-4xl rounded-3xl border bg-gradient-to-br p-8 md:p-16 shadow-[0_0_80px_-10px] text-center overflow-hidden",
              config.borderColor,
              config.bgGradient
            )}
            style={{ 
              boxShadow: `0 0 80px -15px ${config.shadowColor}, inset 0 0 20px rgba(255, 255, 255, 0.02)` 
            }}
            initial={{ scale: 0.92, y: 30, opacity: 0 }}
            animate={{ 
              scale: 1, 
              y: 0, 
              opacity: 1,
              transition: {
                type: "spring",
                damping: 20,
                stiffness: 100
              }
            }}
            exit={{ 
              scale: 0.95, 
              y: 20, 
              opacity: 0,
              transition: { duration: 0.25, ease: "easeInOut" }
            }}
          >
            {/* Header / Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 overflow-hidden">
              <div 
                className="h-full w-full animate-pulse"
                style={{ backgroundColor: config.themeColor }}
              />
            </div>

            {/* Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full border border-white/5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/15 transition-all outline-none"
              >
                <X size={18} />
              </button>
            )}

            {/* Animated Icon Circle */}
            <motion.div 
              className="mx-auto w-24 h-24 rounded-full flex items-center justify-center border border-white/5 bg-slate-900/60 shadow-[inset_0_1px_5px_rgba(255,255,255,0.05)] relative mb-8"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                transition: { delay: 0.2, type: "spring", damping: 12 }
              }}
            >
              <div className="absolute inset-0 rounded-full bg-current opacity-5 animate-ping duration-1000" />
              {config.icon}
            </motion.div>

            {/* Broadcast Category Badge */}
            <motion.div 
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-black uppercase tracking-[0.2em] mb-6 select-none"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" style={{ color: config.themeColor }} />
              {type === 'emergency' ? 'ALERTA DE SEGURANÇA' : type === 'rh' ? 'COMUNICADO DO RH' : type === 'alert' ? 'NOTIFICAÇÃO CRÍTICA' : 'COMUNICADO INTERNO'}
            </motion.div>

            {/* Word Pull Up Text: Title */}
            <div className="mb-6">
              <WordPullUp 
                text={title} 
                className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] font-sans"
                delayOffset={0.4}
              />
            </div>

            {/* Word Pull Up Text: Message Content */}
            <div className="max-w-2xl mx-auto">
              <WordPullUp 
                text={message} 
                className="text-lg md:text-2xl text-slate-300 font-medium leading-relaxed drop-shadow-[0_1px_5px_rgba(0,0,0,0.3)] font-sans"
                delayOffset={0.7}
              />
            </div>

            {/* Premium Button Action */}
            {onClose && (
              <motion.div
                className="mt-12"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 1.5 } }}
              >
                <button
                  onClick={onClose}
                  className="px-8 py-3 rounded-xl font-black text-sm tracking-widest text-white border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 active:scale-95 transition-all shadow-lg"
                >
                  CIENTE / CONFIRMAR
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
