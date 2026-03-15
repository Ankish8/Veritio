import type { SWRConfiguration } from 'swr'
export const SWR_STATIC: SWRConfiguration = {
  dedupingInterval: 60000,
  revalidateOnFocus: false,
}
export const SWR_DYNAMIC: SWRConfiguration = {
  dedupingInterval: 5000,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
}
export const swrWithPolling = (interval: number): SWRConfiguration => ({
  ...SWR_DYNAMIC,
  refreshInterval: interval,
  keepPreviousData: true,
})
