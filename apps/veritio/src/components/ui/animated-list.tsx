'use client'

import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion'
import { ReactNode } from 'react'

interface AnimatedListProps {
  children: ReactNode
  className?: string
}

/**
 * Container for animated list items.
 * Wrap individual items with AnimatedListItem for staggered animations.
 */
export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <AnimatePresence mode="popLayout">
      <div className={className}>{children}</div>
    </AnimatePresence>
  )
}

interface AnimatedListItemProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  index?: number
}

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: index * 0.05,
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  }),
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
}

/**
 * Animated list item with staggered entrance animation.
 * Use inside AnimatedList for coordinated animations.
 */
export function AnimatedListItem({
  children,
  index = 0,
  className,
  ...props
}: AnimatedListItemProps) {
  return (
    <motion.div
      layout
      custom={index}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * Simple fade-in animation for any element.
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.3,
  ...props
}: {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
} & HTMLMotionProps<'div'>) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay, duration }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * Slide up and fade in animation.
 */
export function SlideUp({
  children,
  className,
  delay = 0,
  ...props
}: {
  children: ReactNode
  className?: string
  delay?: number
} & HTMLMotionProps<'div'>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{
        delay,
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1] as const,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * Scale animation for buttons and interactive elements.
 */
export function ScaleOnHover({
  children,
  className,
  scale = 1.02,
  ...props
}: {
  children: ReactNode
  className?: string
  scale?: number
} & HTMLMotionProps<'div'>) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}
