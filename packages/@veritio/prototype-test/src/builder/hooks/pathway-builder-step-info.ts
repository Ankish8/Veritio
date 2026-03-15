import { useCallback } from 'react'
import type { PrototypeTestFrame } from '@veritio/study-types'
import type { ComponentStateSnapshot } from '../../hooks/use-prototype-controls'
import type { OverlayData } from '../composite-thumbnail'
import type { ComponentVariant, ComponentInstance, OverlayInfo } from './pathway-builder-types'

/**
 * Hook that provides step variant info and compositing helpers for the pathway builder.
 * Extracts the step-info-related logic from the main hook to keep it focused.
 */
export function usePathwayBuilderStepInfo({
  componentStates,
  changedComponentsPerStep,
  componentVariants,
  componentInstances,
  trackComponentStates,
}: {
  componentStates: ComponentStateSnapshot[]
  changedComponentsPerStep: string[][]
  componentVariants: ComponentVariant[]
  componentInstances: ComponentInstance[]
  trackComponentStates: boolean
}) {
  const getStepVariantInfo = useCallback((index: number): { variantName: string; componentSetName: string } | null => {
    const stateSnapshot = componentStates[index]

    if (!trackComponentStates || !stateSnapshot || Object.keys(stateSnapshot).length === 0) {
      return null
    }

    const changedAtThisStep = changedComponentsPerStep[index] || []
    if (changedAtThisStep.length === 0) {
      return null
    }

    for (const componentNodeId of changedAtThisStep) {
      const variantId = stateSnapshot[componentNodeId]
      if (!variantId) continue

      const variant = componentVariants.find(v => v.variant_id === variantId)
      if (variant) {
        return {
          variantName: variant.variant_name,
          componentSetName: variant.component_set_name,
        }
      }
    }

    return null
  }, [componentStates, componentVariants, trackComponentStates, changedComponentsPerStep])

  const getCompositingInfos = useCallback((
    index: number,
    frame: PrototypeTestFrame
  ): OverlayInfo[] => {
    const stateSnapshot = componentStates[index]

    if (!trackComponentStates || !stateSnapshot || Object.keys(stateSnapshot).length === 0) {
      return []
    }

    const frameNodeId = frame.figma_node_id
    const componentsToShow = Object.keys(stateSnapshot)

    if (componentsToShow.length === 0) {
      return []
    }

    const overlays: OverlayInfo[] = []

    for (const instanceNodeId of componentsToShow) {
      const variantId = stateSnapshot[instanceNodeId]
      if (!variantId) continue

      const instance = componentInstances.find(
        inst => inst.frame_node_id === frameNodeId && (
          inst.instance_id === instanceNodeId ||
          inst.component_id === variantId
        )
      )

      let matchedInstance = instance
      if (!matchedInstance) {
        const variant = componentVariants.find(v => v.variant_id === variantId)
        if (variant) {
          matchedInstance = componentInstances.find(
            inst => inst.component_set_id === variant.component_set_id && inst.frame_node_id === frameNodeId
          )
        }
      }

      if (!matchedInstance) {
        matchedInstance = componentInstances.find(inst => inst.instance_id === instanceNodeId)
      }

      const variant = componentVariants.find(v => v.variant_id === variantId)

      if (matchedInstance) {
        const componentWidth = variant?.image_width || matchedInstance.width
        const componentHeight = variant?.image_height || matchedInstance.height
        const fallbackLabel = variant?.variant_name || matchedInstance.instance_name || 'Recorded interaction'

        overlays.push({
          instanceId: matchedInstance.instance_id,
          variantImageUrl: variant?.image_url,
          variantName: fallbackLabel,
          relativeX: matchedInstance.relative_x,
          relativeY: matchedInstance.relative_y,
          width: componentWidth,
          height: componentHeight,
          frameWidth: matchedInstance.frame_width || frame.width || 1920,
          frameHeight: matchedInstance.frame_height || frame.height || 1080,
        })
      }
    }

    return overlays
  }, [componentStates, componentInstances, componentVariants, trackComponentStates])

  const getOverlaysForStep = useCallback((index: number, frame: PrototypeTestFrame): OverlayData[] => {
    const compositingInfos = trackComponentStates ? getCompositingInfos(index, frame) : []
    if (compositingInfos.length === 0) return []

    return compositingInfos.map(info => ({
      variantImageUrl: info.variantImageUrl,
      variantLabel: info.variantName.split('=').pop()?.trim() || info.variantName,
      relativeX: info.relativeX,
      relativeY: info.relativeY,
      componentWidth: info.width,
      componentHeight: info.height,
    }))
  }, [trackComponentStates, getCompositingInfos])

  const getFrameDimensions = useCallback((index: number, frame: PrototypeTestFrame): { width: number; height: number } | null => {
    const compositingInfos = trackComponentStates ? getCompositingInfos(index, frame) : []
    if (compositingInfos.length === 0) return null
    return { width: compositingInfos[0].frameWidth, height: compositingInfos[0].frameHeight }
  }, [trackComponentStates, getCompositingInfos])

  return {
    getStepVariantInfo,
    getCompositingInfos,
    getOverlaysForStep,
    getFrameDimensions,
  }
}
