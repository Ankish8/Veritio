'use client'

import { memo, useEffect, useState, Suspense } from 'react'
import type React from 'react'
import { getComponent, preloadComponent, getRegistryEntry } from '@/lib/generative-ui/registry'
import type { PropStatus } from '@/lib/generative-ui/registry'

interface GenerativeComponentProps {
  componentName: string
  props: Record<string, unknown>
  propStatus: Record<string, PropStatus>
  componentId: string
  interactable?: boolean
  onStateChange?: (state: Record<string, unknown>) => void
}

/**
 * Dispatcher that looks up componentName in the registry and renders it.
 * Handles lazy loading of components on first render.
 */
export const GenerativeComponent = memo(function GenerativeComponent({
  componentName,
  props,
  propStatus,
  componentId: _componentId,
  interactable,
  onStateChange,
}: GenerativeComponentProps) {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(
    () => getComponent(componentName),
  )
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (Component) return
    const entry = getRegistryEntry(componentName)
    if (!entry) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadError(true)
      return
    }
    preloadComponent(componentName)
      .then(() => {
        setComponent(() => getComponent(componentName))
      })
      .catch(() => setLoadError(true))
  }, [componentName, Component])

  if (loadError) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground">
        Unknown component: {componentName}
      </div>
    )
  }

  if (!Component) {
    return (
      <div className="px-3 py-2 space-y-1.5">
        <div className="animate-pulse bg-muted rounded h-3 w-3/4" />
        <div className="animate-pulse bg-muted rounded h-3 w-1/2" />
      </div>
    )
  }

  // If interactable isn't explicitly set via props, look it up from the registry
  const isInteractable = interactable ?? getRegistryEntry(componentName)?.interactable ?? false

  return (
    <Suspense
      fallback={
        <div className="px-3 py-2 space-y-1.5">
          <div className="animate-pulse bg-muted rounded h-3 w-3/4" />
          <div className="animate-pulse bg-muted rounded h-3 w-1/2" />
        </div>
      }
    >
      <Component
        {...props}
        propStatus={propStatus}
        {...(isInteractable && onStateChange ? { onStateChange } : {})}
      />
    </Suspense>
  )
})
