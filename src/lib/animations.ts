export const transitions = {
  spring: { type: 'spring' as const, stiffness: 500, damping: 30 },
  ease: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const },
  snappy: { duration: 0.15, ease: 'easeOut' as const },
};

export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: transitions.ease },
  exit: { opacity: 0, y: -8, transition: transitions.snappy },
};

export const modalVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: transitions.snappy },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.1 } },
};

export const listItemVariants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: transitions.snappy },
  exit: { opacity: 0, x: -8, transition: { duration: 0.15 } },
};

export const cardHoverClass =
  'transition-colors duration-150 hover:border-amber-500/30';

export const buttonPressClass = 'active:scale-[0.97] transition-transform';
