import type { StudyTypePlugin } from '../types'
import type { StudyTypePluginInput } from './types'
import { createPlayerConfig } from './create-player-config'
import { createValidationConfig } from './create-validation-config'
import { createResultsConfig } from './create-results-config'
import { createExportConfig } from './create-export-config'

export function createStudyTypePlugin<
  TBuilderData extends object,
  TBuilderSnapshot extends object,
  TBuilderExtensions extends object,
  TSettings extends object,
  TPlayerProps extends object,
  TValidationInput extends object,
  TResults extends object
>(
  config: StudyTypePluginInput<
    TBuilderData,
    TBuilderSnapshot,
    TBuilderExtensions,
    TSettings,
    TPlayerProps,
    TValidationInput,
    TResults
  >
): StudyTypePlugin<TBuilderData, TSettings, TPlayerProps, TValidationInput, TResults> {
  const {
    studyType,
    name,
    description,
    icon,
    builderTabs,
    builderStore,
    ContentEditor,
    player,
    validation,
    results,
    export: exportConfig,
    capabilities = {},
    hooks,
  } = config

  const playerConfig = createPlayerConfig(player)
  const validationConfig = createValidationConfig(validation)
  const resultsConfig = createResultsConfig(results)
  const exportConfigResult = createExportConfig(exportConfig)

  return {
    studyType,
    name,
    description,
    icon,
    version: '1.0.0',

    capabilities: {
      hasBuilder: capabilities.hasBuilder ?? true,
      hasPlayer: capabilities.hasPlayer ?? true,
      hasAnalysis: capabilities.hasAnalysis ?? true,
      hasExport: capabilities.hasExport ?? true,
      supportsBranding: capabilities.supportsBranding ?? true,
      supportsStudyFlow: capabilities.supportsStudyFlow ?? true,
    },

    builder: {
      tabs: builderTabs,
      defaultSettings: builderStore.defaults as unknown as TSettings,
      useStore: () => {
        throw new Error('useStore must be provided by the domain package.')
      },
      ContentEditor,
    },

    player: playerConfig,

    results: resultsConfig,

    validation: validationConfig,

    export: {
      pdfSections: exportConfigResult.pdfSections,
      exportToCsv: exportConfigResult.exportToCsv,
      exportToExcel: exportConfigResult.exportToExcel,
      exportToPdf: exportConfigResult.exportToPdf,
    },

    settingsSchema: {} as never,

    hooks,
  }
}
