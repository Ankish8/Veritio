import { describe, expect, it } from 'vitest'
import { generateSnippetJs } from '../live-website-snippet'
import { generateProxyCompanionJs } from '../proxy-companion'

function expectValidJavaScript(source: string): void {
  expect(() => new Function(source)).not.toThrow()
}

describe('generated live website scripts', () => {
  it('emits syntactically valid proxy companion JavaScript', () => {
    expectValidJavaScript(generateProxyCompanionJs())
  })

  it('emits syntactically valid installed snippet JavaScript', () => {
    expectValidJavaScript(
      generateSnippetJs(
        'snippet-id',
        'study-id',
        'https://veritio.example.com'
      )
    )
  })
})
