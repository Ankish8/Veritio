/**
 * Core Statistical Math Functions
 *
 * Shared mathematical primitives used across statistical analysis modules:
 * - Gamma function (Lanczos approximation)
 * - Chi-square distribution (CDF, p-value)
 * - T-distribution (CDF, p-value)
 * - Regularized incomplete beta function
 * - Normal CDF
 * - Basic descriptive statistics (mean, variance, standard deviation)
 */

// =============================================================================
// Basic Descriptive Statistics
// =============================================================================

export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function variance(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1)
}

export function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values))
}

// =============================================================================
// Lanczos Gamma Approximation
// =============================================================================

const LANCZOS_G = 7
const LANCZOS_COEFFICIENTS = [
  0.99999999999980993,
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.13857109526572012,
  9.9843695780195716e-6,
  1.5056327351493116e-7,
]

export function gamma(z: number): number {
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z))
  }

  z -= 1
  let x = LANCZOS_COEFFICIENTS[0]
  for (let i = 1; i < LANCZOS_G + 2; i++) {
    x += LANCZOS_COEFFICIENTS[i] / (z + i)
  }

  const t = z + LANCZOS_G + 0.5
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x
}

export function logGamma(z: number): number {
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
  }

  z -= 1
  let a = LANCZOS_COEFFICIENTS[0]
  const t = z + LANCZOS_G + 0.5

  for (let i = 1; i < LANCZOS_COEFFICIENTS.length; i++) {
    a += LANCZOS_COEFFICIENTS[i] / (z + i)
  }

  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a)
}

// =============================================================================
// Regularized Incomplete Gamma Functions (for Chi-Square CDF)
// =============================================================================

function lowerIncompleteGammaSeries(a: number, x: number): number {
  if (x <= 0) return 0

  let sum = 0
  let term = 1 / a
  sum = term

  for (let n = 1; n < 200; n++) {
    term *= x / (a + n)
    sum += term
    if (Math.abs(term) < 1e-10 * Math.abs(sum)) break
  }

  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * sum
}

function regularizedGammaQ(a: number, x: number): number {
  if (x < 0 || a <= 0) return 1
  if (x === 0) return 1

  const eps = 1e-10
  const fpmin = 1e-30

  let b = x + 1 - a
  let c = 1 / fpmin
  let d = 1 / b
  let h = d

  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < fpmin) d = fpmin
    c = b + an / c
    if (Math.abs(c) < fpmin) c = fpmin
    d = 1 / d
    const delta = d * c
    h *= delta
    if (Math.abs(delta - 1) < eps) break
  }

  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h
}

export function regularizedGammaP(a: number, x: number): number {
  if (x < 0 || a <= 0) return 0
  if (x === 0) return 0

  if (x < a + 1) {
    return lowerIncompleteGammaSeries(a, x)
  } else {
    return 1 - regularizedGammaQ(a, x)
  }
}

// =============================================================================
// Chi-Square Distribution
// =============================================================================

export function chiSquareCDF(x: number, df: number): number {
  if (x <= 0) return 0
  return regularizedGammaP(df / 2, x / 2)
}

export function chiSquarePValue(x: number, df: number): number {
  if (x <= 0) return 1
  return 1 - chiSquareCDF(x, df)
}

// =============================================================================
// Normal CDF (Abramowitz & Stegun approximation)
// =============================================================================

export function normalCDF(x: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  const absX = Math.abs(x) / Math.sqrt(2)

  const t = 1.0 / (1.0 + p * absX)
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX)

  return 0.5 * (1.0 + sign * y)
}

// =============================================================================
// Regularized Incomplete Beta Function (for T-Distribution CDF)
// =============================================================================

function beta(a: number, b: number): number {
  return (gamma(a) * gamma(b)) / gamma(a + b)
}

export function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1

  const eps = 1e-10
  const fpmin = 1e-30

  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < fpmin) d = fpmin
  d = 1 / d
  let h = d

  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < fpmin) d = fpmin
    c = 1 + aa / c
    if (Math.abs(c) < fpmin) c = fpmin
    d = 1 / d
    h *= d * c

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < fpmin) d = fpmin
    c = 1 + aa / c
    if (Math.abs(c) < fpmin) c = fpmin
    d = 1 / d
    const delta = d * c
    h *= delta
    if (Math.abs(delta - 1) < eps) break
  }

  const bt = Math.exp(
    a * Math.log(x) + b * Math.log(1 - x) - Math.log(beta(a, b))
  )
  return bt * h / a
}

// =============================================================================
// T-Distribution
// =============================================================================

export function tDistributionCDF(t: number, df: number): number {
  const x = df / (df + t * t)
  const ibeta = regularizedBeta(x, df / 2, 0.5)
  return t >= 0 ? 1 - 0.5 * ibeta : 0.5 * ibeta
}

export function tTestPValue(t: number, df: number): number {
  const cdf = tDistributionCDF(Math.abs(t), df)
  return 2 * (1 - cdf)
}
