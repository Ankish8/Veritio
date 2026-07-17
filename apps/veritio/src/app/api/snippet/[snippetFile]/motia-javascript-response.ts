export function unwrapMotiaJavaScriptResponse(body: string, contentType: string | null): string {
  if (!contentType?.toLowerCase().includes('application/json')) {
    return body
  }

  const parsed: unknown = JSON.parse(body)
  if (typeof parsed !== 'string') {
    throw new TypeError('Motia JavaScript response must contain a JSON string')
  }

  return parsed
}
