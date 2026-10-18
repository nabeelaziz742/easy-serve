// Shared framer-motion presets so every dashboard animates the same way:
// short, subtle and interruptible. Keep durations under ~250ms.

export const easeOut = [0.22, 1, 0.36, 1];

export const listVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: easeOut } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
};

export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: easeOut },
};

export const hoverLift = { y: -2, transition: { duration: 0.15 } };
