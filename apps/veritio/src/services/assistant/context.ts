/**
 * Veritio AI Assistant — Context Types
 *
 * Defines the mode-based context system that allows the assistant
 * to work on any page (results, builder, dashboard, projects).
 */

/** Which page/context the assistant is operating in */
export type AssistantMode = 'results' | 'builder' | 'dashboard' | 'projects' | 'create'

/**
 * Context object passed from the frontend to the backend.
 * Determines system prompt, available tools, and suggestion chips.
 */
export interface AssistantContext {
  mode: AssistantMode
  /** Required for 'results' and 'builder' modes */
  studyId?: string
  /** Required for 'projects' mode */
  projectId?: string
  /** Study type — used to select study-specific tools in 'results' mode */
  studyType?: string
}
