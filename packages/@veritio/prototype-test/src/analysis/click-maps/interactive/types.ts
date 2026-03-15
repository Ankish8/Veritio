export interface ComponentState {
  id: string
  frameId: string
  name: string
  nodeId: string
  variantProperties?: Record<string, string>
  thumbnailUrl?: string
}

export interface NavigationPosition {
  frameId: string
  frameName: string
  activeStates: ComponentState[]
  timestamp: number
}

export interface StateHistoryEntry {
  id: string
  frameId: string
  frameName: string
  componentState: ComponentState | null
  thumbnailUrl?: string
  clickCount: number
  participantCount: number
  timestamp: number
}

export interface StateMatchingConfig {
  matchingMode: 'exact' | 'partial'
  includeLegacyClicks: boolean
}

export interface TrailClick {
  id: string
  x: number
  y: number
  sequence: number
  participantId: string
  timestamp: number
  wasNavigational: boolean
}

export interface ClickTrailConfig {
  enabled: boolean
  mode: 'single' | 'aggregate'
  selectedParticipantId?: string
  maxClicks: number
  color: string
  opacity: number
}

export interface InteractiveHeatmapState {
  currentPosition: NavigationPosition | null
  history: StateHistoryEntry[]
  selectedHistoryEntry: StateHistoryEntry | null
  stateMatching: StateMatchingConfig
  clickTrail: ClickTrailConfig
  isPrototypeLoading: boolean
  prototypeError: string | null
}

export interface InteractiveHeatmapActions {
  onNavigate: (position: NavigationPosition) => void
  onStateChange: (frameId: string, states: ComponentState[]) => void
  selectHistoryEntry: (entry: StateHistoryEntry | null) => void
  setStateMatching: (config: Partial<StateMatchingConfig>) => void
  setClickTrail: (config: Partial<ClickTrailConfig>) => void
  clearHistory: () => void
  setPrototypeLoading: (loading: boolean) => void
  setPrototypeError: (error: string | null) => void
}

export type FigmaEmbedMessage =
  | { type: 'NAVIGATION'; frameId: string; frameName: string }
  | { type: 'STATE_CHANGE'; frameId: string; nodeId: string; properties: Record<string, string> }
  | { type: 'READY' }
  | { type: 'ERROR'; message: string }

export interface FigmaViewerProps {
  prototypeUrl: string
  startingFrameId?: string
  onNavigate?: (frameId: string, frameName: string) => void
  onStateChange?: (frameId: string, nodeId: string, properties: Record<string, string>) => void
  onReady?: () => void
  onError?: (message: string) => void
  className?: string
}
