import type { StepConfig } from 'motia'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import type { ChatCompletionTool } from '../../../services/assistant/openai'
import type { ToolExecutionResult } from '../../../services/assistant/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { handleBuildContent } from '../../../services/assistant/build-content-handler'
import { getTreeTestBuildPrompt } from '../../../services/assistant/build-content-system-prompts'
import { listTreeNodes, bulkUpdateTreeNodes, invalidateTreeNodesCache } from '../../../services/tree-node-service'

const bodySchema = z.object({
  studyId: z.string().uuid(),
  message: z.string().min(1).max(10000),
  streamId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
})

export const config = {
  name: 'BuildTreeTestContent',
  description: 'Build tree test navigation structure via guided AI conversation',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/assistant/build-tree-test',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['assistant'],
} satisfies StepConfig

interface NestedNode {
  label: string
  children?: NestedNode[]
}

const APPLY_TREE_STRUCTURE_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'apply_tree_structure',
    description: 'Replace all tree nodes with a new hierarchical navigation structure. Call this ONCE after the user confirms the proposed structure.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['replace_all'],
          description: 'Always "replace_all" — replaces the entire tree with the provided nodes.',
        },
        nodes: {
          type: 'array',
          description: 'Top-level navigation nodes. Each node can have children for sub-navigation.',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'Node label (1-4 words, title case)' },
              children: {
                type: 'array',
                description: 'Child nodes (level 2)',
                items: {
                  type: 'object',
                  properties: {
                    label: { type: 'string', description: 'Node label (1-4 words, title case)' },
                    children: {
                      type: 'array',
                      description: 'Child nodes (level 3)',
                      items: {
                        type: 'object',
                        properties: {
                          label: { type: 'string', description: 'Node label (1-4 words, title case)' },
                          children: {
                            type: 'array',
                            description: 'Child nodes (level 4, deepest recommended)',
                            items: {
                              type: 'object',
                              properties: {
                                label: { type: 'string', description: 'Node label (1-4 words, title case)' },
                              },
                              required: ['label'],
                            },
                          },
                        },
                        required: ['label'],
                      },
                    },
                  },
                  required: ['label'],
                },
              },
            },
            required: ['label'],
          },
        },
      },
      required: ['action', 'nodes'],
    },
  },
}

function flattenNodes(
  nodes: NestedNode[],
  parentId: string | null,
  result: Array<{ id: string; label: string; parent_id: string | null; position: number }>,
): void {
  nodes.forEach((node, idx) => {
    const id = crypto.randomUUID()
    result.push({ id, label: node.label.trim(), parent_id: parentId, position: idx })
    if (node.children && node.children.length > 0) {
      flattenNodes(node.children, id, result)
    }
  })
}

async function executeApplyTreeStructure(
  toolCall: { id: string; function: { name: string; arguments: string } },
  supabase: SupabaseClient,
  studyId: string,
  _userId: string,
): Promise<ToolExecutionResult> {
  let args: Record<string, unknown>
  try {
    args = JSON.parse(toolCall.function.arguments || '{}')
  } catch {
    return { result: { error: 'Invalid tool arguments (malformed JSON)' } }
  }

  const nodes = args.nodes as NestedNode[] | undefined
  if (!nodes || nodes.length === 0) {
    return { result: { error: 'Missing required field: nodes must be a non-empty array' } }
  }

  const flatNodes: Array<{ id: string; label: string; parent_id: string | null; position: number }> = []
  flattenNodes(nodes, null, flatNodes)

  const { error } = await bulkUpdateTreeNodes(supabase, studyId, flatNodes)
  if (error) {
    return { result: { error: `Failed to save tree structure: ${error.message}` } }
  }

  invalidateTreeNodesCache(studyId)

  const nodeCount = flatNodes.length
  const topLevelCount = flatNodes.filter((n) => n.parent_id === null).length

  return {
    result: { success: true, nodeCount, topLevelCount },
    dataChanged: ['tree_nodes'],
    autoResponse: `Done! Created a tree with **${nodeCount} nodes** (${topLevelCount} top-level categories). You can review and edit the structure in the tree editor.`,
  }
}

export const handler = async (req: ApiRequest, context: ApiHandlerContext) => {
  const { studyId } = bodySchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()

  const [nodesResult, studyResult] = await Promise.all([
    listTreeNodes(supabase, studyId),
    supabase.from('studies').select('title').eq('id', studyId).single(),
  ])

  if (nodesResult.error) {
    context.logger.warn('[build-tree-test] Failed to load tree nodes', { studyId, error: nodesResult.error.message })
  }
  if (studyResult.error) {
    context.logger.warn('[build-tree-test] Failed to load study title', { studyId, error: studyResult.error.message })
  }

  const existingNodes = nodesResult.data ?? []
  // Coerce null (Supabase optional column) to undefined for type compatibility
  const studyTitle = studyResult.data?.title ?? undefined

  // Build hierarchical display for system prompt
  const displayNodes = buildHierarchicalDisplay(existingNodes)

  const systemPrompt = getTreeTestBuildPrompt({
    studyTitle,
    existingNodeCount: existingNodes.length,
    existingNodes: displayNodes,
  })

  return handleBuildContent({
    req,
    context,
    systemPrompt,
    tools: [APPLY_TREE_STRUCTURE_TOOL],
    executeTool: executeApplyTreeStructure,
    conversationType: 'build-tree-test',
  })
}

function buildHierarchicalDisplay(
  nodes: Array<{ id: string; label: string; parent_id: string | null; position: number }>,
): Array<{ label: string; depth: number }> {
  if (nodes.length === 0) return []

  const result: Array<{ label: string; depth: number }> = []

  function traverse(parentId: string | null, depth: number): void {
    const children = nodes
      .filter((n) => n.parent_id === parentId)
      .sort((a, b) => a.position - b.position)
    for (const node of children) {
      result.push({ label: node.label, depth })
      traverse(node.id, depth + 1)
    }
  }

  traverse(null, 0)
  return result
}
