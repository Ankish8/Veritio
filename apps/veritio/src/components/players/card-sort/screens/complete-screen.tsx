'use client'

import { CompleteScreenBase } from '@/components/players/shared/screen-layout'

interface CompleteScreenProps {
  /** Custom thank you message - falls back to default if not provided */
  message?: string
  /** @deprecated Use `message` instead */
  thankYouMessage?: string
}

export function CompleteScreen({ message, thankYouMessage }: CompleteScreenProps) {
  // Support both props for backward compatibility
  const displayMessage = message || thankYouMessage

  return <CompleteScreenBase message={displayMessage} />
}
