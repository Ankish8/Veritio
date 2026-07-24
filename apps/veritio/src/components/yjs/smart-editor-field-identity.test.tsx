import { act, useEffect, useLayoutEffect, useRef, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@veritio/prototype-test/components/yjs/yjs-provider', () => ({
  useYjsOptional: () => ({
    doc: {},
    provider: {},
    isConnected: true,
  }),
}))

import { SmartEditor } from '@veritio/prototype-test/components/yjs/smart-editor'

interface EditorElementProps {
  fieldPath: string
  onChange: (html: string) => void
}

function TeardownRaceProbe({ fieldPath, onChange }: EditorElementProps) {
  const onChangeRef = useRef(onChange)
  useLayoutEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Model the failure mode in the old collaborative editor: the outgoing
  // editor emits while React is rebinding the shared component to a new field.
  useEffect(
    () => () => {
      onChangeRef.current(`<p>stale content from ${fieldPath}</p>`)
    },
    [fieldPath]
  )

  return <div data-field-path={fieldPath} />
}

function Harness({
  fieldPath,
  onChange,
}: {
  fieldPath: string
  onChange: (html: string) => void
}) {
  const editorElement = SmartEditor({
    fieldPath,
    studyId: 'study-1',
    content: `<p>${fieldPath}</p>`,
    onChange,
  }) as ReactElement<EditorElementProps>

  return (
    <TeardownRaceProbe
      key={editorElement.key}
      fieldPath={editorElement.props.fieldPath}
      onChange={editorElement.props.onChange}
    />
  )
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('SmartEditor field identity', () => {
  it('keeps an outgoing editor callback bound to its original question', async () => {
    const firstQuestionChange = vi.fn()
    const secondQuestionChange = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <Harness fieldPath="question.first.text" onChange={firstQuestionChange} />
      )
    })

    await act(async () => {
      root.render(
        <Harness fieldPath="question.second.text" onChange={secondQuestionChange} />
      )
    })

    expect(firstQuestionChange).toHaveBeenCalledWith(
      '<p>stale content from question.first.text</p>'
    )
    expect(secondQuestionChange).not.toHaveBeenCalled()

    await act(async () => {
      root.unmount()
    })
  })
})
