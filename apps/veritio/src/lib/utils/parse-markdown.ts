/** Simple markdown-to-HTML converter for basic formatting. */
export function parseMarkdown(markdown: string): string {
  let html = markdown
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers (## Header -> <h2>)
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold (**text** or __text__)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic (*text* or _text_)
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    // Inline code (`code`)
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline" target="_blank" rel="noopener">$1</a>')

  // Process lists - find blocks of consecutive list items
  // Unordered lists (- item)
  html = html.replace(/^- (.+)$/gm, '{{LI}}$1{{/LI}}')
  // Ordered lists (1. item)
  html = html.replace(/^\d+\. (.+)$/gm, '{{LI}}$1{{/LI}}')
  // Wrap consecutive list items in <ul> and convert markers to <li>
  html = html.replace(/({{LI}}.*?{{\/LI}}\n?)+/g, (match) => {
    const items = match.replace(/{{LI}}(.*?){{\/LI}}\n?/g, '<li>$1</li>')
    return `<ul class="list-disc pl-5 my-1.5">${items}</ul>`
  })

  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, '</p><p>')
  // Single newlines within paragraphs (but not inside tags)
  html = html.replace(/\n/g, '<br/>')

  // Wrap in paragraph tags
  html = `<p>${html}</p>`

  // Clean up: remove <br/> right after </ul> or </li> or before <ul>
  html = html
    .replace(/<\/ul><br\/>/g, '</ul>')
    .replace(/<br\/><ul/g, '<ul')
    .replace(/<\/li><br\/>/g, '</li>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[1-3]>)/g, '$1')
    .replace(/(<\/h[1-3]>)<\/p>/g, '$1')
    .replace(/<p>(<ul)/g, '$1')
    .replace(/(<\/ul>)<\/p>/g, '$1')

  return html
}
