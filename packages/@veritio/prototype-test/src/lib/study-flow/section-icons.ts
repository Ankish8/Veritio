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
