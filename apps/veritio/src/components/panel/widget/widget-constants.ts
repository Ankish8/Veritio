import {
  MessageSquare,
  AlignJustify,
  Square,
  ArrowRight,
  Tag,
} from 'lucide-react'
import type { InterceptWidgetSettings } from '../types'

export function getStudyTypeCopy(studyType?: string): {
  description: string
  buttonText: string
} {
  switch (studyType) {
    case 'card_sort':
      return {
        description: 'Help us organize our content by grouping cards.',
        buttonText: 'Start Card Sort',
      }
    case 'tree_test':
      return {
        description: 'Test our navigation by finding items in our menu.',
        buttonText: 'Start Tree Test',
      }
    case 'prototype_test':
      return {
        description: 'Try our prototype and share your feedback.',
        buttonText: 'Try Prototype',
      }
    case 'survey':
      return {
        description: 'Take a quick survey and share your feedback.',
        buttonText: 'Take Survey',
      }
    default:
      return {
        description: 'Share your feedback to help us improve.',
        buttonText: 'Get Started',
      }
  }
}

export const DEFAULT_SETTINGS: InterceptWidgetSettings = {
  enabled: true, // Widget is always enabled - requires embed code installation
  position: 'bottom-right',
  triggerType: 'time_delay',
  triggerValue: 5,
  backgroundColor: '#ffffff',
  textColor: '#1a1a1a',
  buttonColor: '#000000',
  title: 'Help us improve!',
  description: 'Share your feedback to help us improve.',
  buttonText: 'Get Started',
}

export const POSITION_OPTIONS = [
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'top-left', label: 'Top Left' },
] as const

export const TRIGGER_OPTIONS = [
  { value: 'time_delay', label: 'Time Delay', unit: 'seconds' },
  { value: 'scroll_percentage', label: 'Scroll Percentage', unit: '%' },
  { value: 'exit_intent', label: 'Exit Intent', unit: null },
] as const

export const WIDGET_STYLES = [
  {
    value: 'popup' as const,
    label: 'Popup',
    description: 'Corner card (default)',
    Icon: MessageSquare,
  },
  {
    value: 'banner' as const,
    label: 'Banner',
    description: 'Full-width bar',
    Icon: AlignJustify,
  },
  {
    value: 'modal' as const,
    label: 'Modal',
    description: 'Center overlay',
    Icon: Square,
  },
  {
    value: 'drawer' as const,
    label: 'Drawer',
    description: 'Full-height side panel',
    Icon: ArrowRight,
  },
  {
    value: 'badge' as const,
    label: 'Badge',
    description: 'Persistent tab',
    Icon: Tag,
  },
]

export const ANIMATIONS = [
  { value: 'fade' as const, label: 'Fade' },
  { value: 'slide' as const, label: 'Slide' },
  { value: 'zoom' as const, label: 'Zoom' },
  { value: 'bounce' as const, label: 'Bounce' },
]
