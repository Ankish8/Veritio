import type { StudyType, StudyTypePlugin } from '../types'

class PluginRegistry {
  private plugins = new Map<StudyType, StudyTypePlugin>()
  private initialized = false

  register<P extends StudyTypePlugin>(plugin: P): void {
    this.plugins.set(plugin.studyType, plugin)
  }

  registerAll(plugins: StudyTypePlugin[]): void {
    plugins.forEach((plugin) => this.register(plugin))
    this.initialized = true
  }

  get<T extends StudyTypePlugin = StudyTypePlugin>(studyType: StudyType): T | undefined {
    return this.plugins.get(studyType) as T | undefined
  }

  getOrThrow<T extends StudyTypePlugin = StudyTypePlugin>(studyType: StudyType): T {
    const plugin = this.get<T>(studyType)
    if (!plugin) {
      throw new Error(`No plugin registered for study type: ${studyType}`)
    }
    return plugin
  }

  has(studyType: StudyType): boolean {
    return this.plugins.has(studyType)
  }

  getAll(): StudyTypePlugin[] {
    return Array.from(this.plugins.values())
  }

  getStudyTypes(): StudyType[] {
    return Array.from(this.plugins.keys())
  }

  unregister(studyType: StudyType): boolean {
    return this.plugins.delete(studyType)
  }

  clear(): void {
    this.plugins.clear()
    this.initialized = false
  }

  isInitialized(): boolean {
    return this.initialized
  }

  get size(): number {
    return this.plugins.size
  }
}

export const pluginRegistry = new PluginRegistry()

export function getPlugin<T extends StudyTypePlugin = StudyTypePlugin>(
  studyType: StudyType
): T | undefined {
  return pluginRegistry.get<T>(studyType)
}

export function getPluginOrThrow<T extends StudyTypePlugin = StudyTypePlugin>(
  studyType: StudyType
): T {
  return pluginRegistry.getOrThrow<T>(studyType)
}

export function getBuilderForStudyType(studyType: StudyType) {
  return pluginRegistry.getOrThrow(studyType).builder
}

export function getPlayerForStudyType(studyType: StudyType) {
  return pluginRegistry.getOrThrow(studyType).player
}

export function getResultsForStudyType(studyType: StudyType) {
  return pluginRegistry.getOrThrow(studyType).results
}

export function getValidationForStudyType(studyType: StudyType) {
  return pluginRegistry.getOrThrow(studyType).validation
}

export function getExportForStudyType(studyType: StudyType) {
  return pluginRegistry.getOrThrow(studyType).export
}

export function isStudyTypeSupported(studyType: string): studyType is StudyType {
  return pluginRegistry.has(studyType as StudyType)
}

export function getAvailableStudyTypes(): StudyType[] {
  return pluginRegistry.getStudyTypes()
}

export function getAllPlugins(): StudyTypePlugin[] {
  return pluginRegistry.getAll()
}

export function createPluginRegistry(plugins: StudyTypePlugin[]): PluginRegistry {
  const registry = new PluginRegistry()
  registry.registerAll(plugins)
  return registry
}
