import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { AlertTriangle, Info, CheckCircle, Flame, ShieldAlert, X } from 'lucide-react';
import { cn } from '../libs/utils';

// Eldora UI inspired Word Pull Up Text animation component built with motion/react
export const WordPullUp: React.FC<{
  text: string;
  className?: string;
  delayOffset?: number;
}> = ({ text, className, delayOffset = 0 }) => {
  const words = text.split(" ");
  // Com movimento reduzido o texto aparece inteiro, sem subir palavra por palavra.
  const reduzir = useReducedMotion();
  if (reduzir) {
    return <div className={cn("flex flex-wrap justify-center gap-x-2 gap-y-1", className)}>{text}</div>;
  }
  
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
  const reduzir = useReducedMotion();

  // Cor por tipo: só o ícone e a faixa do topo levam cor. O cartão é papel claro
  // da marca, igual aos outros modais do painel. Verde (ok) é o comunicado
  // geral porque é o único tipo que confirma algo, não alerta.
  const config = {
    emergency: {
      icon: <ShieldAlert className="text-danger size-10" aria-hidden="true" />,
      fundo: 'bg-danger-fundo',
      faixa: 'bg-danger',
      rotulo: 'Alerta de segurança',
    },
    rh: {
      icon: <Info className="text-marca size-10" aria-hidden="true" />,
      fundo: 'bg-marca-fundo',
      faixa: 'bg-marca',
      rotulo: 'Comunicado do RH',
    },
    alert: {
      icon: <AlertTriangle className="text-warn size-10" aria-hidden="true" />,
      fundo: 'bg-warn-fundo',
      faixa: 'bg-warn',
      rotulo: 'Notificação crítica',
    },
    general: {
      icon: <CheckCircle className="text-ok size-10" aria-hidden="true" />,
      fundo: 'bg-ok-fundo',
      faixa: 'bg-ok',
      rotulo: 'Comunicado interno',
    },
  }[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-12 overflow-y-auto bg-[var(--veu)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="comunicado-titulo"
            aria-describedby="comunicado-mensagem"
            className="relative w-full max-w-3xl rounded-2xl border border-borda bg-papel p-6 pt-10 md:p-14 shadow-modal text-center overflow-hidden"
            initial={reduzir ? false : { scale: 0.96, y: 16, opacity: 0 }}
            animate={{
              scale: 1,
              y: 0,
              opacity: 1,
              transition: { type: "spring", damping: 24, stiffness: 140 },
            }}
            exit={reduzir ? { opacity: 0 } : { scale: 0.98, y: 8, opacity: 0, transition: { duration: 0.2, ease: "easeInOut" } }}
          >
            {/* Faixa do topo: a cor do tipo, parada. */}
            <div className={cn("absolute top-0 left-0 right-0 h-1.5", config.faixa)} aria-hidden="true" />

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar comunicado"
                className="absolute top-3 right-3 md:top-5 md:right-5 inline-flex size-11 items-center justify-center rounded-lg text-tinta-3 hover:text-tinta hover:bg-papel-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}

            <div className={cn("mx-auto size-20 rounded-full flex items-center justify-center mb-6", config.fundo)}>
              {config.icon}
            </div>

            <p className="inline-flex items-center rounded-full border border-borda bg-papel-2 px-3 py-1 text-sm font-semibold text-tinta-2 mb-5 select-none">
              {config.rotulo}
            </p>

            <h2 id="comunicado-titulo" className="mb-5">
              <WordPullUp
                text={title}
                className="text-3xl md:text-5xl font-extrabold text-tinta tracking-tight leading-tight font-sans"
                delayOffset={0.2}
              />
            </h2>

            <div id="comunicado-mensagem" className="max-w-2xl mx-auto">
              <WordPullUp
                text={message}
                className="text-lg md:text-2xl text-tinta-2 font-medium leading-relaxed font-sans"
                delayOffset={0.4}
              />
            </div>

            {onClose && (
              <div className="mt-10">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-11 items-center justify-center px-8 rounded-lg bg-marca text-[var(--papel)] font-semibold text-base shadow-btn hover:bg-marca-hover active:scale-[0.98] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
                >
                  Ciente, confirmar
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
