'use client'
import { CompleteScreenBase } from '@veritio/study-flow/player'

interface CompleteScreenProps {
  message?: string
}

export function CompleteScreen({ message }: CompleteScreenProps) {
  return <CompleteScreenBase message={message} />
}
