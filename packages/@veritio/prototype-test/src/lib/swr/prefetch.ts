import { preload } from 'swr'
import { swrFetcher, swrFetcherUnwrap } from './fetcher'
import { SWR_KEYS } from './config'

export function prefetchProjects() {
  preload(SWR_KEYS.projects, swrFetcher)
}

export function prefetchDashboard() {
  preload(SWR_KEYS.dashboard, swrFetcher)
}
export function prefetchProjectStudies(projectId: string) {
  preload(SWR_KEYS.projectStudies(projectId), swrFetcherUnwrap)
}

export function prefetchProject(projectId: string) {
  preload(SWR_KEYS.project(projectId), swrFetcher)
}

export function prefetchStudy(studyId: string) {
  preload(SWR_KEYS.study(studyId), swrFetcher)
}

export function prefetchArchivedProjects() {
  preload(SWR_KEYS.archivedProjects, swrFetcherUnwrap)
}

export function prefetchArchivedStudies() {
  preload(SWR_KEYS.archivedStudies, swrFetcherUnwrap)
}

export function usePrefetchOnce(prefetchFn: () => void) {
  let prefetched = false

  return () => {
    if (!prefetched) {
      prefetched = true
      prefetchFn()
    }
  }
}

export function createPrefetchHandler(prefetchFn: () => void) {
  let prefetched = false

  return () => {
    if (!prefetched) {
      prefetched = true
      prefetchFn()
    }
  }
}
