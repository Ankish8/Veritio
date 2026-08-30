/**
 * MCP resources.
 *
 * Resources are for reference material an agent should be able to *read*
 * without spending a tool call and without it sitting in context unasked. Two
 * things qualify here, and nothing else does:
 *
 * 1. The REST API's OpenAPI document. Everything the MCP server can do, the
 *    HTTP API can do too — and a few things it cannot, because some operations
 *    are better expressed as a script than as a conversation. An agent that can
 *    read the spec can write that script.
 * 2. Methodology guidance. Choosing between a card sort and a tree test is the
 *    single most consequential decision in a study, it is made before any tool
 *    is called, and getting it wrong wastes real participants' time.
 *
 * Deliberately *not* resources: study data of any kind. Resources carry no
 * per-item authorization in the way tools do — the read callback would have to
 * re-implement the gate in `authz/guard.ts`, and a second implementation of an
 * authorization check is how the two drift apart.
 */

import type { McpServer } from '@modelcontextprotocol/server'
import { STUDY_TYPES } from './schemas/common'
import { getMethodologyGuidance } from '../services/assistant/methodology-guidance'

const OPENAPI_URI = 'veritio://openapi.json'
const METHODOLOGY_URI = 'veritio://guide/methodologies'

export function registerResources(server: McpServer): void {
  server.registerResource(
    'openapi',
    OPENAPI_URI,
    {
      title: 'Veritio REST API (OpenAPI 3.1)',
      description:
        'The full HTTP API specification. Read this when a task is better done as a script than as a ' +
        'conversation — bulk imports, scheduled jobs, or anything a colleague needs to re-run without an ' +
        'agent. Same credentials and scopes as this MCP server.',
      mimeType: 'application/json',
    },
    async (uri) => {
      // Built at read time rather than at registration: the document embeds
      // the deployment's own origin, and a server instance is constructed per
      // request, so caching it here would buy nothing and could go stale.
      const { buildOpenApiDocument } = await import('../api/v1/openapi')
      const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://veritio.io').replace(/\/+$/, '')
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(buildOpenApiDocument({ serverUrl: `${base}/api/v1` })),
          },
        ],
      }
    },
  )

  server.registerResource(
    'methodologies',
    METHODOLOGY_URI,
    {
      title: 'Choosing a research methodology',
      description:
        'What each of Veritio`s seven study types actually measures, when to reach for it, and the ways ' +
        'each is commonly got wrong. Read this before study_create — the methodology is the one decision ' +
        'that cannot be fixed after participants have taken part.',
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: methodologyDigest() }],
    }),
  )
}

/** Assemble the per-type guidance the builder assistant already ships. */
function methodologyDigest(): string {
  const sections = STUDY_TYPES.map((studyType) => {
    const guidance = getMethodologyGuidance(studyType)
    return guidance ? `## ${studyType}\n\n${guidance.trim()}` : null
  }).filter(Boolean)

  return [
    '# Choosing a Veritio study type',
    '',
    'Pick the method that answers the question being asked, not the one that is quickest to build.',
    'A launched study collects data from real people; the wrong method wastes their time and produces a',
    'confident-looking answer to a question nobody asked.',
    '',
    ...sections,
  ].join('\n')
}
