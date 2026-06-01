import React from 'react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const scaleUp = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1 },
};

const slideLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0 },
};

const slideRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
};

const VARIANTS = {
  'fade-up': fadeUp,
  'fade-in': fadeIn,
  'scale-up': scaleUp,
  'slide-left': slideLeft,
  'slide-right': slideRight,
};

const ScrollReveal = ({
  children,
  variant = 'fade-up',
  delay = 0,
  duration = 0.7,
  once = true,
  threshold = 0.15,
  className = '',
  as = 'div',
}) => {
  const MotionComponent = motion[as] || motion.div;

  return (
    <MotionComponent
      className={className}
      variants={VARIANTS[variant] || fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: threshold }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </MotionComponent>
  );
};

export const StaggerContainer = ({ children, className = '', staggerDelay = 0.1 }) => (
  <motion.div
    className={className}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.1 }}
    transition={{ staggerChildren: staggerDelay }}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({ children, className = '' }) => (
  <motion.div
    className={className}
    variants={fadeUp}
    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

export default ScrollReveal;
