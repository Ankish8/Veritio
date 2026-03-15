'use client'
import { Input, type InputProps } from '@veritio/ui'
import { useYjsOptional } from './yjs-provider'
import { CollaborativeInput } from './collaborative-input'

interface SmartInputProps extends Omit<InputProps, 'onChange' | 'value'> {
  fieldPath?: string
  value?: string
  onChange: (value: string) => void
}
export function SmartInput({ fieldPath, value = '', onChange, ...props }: SmartInputProps) {
  const yjs = useYjsOptional()
  const isCollaborative = !!(yjs?.doc && yjs?.provider && yjs?.isConnected && fieldPath)

  if (isCollaborative && fieldPath) {
    return (
      <CollaborativeInput
        {...props}
        fieldPath={fieldPath}
        onChange={onChange}
        initialValue={value}
      />
    )
  }

  return (
    <Input
      {...props}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
