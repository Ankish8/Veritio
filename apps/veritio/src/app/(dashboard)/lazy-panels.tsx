"use client"

import dynamic from "next/dynamic"

export const FloatingActionBarPanel = dynamic(
  () => import("@/components/analysis/shared/floating-action-bar").then(m => ({ default: m.FloatingActionBarPanel })),
  { ssr: false }
)

export const MobilePanelModal = dynamic(
  () => import("@/components/analysis/shared/floating-action-bar").then(m => ({ default: m.MobilePanelModal })),
  { ssr: false }
)
