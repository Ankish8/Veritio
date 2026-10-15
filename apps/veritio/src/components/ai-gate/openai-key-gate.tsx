'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useHasOpenAiKey } from '@/hooks/use-has-openai-key'
import {
  OPENAI_KEY_REQUIRED_MESSAGE,
  OPENAI_KEY_REQUIRED_TOOLTIP,
  OPENAI_KEY_SETTINGS_HREF,
} from '@/lib/ai/byok'

/**
 * Wrap a control for an OpenAI-backed feature. Without the user's own key the
 * child renders disabled and a tooltip explains why. The child receives
 * `disabled` through the render prop, so each button keeps its own styling.
 *
 *   <OpenAiKeyGate>{(disabled) => <Button disabled={disabled}>Build with AI</Button>}</OpenAiKeyGate>
 */
export function OpenAiKeyGate({
  children,
  side = 'top',
}: {
  children: (disabled: boolean) => ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  const { hasKey, isLoading } = useHasOpenAiKey()
  const blocked = !isLoading && !hasKey
  if (!blocked) return <>{children(false)}</>

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Disabled buttons swallow pointer events, so the span carries the hover. */}
        <span className="inline-flex cursor-not-allowed" tabIndex={0} aria-label={OPENAI_KEY_REQUIRED_TOOLTIP}>
          {children(true)}
        </span>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[240px]">
        <p>{OPENAI_KEY_REQUIRED_TOOLTIP}</p>
      </TooltipContent>
    </Tooltip>
  )
}

/** Shown in place of an OpenAI-backed panel or page when the user has no key. */
export function OpenAiKeyRequiredNotice({ className }: { className?: string }) {
  return (
    <div className={className ?? 'flex flex-col items-center justify-center gap-3 px-6 py-10 text-center'}>
      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
        <KeyRound className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">Add your OpenAI key to use Veritio AI</p>
      <p className="max-w-[300px] text-sm text-muted-foreground">{OPENAI_KEY_REQUIRED_MESSAGE}</p>
      <Button asChild size="sm">
        <Link href={OPENAI_KEY_SETTINGS_HREF}>Add OpenAI key</Link>
      </Button>
    </div>
  )
}
