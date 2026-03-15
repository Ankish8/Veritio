import type { SWRConfiguration } from 'swr'

export const swrConfig: SWRConfiguration = {
  dedupingInterval: 60000,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  keepPreviousData: true,
  loadingTimeout: 3000,
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
    const fetchError = error as { status?: number }

    // Don't retry on 4xx client errors (except 408 timeout and 429 rate limit)
    if (
      fetchError.status &&
      fetchError.status >= 400 &&
      fetchError.status < 500 &&
      fetchError.status !== 408 &&
      fetchError.status !== 429
    ) {
      return
    }

    if (retryCount >= 3) return

    // Exponential backoff with jitter
    const baseDelay = Math.min(1000 * Math.pow(2, retryCount), 10000)
    const jitter = baseDelay * 0.2 * Math.random()
    setTimeout(() => revalidate({ retryCount }), baseDelay + jitter)
  },

  suspense: false,
}
