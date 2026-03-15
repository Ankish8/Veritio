'use client'

import { memo, useCallback, useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Gift, Loader2 } from 'lucide-react'
import { useStudyIncentiveConfig } from '@/hooks/panel/use-panel-incentives'
import { CURRENCIES, INCENTIVE_TYPE } from '@/lib/supabase/panel-types'
import type { Currency, IncentiveType, StudyIncentiveConfig } from '@/lib/supabase/panel-types'

export type IncentiveSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface IncentiveSettingsCardProps {
  studyId: string
  isDraft: boolean
  onSaveStatusChange?: (status: IncentiveSaveStatus, isDirty: boolean, saveNow?: () => void) => void
}

const INCENTIVE_TYPE_LABELS: Record<IncentiveType, string> = {
  gift_card: 'Gift Card',
  cash: 'Cash',
  credit: 'Account Credit',
  donation: 'Charitable Donation',
  other: 'Other',
}

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
  CHF: 'CHF',
  CNY: '¥',
  INR: '₹',
  BRL: 'R$',
}

// Debounce delay in ms
const SYNC_DELAY = 800

interface LocalConfig {
  enabled: boolean
  amount: string
  currency: Currency
  incentive_type: IncentiveType
  description: string
}

export const IncentiveSettingsCard = memo(function IncentiveSettingsCard({
  studyId,
  isDraft,
  onSaveStatusChange,
}: IncentiveSettingsCardProps) {
  const { config, isLoading, error, updateConfig } = useStudyIncentiveConfig(studyId)

  // Local state for instant UI updates
  const [localConfig, setLocalConfig] = useState<LocalConfig>({
    enabled: false,
    amount: '',
    currency: 'USD',
    incentive_type: 'gift_card',
    description: '',
  })

  // Save status tracking
  const [saveStatus, setSaveStatus] = useState<IncentiveSaveStatus>('idle')
  const [isDirty, setIsDirty] = useState(false)

  // Track saving state to prevent reinitialization during save
  const isSavingRef = useRef(false)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncedConfigRef = useRef<string>('')

  // Build key from config for change detection
  const getConfigKey = (cfg: StudyIncentiveConfig) => {
    return `${cfg.enabled}_${cfg.amount}_${cfg.currency}_${cfg.incentive_type}_${cfg.description}`
  }

  // Sync to API
  const syncToApi = useCallback(async (updates: Partial<LocalConfig>) => {
    if (isSavingRef.current) return // Prevent duplicate saves

    isSavingRef.current = true
    setSaveStatus('saving')

    // Build the API payload
    const payload: Record<string, unknown> = {}

    if ('enabled' in updates) {
      payload.enabled = updates.enabled
    }
    if ('amount' in updates) {
      payload.amount = updates.amount ? parseFloat(updates.amount) : null
    }
    if ('currency' in updates) {
      payload.currency = updates.currency
    }
    if ('incentive_type' in updates) {
      payload.incentive_type = updates.incentive_type
    }
    if ('description' in updates) {
      payload.description = updates.description || null
    }

    try {
      const result = await updateConfig(payload)

      // Store the synced config key to prevent reinit
      if (result) {
        lastSyncedConfigRef.current = getConfigKey(result)
      }

      setSaveStatus('saved')
      setIsDirty(false)

      // Clear saved timeout if exists
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current)
      }
      // Reset to idle after 2 seconds
      savedTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle')
      }, 2000)
    } catch {
      setSaveStatus('error')
      // Reset to idle after 3 seconds on error
      savedTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle')
      }, 3000)
    } finally {
      isSavingRef.current = false
    }
  }, [updateConfig])

  // Schedule debounced sync
  const scheduleSync = useCallback((field: keyof LocalConfig, value: LocalConfig[keyof LocalConfig]) => {
    setIsDirty(true)

    // Update local state immediately
    setLocalConfig(prev => ({ ...prev, [field]: value }))

    // Clear existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    // Schedule sync with current full local config
    syncTimeoutRef.current = setTimeout(() => {
      // Capture the current local config state at time of sync
      setLocalConfig(current => {
        syncToApi(current)
        return current
      })
    }, SYNC_DELAY)
  }, [syncToApi])

  // Force save function
  const forceSave = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
      syncTimeoutRef.current = null
    }
    if (isDirty && !isSavingRef.current) {
      syncToApi(localConfig)
    }
  }, [syncToApi, localConfig, isDirty])

  // Initialize from server config - only if not currently syncing
  useEffect(() => {
    if (!config || isSavingRef.current) return

    const configKey = getConfigKey(config)

    // Don't reinitialize if this is the config we just saved
    if (configKey === lastSyncedConfigRef.current) return

    // Initialize local state
    setLocalConfig({
      enabled: config.enabled ?? false,
      amount: config.amount?.toString() ?? '',
      currency: (config.currency ?? 'USD') as Currency,
      incentive_type: (config.incentive_type ?? 'gift_card') as IncentiveType,
      description: config.description ?? '',
    })

    lastSyncedConfigRef.current = configKey
  }, [config])

  // Notify parent of status changes
  useEffect(() => {
    onSaveStatusChange?.(saveStatus, isDirty, isDirty ? forceSave : undefined)
  }, [saveStatus, isDirty, onSaveStatusChange, forceSave])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current)
      }
      // Force save any pending changes
      if (isDirty && !isSavingRef.current) {
        syncToApi(localConfig)
      }
    }
  }, [isDirty, localConfig, syncToApi])

  // Handlers
  const handleEnabledChange = useCallback((enabled: boolean) => {
    scheduleSync('enabled', enabled)
  }, [scheduleSync])

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    scheduleSync('amount', e.target.value)
  }, [scheduleSync])

  const handleCurrencyChange = useCallback((currency: string) => {
    scheduleSync('currency', currency as Currency)
  }, [scheduleSync])

  const handleTypeChange = useCallback((incentive_type: string) => {
    scheduleSync('incentive_type', incentive_type as IncentiveType)
  }, [scheduleSync])

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    scheduleSync('description', e.target.value)
  }, [scheduleSync])

  // Show loading state only on initial load
  if (isLoading && !localConfig.enabled && !localConfig.amount) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Incentives</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Incentives</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-sm text-destructive">
              Failed to load incentive settings. Please try refreshing the page.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Incentives</CardTitle>
        </div>
        <CardDescription>
          Reward participants for completing your study.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isDraft ? (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">
              Launch your study to configure incentives.
            </p>
          </div>
        ) : (
          <>
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="incentive-enabled">Enable Incentives</Label>
                <p className="text-xs text-muted-foreground">
                  Offer rewards to participants who complete the study
                </p>
              </div>
              <Switch
                id="incentive-enabled"
                checked={localConfig.enabled}
                onCheckedChange={handleEnabledChange}
              />
            </div>

            {localConfig.enabled && (
              <>
                {/* Amount and Currency Row */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="incentive-amount">
                      Amount <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {CURRENCY_SYMBOLS[localConfig.currency]}
                      </span>
                      <Input
                        id="incentive-amount"
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={localConfig.amount}
                        onChange={handleAmountChange}
                        placeholder="5.00"
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="incentive-currency">Currency</Label>
                    <Select value={localConfig.currency} onValueChange={handleCurrencyChange}>
                      <SelectTrigger id="incentive-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((curr) => (
                          <SelectItem key={curr} value={curr}>
                            {curr} ({CURRENCY_SYMBOLS[curr as Currency]})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Incentive Type */}
                <div className="space-y-2">
                  <Label htmlFor="incentive-type">Incentive Type</Label>
                  <Select value={localConfig.incentive_type} onValueChange={handleTypeChange}>
                    <SelectTrigger id="incentive-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INCENTIVE_TYPE.map((type) => (
                        <SelectItem key={type} value={type}>
                          {INCENTIVE_TYPE_LABELS[type as IncentiveType]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="incentive-description">
                    Description <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Input
                    id="incentive-description"
                    value={localConfig.description}
                    onChange={handleDescriptionChange}
                    placeholder="e.g., Amazon Gift Card, PayPal transfer"
                    maxLength={255}
                  />
                  <p className="text-xs text-muted-foreground">
                    Describe how participants will receive their reward
                  </p>
                </div>

                {/* Info box */}
                <div className="rounded-md bg-blue-50 border border-blue-200 p-3 mt-4">
                  <p className="text-xs text-blue-800">
                    When participants complete this study, an incentive record will be created
                    in your Panel. You can then mark incentives as sent from the Incentives page.
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
})
