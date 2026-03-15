'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Eye, ArrowRight, CheckCircle2 } from 'lucide-react'

export interface EyeTrackingCalibrationScreenProps {
  onComplete: () => void
}

const CALIBRATION_POINTS = [
  { x: 10, y: 10 },   // top-left
  { x: 50, y: 10 },   // top-center
  { x: 90, y: 10 },   // top-right
  { x: 10, y: 50 },   // middle-left
  { x: 50, y: 50 },   // center
  { x: 90, y: 50 },   // middle-right
  { x: 10, y: 90 },   // bottom-left
  { x: 50, y: 90 },   // bottom-center
  { x: 90, y: 90 },   // bottom-right
]

type Phase = 'intro' | 'calibrating' | 'complete'

export function EyeTrackingCalibrationScreen({
  onComplete,
}: EyeTrackingCalibrationScreenProps) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [currentPoint, setCurrentPoint] = useState(0)
  const [clickCounts, setClickCounts] = useState<number[]>(new Array(9).fill(0))
  const [isTransitioning, setIsTransitioning] = useState(false)
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const CLICKS_PER_POINT = 3

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
    }
  }, [])

  const handleStartCalibration = () => {
    setPhase('calibrating')
  }

  const advancingRef = useRef(false)

  const handlePointClick = useCallback(() => {
    setClickCounts(prev => {
      const next = [...prev]
      next[currentPoint] = (next[currentPoint] || 0) + 1

      if (next[currentPoint] >= CLICKS_PER_POINT && !advancingRef.current) {
        // Guard against double-click race — only advance once per point
        advancingRef.current = true
        if (currentPoint >= CALIBRATION_POINTS.length - 1) {
          setTimeout(() => setPhase('complete'), 300)
        } else {
          setTimeout(() => {
            setCurrentPoint(p => p + 1)
            advancingRef.current = false
          }, 200)
        }
      }

      return next
    })
  }, [currentPoint])

  const handleContinue = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    transitionTimeoutRef.current = setTimeout(() => {
      onComplete()
    }, 300)
  }

  // Intro screen — explain what eye tracking is and why calibration is needed
  if (phase === 'intro') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--style-bg)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-lg space-y-6"
        >
          <div className="text-center space-y-3">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="inline-flex items-center justify-center w-14 h-14 rounded-full"
              style={{ backgroundColor: 'var(--brand-subtle)' }}
            >
              <Eye className="h-7 w-7" style={{ color: 'var(--brand)' }} />
            </motion.div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--style-text-primary)' }}>
              Eye Tracking Calibration
            </h1>
            <p style={{ color: 'var(--style-text-secondary)' }}>
              We&apos;ll use your webcam to understand where you&apos;re looking on the screen.
              This helps the research team understand what catches your attention.
            </p>
          </div>

          <div className="space-y-3">
            <h2
              className="text-sm font-medium uppercase tracking-wide"
              style={{ color: 'var(--style-text-secondary)' }}
            >
              Quick Calibration Steps
            </h2>
            {[
              {
                title: 'Look at each dot',
                description: 'A dot will appear at different positions on your screen.',
              },
              {
                title: 'Click the dot 3 times',
                description: 'While looking at it, click the dot. This teaches the system where your eyes are pointing.',
              },
              {
                title: 'Keep your head steady',
                description: 'Try to move only your eyes, not your head, for best accuracy.',
              },
            ].map((tip, index) => (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.15 + index * 0.1 }}
                className="flex items-start gap-3 p-4"
                style={{
                  borderRadius: 'var(--style-radius)',
                  backgroundColor: 'var(--style-card-bg)',
                  border: '1px solid var(--style-card-border)',
                }}
              >
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{ backgroundColor: 'var(--brand-subtle)', color: 'var(--brand)' }}
                >
                  {index + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="font-medium text-sm" style={{ color: 'var(--style-text-primary)' }}>
                    {tip.title}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--style-text-secondary)' }}>
                    {tip.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="pt-2"
          >
            <motion.button
              onClick={handleStartCalibration}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full px-4 py-3.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
              style={{
                backgroundColor: 'var(--brand)',
                color: 'var(--brand-foreground)',
                borderRadius: 'var(--style-radius)',
              }}
            >
              Start Calibration
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>

          <p className="text-xs text-center" style={{ color: 'var(--style-text-secondary)' }}>
            This takes about 30 seconds. Your camera feed is only used for gaze detection and is never stored.
          </p>
        </motion.div>
      </div>
    )
  }

  // Calibrating phase — full-screen 9-dot calibration
  if (phase === 'calibrating') {
    const point = CALIBRATION_POINTS[currentPoint]
    const clicks = clickCounts[currentPoint] || 0
    const progress = ((currentPoint * CLICKS_PER_POINT + clicks) / (CALIBRATION_POINTS.length * CLICKS_PER_POINT)) * 100

    return (
      <div
        className="fixed inset-0 cursor-crosshair select-none"
        style={{ backgroundColor: 'var(--style-bg, #ffffff)' }}
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200">
          <motion.div
            className="h-full"
            style={{ backgroundColor: 'var(--brand)' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>

        {/* Instruction text */}
        <div className="absolute top-6 left-0 right-0 text-center">
          <p className="text-sm" style={{ color: 'var(--style-text-secondary)' }}>
            Look at the dot and click it ({clicks}/{CLICKS_PER_POINT})
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--style-text-secondary)', opacity: 0.6 }}>
            Point {currentPoint + 1} of {CALIBRATION_POINTS.length}
          </p>
        </div>

        {/* Calibration dot */}
        <motion.button
          key={currentPoint}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={handlePointClick}
          className="absolute w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
          style={{
            left: `${point.x}%`,
            top: `${point.y}%`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'var(--brand)',
          }}
        >
          <motion.div
            className="w-3 h-3 rounded-full bg-white"
            animate={{
              scale: clicks > 0 ? [1, 0.6, 1] : 1,
            }}
            transition={{ duration: 0.15 }}
          />
        </motion.button>

        {/* Completed points (small dots) */}
        {CALIBRATION_POINTS.map((p, i) => {
          if (i >= currentPoint) return null
          return (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full opacity-30"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'var(--brand)',
              }}
            />
          )
        })}
      </div>
    )
  }

  // Complete phase — success message
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--style-bg)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: isTransitioning ? 0 : 1,
          y: isTransitioning ? -20 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-sm text-center space-y-4"
      >
        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-full"
          style={{ backgroundColor: 'var(--brand-subtle)' }}
        >
          <CheckCircle2 className="h-7 w-7" style={{ color: 'var(--brand)' }} />
        </motion.div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--style-text-primary)' }}>
          Calibration Complete
        </h2>
        <p className="text-sm" style={{ color: 'var(--style-text-secondary)' }}>
          Eye tracking is ready. You can now start the tasks.
        </p>
        <motion.button
          onClick={handleContinue}
          disabled={isTransitioning}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full px-4 py-3.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--brand)',
            color: 'var(--brand-foreground)',
            borderRadius: 'var(--style-radius)',
          }}
        >
          Continue to Tasks
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    </div>
  )
}
