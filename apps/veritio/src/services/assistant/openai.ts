/**
 * Veritio AI Assistant -- LLM Service
 *
 * Dual-provider setup:
 *   - Mercury 2 (Inception Labs): fast, low-latency — used for text refinement, knowledge Q&A, title generation
 *   - GPT-5-mini (OpenAI): higher quality — used for builders, insights reports, suggestions
 *
 * Both use the OpenAI SDK with different baseURLs.
 */

import OpenAI from 'openai'
import type { UserAiOverrides } from '../user-ai-config-service'
import type { AdminAiConfigRow } from '../admin-ai-config-service'
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionMessage,
  ChatCompletionMessageToolCall,
  ChatCompletionChunk,
} from 'openai/resources/chat/completions'

// Re-export useful types for consumers
export type { ChatCompletionMessageParam, ChatCompletionTool, ChatCompletionMessage, ChatCompletionMessageToolCall }

export type LLMProvider = 'mercury' | 'openai'

// ---------------------------------------------------------------------------
// Provider clients — lazily initialized singletons
// ---------------------------------------------------------------------------

let mercuryClient: OpenAI | null = null
let openaiClient: OpenAI | null = null

function getMercuryClient(): OpenAI {
  if (!mercuryClient) {
    const apiKey = process.env.INCEPTION_API_KEY
    if (!apiKey) throw new Error('INCEPTION_API_KEY is not set')
    mercuryClient = new OpenAI({
      apiKey,
      baseURL: 'https://api.inceptionlabs.ai/v1',
    })
  }
  return mercuryClient
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

function getClientForProvider(provider: LLMProvider): OpenAI {
  return provider === 'openai' ? getOpenAIClient() : getMercuryClient()
}

const MERCURY_MODEL = 'mercury-2'
const OPENAI_MODEL = 'gpt-5-mini'

function getModelForProvider(provider: LLMProvider): string {
  if (provider === 'openai') return process.env.OPENAI_MODEL || OPENAI_MODEL
  return process.env.ASSISTANT_MODEL || MERCURY_MODEL
}

/**
 * Resolve the OpenAI client and model for a provider.
 *
 * Priority chain (first match wins):
 *   1. Per-user overrides (user settings page)
 *   2. Admin-configured platform defaults (admin panel)
 *   3. Environment variables (OPENAI_API_KEY / INCEPTION_API_KEY)
 */
function resolveClientAndModel(
  provider: LLMProvider,
  overrides?: UserAiOverrides,
  adminConfig?: AdminAiConfigRow,
): { client: OpenAI; model: string } {
  // --- Layer 1: Per-user overrides ---
  if (overrides) {
    const slot = (provider === 'mercury' && overrides.useSameProvider)
      ? overrides.openai
      : overrides[provider]

    if (slot.apiKey) {
      const clientOptions: ConstructorParameters<typeof OpenAI>[0] = { apiKey: slot.apiKey }
      if (slot.baseUrl) clientOptions.baseURL = slot.baseUrl
      return {
        client: new OpenAI(clientOptions),
        model: slot.model || getModelForProvider(provider),
      }
    }

    // User set a model but no key — use admin/env client with user's model
    if (slot.model) {
      const { client } = resolveClientFromAdminOrEnv(provider, adminConfig)
      return { client, model: slot.model }
    }
  }

  // --- Layer 2 & 3: Admin config then env vars ---
  return resolveClientFromAdminOrEnv(provider, adminConfig)
}

/** Resolve client from admin config or env vars (layers 2 & 3) */
function resolveClientFromAdminOrEnv(
  provider: LLMProvider,
  adminConfig?: AdminAiConfigRow,
): { client: OpenAI; model: string } {
  if (adminConfig) {
    const adminKey = provider === 'openai' ? adminConfig.openai_api_key : adminConfig.mercury_api_key
    const adminUrl = provider === 'openai' ? adminConfig.openai_base_url : adminConfig.mercury_base_url
    const adminModel = provider === 'openai' ? adminConfig.openai_model : adminConfig.mercury_model

    if (adminKey) {
      const clientOptions: ConstructorParameters<typeof OpenAI>[0] = { apiKey: adminKey }
      if (adminUrl) clientOptions.baseURL = adminUrl
      return {
        client: new OpenAI(clientOptions),
        model: adminModel || getModelForProvider(provider),
      }
    }

    // Admin set a model but no key — use env client with admin's model
    if (adminModel) {
      return { client: getClientForProvider(provider), model: adminModel }
    }
  }

  // Layer 3: env vars
  return { client: getClientForProvider(provider), model: getModelForProvider(provider) }
}

// ---------------------------------------------------------------------------
// Streaming interface -- yields typed chunks so callers can react in real-time.
// ---------------------------------------------------------------------------

export type StreamChunk =
  | { type: 'text_delta'; content: string }
  | { type: 'text_replace'; content: string }
  | { type: 'tool_call_delta'; index: number; toolName: string; argumentsDelta: string }
  | { type: 'tool_calls'; toolCalls: ChatCompletionMessageToolCall[] }
  | { type: 'done'; fullMessage: ChatCompletionMessage }

export interface StreamChatOptions {
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
  responseFormat?: { type: 'json_object' | 'text' }
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'
  model?: string
  provider?: LLMProvider
  /** Per-user AI overrides — when present, creates an ephemeral client instead of using the env-var singleton */
  userOverrides?: UserAiOverrides
  /** Admin-configured platform defaults — used as fallback between user overrides and env vars */
  adminConfig?: AdminAiConfigRow
}

/**
 * Stream a chat completion, yielding chunks as they arrive.
 * Callers can iterate with `for await` and react to text deltas vs tool_calls.
 */
export async function* streamChat(
  messages: ChatCompletionMessageParam[],
  tools?: ChatCompletionTool[],
  options?: StreamChatOptions,
): AsyncGenerator<StreamChunk> {
  const provider = options?.provider ?? 'mercury'
  const { client, model: resolvedModel } = resolveClientAndModel(provider, options?.userOverrides, options?.adminConfig)
  const model = options?.model ?? resolvedModel

  const params: Record<string, unknown> = {
    model,
    messages,
    tools: tools && tools.length > 0 ? tools : undefined,
    max_completion_tokens: options?.maxTokens ?? 4096,
    stream: true,
    // diffusing: true, // Disabled: breaks tool calling — Mercury 2 doesn't return text after tools when diffusion is on
  }
  // Only pass temperature if explicitly set — not all models support custom values
  if (options?.temperature !== undefined) params.temperature = options.temperature
  if (options?.responseFormat) params.response_format = options.responseFormat
  if (options?.reasoningEffort) params.reasoning_effort = options.reasoningEffort

  const stream = await client.chat.completions.create(params as any)

  // Accumulate the full message as chunks arrive
  let fullContent = ''
  const toolCallAccumulator = new Map<
    number,
    { id: string; type: 'function'; function: { name: string; arguments: string } }
  >()

  for await (const chunk of stream as unknown as AsyncIterable<ChatCompletionChunk>) {
    const delta = chunk.choices?.[0]?.delta
    if (!delta) continue

    // Text content — diffusion mode sends full replacements, normal streaming sends incremental deltas
    const isDiffusion = !!(chunk as any).diffusion_meta?.diffusion_content
    if (delta.content) {
      if (isDiffusion) {
        fullContent = delta.content
        yield { type: 'text_replace', content: delta.content }
      } else {
        fullContent += delta.content
        yield { type: 'text_delta', content: delta.content }
      }
    }

    // Tool calls (streamed incrementally)
    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        const existing = toolCallAccumulator.get(tc.index)
        if (existing) {
          if (tc.function?.arguments) {
            existing.function.arguments += tc.function.arguments
            yield { type: 'tool_call_delta' as const, index: tc.index, toolName: existing.function.name, argumentsDelta: tc.function.arguments }
          }
        } else {
          toolCallAccumulator.set(tc.index, {
            id: tc.id || '',
            type: 'function',
            function: {
              name: tc.function?.name || '',
              arguments: tc.function?.arguments || '',
            },
          })
          if (tc.function?.arguments) {
            yield { type: 'tool_call_delta' as const, index: tc.index, toolName: tc.function?.name || '', argumentsDelta: tc.function.arguments }
          }
        }
      }
    }

    // Finish reason
    if (chunk.choices?.[0]?.finish_reason) {
      const toolCalls = Array.from(toolCallAccumulator.values())
      if (toolCalls.length > 0) {
        yield { type: 'tool_calls', toolCalls }
      }

      const fullMessage: ChatCompletionMessage = {
        role: 'assistant',
        content: fullContent || null,
        refusal: null,
        annotations: [],
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      }

      yield { type: 'done', fullMessage }
    }
  }
}

// ---------------------------------------------------------------------------
// Non-streaming helper -- for simpler cases like title generation.
// ---------------------------------------------------------------------------

export async function createChatCompletion(
  messages: ChatCompletionMessageParam[],
  options?: StreamChatOptions,
): Promise<ChatCompletionMessage> {
  const provider = options?.provider ?? 'mercury'
  const { client, model: resolvedModel } = resolveClientAndModel(provider, options?.userOverrides, options?.adminConfig)

  const params: Record<string, unknown> = {
    model: options?.model ?? resolvedModel,
    messages,
    max_completion_tokens: options?.maxTokens ?? 256,
  }
  if (options?.temperature !== undefined) params.temperature = options.temperature
  if (options?.responseFormat) params.response_format = options.responseFormat
  if (options?.reasoningEffort) params.reasoning_effort = options.reasoningEffort

  const response = await client.chat.completions.create(params as any, {
    timeout: options?.timeoutMs ?? 30000,
  })

  const choice = response.choices[0]
  if (!choice.message.content) {
    console.error('[createChatCompletion] Empty content', {
      model: params.model,
      finishReason: choice.finish_reason,
      refusal: (choice.message as any).refusal,
      usage: response.usage,
    })
  }

  return choice.message
}
