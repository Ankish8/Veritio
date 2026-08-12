/**
 * The single source of truth for the comment @mention wire format.
 *
 * Mentions are stored inside `study_comments.content` as `@[Display Name](userId)`.
 * Three drifted copies of this parsing logic used to live in the service, the
 * SWR hook and the client utils — and the server copy used a regex that could
 * never match the format the client actually emits, so `study_comments.mentions`
 * was silently always empty. Everything that reads or writes a mention must
 * import from here.
 */

/**
 * Source for the mention pattern. Exposed as a string so every caller builds a
 * fresh `RegExp` — a shared global-flagged instance carries `lastIndex` between
 * calls and would skip matches on every other invocation.
 */
export const MENTION_PATTERN = String.raw`@\[([^\]]+)\]\(([^)]+)\)`

/** Build a fresh global matcher. Never share the returned instance. */
export function mentionRegex(): RegExp {
  return new RegExp(MENTION_PATTERN, 'g')
}

export interface ParsedMention {
  /** Display name as it was rendered at write time. */
  name: string
  /** The mentioned user's id — this is what gets persisted and notified. */
  userId: string
  /** Offset of the whole `@[...](...)` token within the content. */
  index: number
  /** The raw matched token, useful for slicing/replacement. */
  raw: string
}

/** Parse every mention token in a comment body, in document order. */
export function extractMentions(content: string): ParsedMention[] {
  const regex = mentionRegex()
  const mentions: ParsedMention[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    mentions.push({
      name: match[1],
      userId: match[2],
      index: match.index,
      raw: match[0],
    })
  }

  return mentions
}

/**
 * Deduped user ids referenced by a comment body.
 *
 * This is what belongs in `study_comments.mentions` — ids, not display names,
 * so the GIN index on that column can answer "comments that mention me".
 * Callers persisting the result must still validate the ids against the actual
 * membership list; see `resolveMentionedUserIds` in the comments service.
 */
export function extractMentionIds(content: string): string[] {
  return [...new Set(extractMentions(content).map((m) => m.userId))]
}

/** Serialize a mention into the wire format. */
export function formatMention(name: string, userId: string): string {
  return `@[${name}](${userId})`
}

/**
 * Replace mention tokens with plain `@Display Name` text.
 *
 * Use for anywhere the raw markup would leak to a human: email bodies,
 * notification titles, search indexing, plain-text previews.
 */
export function stripMentionMarkup(content: string): string {
  return content.replace(mentionRegex(), (_full, name: string) => `@${name}`)
}
