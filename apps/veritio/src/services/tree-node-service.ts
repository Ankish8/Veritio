import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import type { TreeNode } from './types'
import { createCrudService, treeNodesConfig, type TreeNodeBulkItem } from '../lib/crud-factory/index'

type SupabaseClientType = SupabaseClient<Database>

const treeNodeCrudService = createCrudService(treeNodesConfig)

export function invalidateTreeNodesCache(studyId: string): void {
  treeNodeCrudService.invalidateCache(studyId)
}

export async function listTreeNodes(
  supabase: SupabaseClientType,
  studyId: string,
  userId?: string
): Promise<{ data: TreeNode[] | null; error: Error | null }> {
  return treeNodeCrudService.list(supabase, studyId, userId)
}

export async function getTreeNode(
  supabase: SupabaseClientType,
  nodeId: string,
  studyId: string
): Promise<{ data: TreeNode | null; error: Error | null }> {
  return treeNodeCrudService.get(supabase, nodeId, studyId)
}

export async function createTreeNode(
  supabase: SupabaseClientType,
  studyId: string,
  input: { label: string; parent_id?: string | null; position?: number }
): Promise<{ data: TreeNode | null; error: Error | null }> {
  return treeNodeCrudService.create(supabase, studyId, input)
}

export async function updateTreeNode(
  supabase: SupabaseClientType,
  nodeId: string,
  studyId: string,
  input: { label?: string; parent_id?: string | null; position?: number }
): Promise<{ data: TreeNode | null; error: Error | null }> {
  return treeNodeCrudService.update(supabase, nodeId, studyId, input)
}

export async function deleteTreeNode(
  supabase: SupabaseClientType,
  nodeId: string,
  studyId: string
): Promise<{ success: boolean; error: Error | null }> {
  return treeNodeCrudService.delete(supabase, nodeId, studyId)
}

export async function bulkUpdateTreeNodes(
  supabase: SupabaseClientType,
  studyId: string,
  nodes: Array<{ id: string; label: string; parent_id?: string | null; position: number }>
): Promise<{ data: TreeNode[] | null; error: Error | null }> {
  return treeNodeCrudService.bulkUpdate(supabase, studyId, nodes as TreeNodeBulkItem[])
}
