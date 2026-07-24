import type { BuilderTabId } from './types'

export interface MountedBuilderTabs {
  studyId: string
  ids: Set<BuilderTabId>
}

export function createMountedBuilderTabs(
  studyId: string,
  activeTab: BuilderTabId,
): MountedBuilderTabs {
  return {
    studyId,
    ids: new Set([activeTab]),
  }
}

export function recordBuilderTabNavigation(
  current: MountedBuilderTabs,
  studyId: string,
  activeTab: BuilderTabId,
  newTab: BuilderTabId,
): MountedBuilderTabs {
  if (current.studyId !== studyId) {
    return {
      studyId,
      ids: new Set([activeTab, newTab]),
    }
  }

  if (current.ids.has(activeTab) && current.ids.has(newTab)) {
    return current
  }

  const ids = new Set(current.ids)
  ids.add(activeTab)
  ids.add(newTab)
  return { studyId, ids }
}
