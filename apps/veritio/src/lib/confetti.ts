/**
 * A tasteful, professional confetti burst for celebratory moments (e.g. a
 * successful subscription or plan change). Deliberately restrained: three quick
 * fading volleys from just above center, brand-tinted, and disabled entirely
 * for users who prefer reduced motion. canvas-confetti is dynamically imported
 * so it stays out of the main bundle and only loads when we actually celebrate.
 */
export async function celebrate(): Promise<void> {
  if (typeof window === 'undefined') return

  // Respect the OS "reduce motion" preference — no burst at all.
  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion) return

  try {
    const confetti = (await import('canvas-confetti')).default

    // Brand-tinted palette: violet, indigo, amber, emerald, white.
    const colors = ['#7c3aed', '#6366f1', '#f59e0b', '#10b981', '#ffffff']
    const defaults = {
      origin: { y: 0.35 },
      colors,
      disableForReducedMotion: true,
      zIndex: 2000, // above dialogs/toasts
      ticks: 220,
    } as const

    confetti({ ...defaults, particleCount: 55, spread: 72, startVelocity: 42, scalar: 1.05 })
    window.setTimeout(
      () => confetti({ ...defaults, particleCount: 28, spread: 100, startVelocity: 34, scalar: 0.9, decay: 0.92 }),
      160,
    )
    window.setTimeout(
      () => confetti({ ...defaults, particleCount: 18, spread: 120, startVelocity: 26, scalar: 0.8 }),
      320,
    )
  } catch {
    // Confetti is purely decorative — never let it break the success flow.
  }
}
