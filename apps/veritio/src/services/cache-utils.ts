import { cache, cacheKeys } from '../lib/cache/memory-cache'

export function invalidatePrototypeStudyCache(studyId: string): void {
  cache.delete(cacheKeys.prototype(studyId))
  cache.delete(cacheKeys.prototypeFrames(studyId))
  cache.delete(cacheKeys.prototypeTasks(studyId))
}

export function invalidatePrototypeCache(studyId: string): void {
  cache.delete(cacheKeys.prototype(studyId))
  cache.delete(cacheKeys.prototypeFrames(studyId))
}

export function invalidatePrototypeTasksCache(studyId: string): void {
  cache.delete(cacheKeys.prototypeTasks(studyId))
}
