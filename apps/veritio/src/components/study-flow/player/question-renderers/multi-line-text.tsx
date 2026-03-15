'use client'

import { Textarea } from '@/components/ui/textarea'
import { KeyboardHintText } from '../option-keyboard-hint'
import { usePlatform } from '@/hooks/use-platform'
import type { TextQuestionConfig } from '@veritio/study-types/study-flow-types'

interface MultiLineTextRendererProps {
  config: TextQuestionConfig
  value: string | undefined
  onChange: (value: string) => void
  showKeyboardHints?: boolean
  onCmdEnterPress?: () => void
  onFocusChange?: (focused: boolean) => void
}

export function MultiLineTextRenderer({
  config,
  value,
  onChange,
  showKeyboardHints = false,
  onCmdEnterPress,
  onFocusChange,
}: MultiLineTextRendererProps) {
  const textConfig = config as TextQuestionConfig
  const { modifierSymbol } = usePlatform()

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      onCmdEnterPress?.()
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        autoFocus
        placeholder={textConfig.placeholder || 'Enter your answer...'}
        value={value || ''}
        onChange={(e) => { if (e.target.value !== (value || '')) onChange(e.target.value) }}
        onKeyDown={handleKeyDown}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
        maxLength={textConfig.maxLength}
        rows={4}
        className="resize-none"
      />
      {showKeyboardHints && (
        <KeyboardHintText>
          Press {modifierSymbol}+Enter to continue
        </KeyboardHintText>
      )}
    </div>
  )
}
