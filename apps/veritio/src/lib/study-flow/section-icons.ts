import {
  Hand,
  FileSignature,
  Filter,
  UserCircle,
  ClipboardList,
  ClipboardPen,
  ClipboardCheck,
  Heart,
  DoorClosed,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ActiveFlowSection } from '../../stores/study-flow-builder/index'

/**
 * Maps section IDs to their corresponding icons for the left sidebar.
 * This provides visual identification of each section in the study flow.
 */
export const sectionIcons: Partial<Record<ActiveFlowSection, LucideIcon>> = {
  welcome: Hand,
  agreement: FileSignature,
  screening: Filter,
  identifier: UserCircle,
  survey: ClipboardList,
  pre_study: ClipboardPen,
  post_study: ClipboardCheck,
  thank_you: Heart,
  closed: DoorClosed,
}
