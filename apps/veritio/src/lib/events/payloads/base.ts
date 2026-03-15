/**
 * Base payload types for events.
 * These are reusable building blocks for specific event payloads.
 */

/**
 * Base payload for all resource-related events.
 */
export interface BaseResourcePayload {
  resourceType: string
  userId?: string
  studyId?: string
  projectId?: string
}

/**
 * Generic CRUD event payload.
 * Used for create, update, delete, list operations.
 */
export interface CrudEventPayload<
  TResource extends string = string,
  TAction extends 'create' | 'update' | 'delete' | 'list' = 'create' | 'update' | 'delete' | 'list'
> extends BaseResourcePayload {
  resourceType: TResource
  resourceId?: string // Required for create/update/delete, optional for list
  action: TAction
  count?: number // For list operations
}

/**
 * Generic bulk operation event payload.
 */
export interface CrudBulkEventPayload<TResource extends string = string> extends BaseResourcePayload {
  resourceType: TResource
  action: 'bulk-update'
  count: number
}

/**
 * Resource deleted event payload.
 */
export interface ResourceDeletedPayload extends BaseResourcePayload {
  resourceId: string
  resourceType: string
}

/**
 * Resource fetched event payload.
 */
export interface ResourceFetchedPayload extends BaseResourcePayload {
  resourceId?: string
  resourceType: string
}

/**
 * Resource listed event payload.
 */
export interface ResourceListedPayload extends BaseResourcePayload {
  resourceType: string
  count?: number
}
