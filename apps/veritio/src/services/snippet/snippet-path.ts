const JAVASCRIPT_SUFFIX = '.js'

/** Normalize the public snippet filename captured by Motia into its database ID. */
export function normalizeSnippetFile(snippetFile: string): string {
  return snippetFile.endsWith(JAVASCRIPT_SUFFIX)
    ? snippetFile.slice(0, -JAVASCRIPT_SUFFIX.length)
    : snippetFile
}
