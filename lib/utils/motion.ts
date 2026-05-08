import type { Variants } from 'framer-motion';

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
  }
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.05
    }
  }
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
  }
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
};

export const glowPulse: Variants = {
  animate: {
    scale: [1, 1.07, 1],
    opacity: [0.6, 0.85, 0.6],
    transition: {
      duration: 5,
      ease: 'easeInOut',
      repeat: Infinity
    }
  }
};

export const wordDrop = (delay: number): Variants => ({
  hidden: {
    opacity: 0,
    y: -48,
    rotateX: 20
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      delay,
      duration: 0.65,
      ease: [0.16, 1, 0.3, 1]
    }
  }
});
