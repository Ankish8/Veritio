"use client"

import { memo } from "react"

interface WelcomeBannerProps {
  userName: string | null
  activeCount: number
  entityName?: string
  entityNamePlural?: string
}

export const WelcomeBanner = memo(function WelcomeBanner({
  userName,
  activeCount,
  entityName = "study",
  entityNamePlural = "studies",
}: WelcomeBannerProps) {
  const greeting = userName ? `Welcome back, ${userName}!` : "Welcome back!"

  const contextMessage = activeCount > 0
    ? `You have ${activeCount} active ${activeCount === 1 ? entityName : entityNamePlural} collecting responses.`
    : `Create your first ${entityName} to start gathering insights.`

  return (
    <div className="px-1 py-2">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{greeting}</h1>
      <p className="text-sm sm:text-base text-muted-foreground mt-1.5">{contextMessage}</p>
    </div>
  )
})
