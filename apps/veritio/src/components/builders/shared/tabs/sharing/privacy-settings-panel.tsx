import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, Info } from 'lucide-react'
import type { PrivacySettings, CookieConsentFramework, CustomConsentPlatform } from '../../types'
import { DEFAULT_PRIVACY_SETTINGS } from '../../types'

interface PrivacySettingsPanelProps {
  privacy?: PrivacySettings
  onChange: (settings: PrivacySettings) => void
  isReadOnly?: boolean
}

const SIMPLE_GLOBAL_PATH_RE = /^(?:window\.)?[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/

function getLegacyGlobalVariable(value?: string) {
  const trimmed = value?.trim()
  return trimmed && SIMPLE_GLOBAL_PATH_RE.test(trimmed) ? trimmed : ''
}

export function PrivacySettingsPanel({
  privacy,
  onChange,
  isReadOnly = false,
}: PrivacySettingsPanelProps) {
  const settings = privacy || DEFAULT_PRIVACY_SETTINGS
  const legacyCustomCheck = settings.cookieConsent.customCheckFunction?.trim()
  const customPlatform: CustomConsentPlatform = settings.cookieConsent.platform
    || (settings.cookieConsent.cookieName ? 'custom-cookie' : 'custom-global')
  const globalVariableValue = settings.cookieConsent.globalVariable || getLegacyGlobalVariable(legacyCustomCheck)

  return (
    <div className="space-y-4 pt-4 border-t">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="space-y-0.5 flex-1">
          <Label>Privacy & Compliance</Label>
          <p className="text-xs text-muted-foreground">
            Configure GDPR and privacy settings for your widget
          </p>
        </div>
      </div>

      {/* Do Not Track */}
      <div className="flex items-center justify-between gap-3 pl-6">
        <div className="space-y-0.5 flex-1 min-w-0">
          <Label>Respect Do Not Track</Label>
          <p className="text-xs text-muted-foreground">
            Hide widget if visitor has DNT enabled in browser
          </p>
        </div>
        <Switch
          checked={settings.respectDoNotTrack}
          onCheckedChange={(checked) =>
            onChange({
              ...settings,
              respectDoNotTrack: checked,
            })
          }
          disabled={isReadOnly}
          className="flex-shrink-0"
        />
      </div>

      {/* Privacy Policy Link */}
      <div className="space-y-3 pl-6">
        <div className="flex items-center justify-between gap-3">
          <Label className="flex-1 min-w-0">Show Privacy Policy Link</Label>
          <Switch
            checked={settings.showPrivacyLink}
            onCheckedChange={(checked) =>
              onChange({
                ...settings,
                showPrivacyLink: checked,
              })
            }
            disabled={isReadOnly}
            className="flex-shrink-0"
          />
        </div>

        {settings.showPrivacyLink && (
          <div className="space-y-3 pl-4 border-l-2 border-muted">
            <div className="space-y-1.5">
              <Label htmlFor="privacy-url" className="text-xs">Privacy Policy URL</Label>
              <Input
                id="privacy-url"
                type="url"
                value={settings.privacyLinkUrl || ''}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    privacyLinkUrl: e.target.value,
                  })
                }
                disabled={isReadOnly}
                placeholder="https://yoursite.com/privacy"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="privacy-text" className="text-xs">Link Text</Label>
              <Input
                id="privacy-text"
                value={settings.privacyLinkText || 'Privacy Policy'}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    privacyLinkText: e.target.value,
                  })
                }
                disabled={isReadOnly}
                placeholder="Privacy Policy"
                className="h-9"
              />
            </div>
          </div>
        )}
      </div>

      {/* Cookie Consent Integration */}
      <div className="space-y-3 pl-6">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5 flex-1 min-w-0">
            <Label>Cookie Consent Integration</Label>
            <p className="text-xs text-muted-foreground">
              Wait for cookie consent before showing widget
            </p>
          </div>
          <Switch
            checked={settings.cookieConsent.enabled}
            onCheckedChange={(checked) =>
              onChange({
                ...settings,
                cookieConsent: {
                  ...settings.cookieConsent,
                  enabled: checked,
                },
              })
            }
            disabled={isReadOnly}
            className="flex-shrink-0"
          />
        </div>

        {settings.cookieConsent.enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-muted">
            <div className="space-y-1.5">
              <Label htmlFor="consent-framework" className="text-xs">Consent Framework</Label>
              <Select
                value={settings.cookieConsent.framework}
                onValueChange={(value) =>
                  onChange({
                    ...settings,
                    cookieConsent: {
                      ...settings.cookieConsent,
                      framework: value as CookieConsentFramework,
                    },
                  })
                }
                disabled={isReadOnly}
              >
                <SelectTrigger id="consent-framework" className="h-9 min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onetrust">OneTrust</SelectItem>
                  <SelectItem value="cookiebot">Cookiebot</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.cookieConsent.framework === 'custom' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="custom-consent-type" className="text-xs">Custom Consent Type</Label>
                  <Select
                    value={customPlatform}
                    onValueChange={(value) =>
                      onChange({
                        ...settings,
                        cookieConsent: {
                          ...settings.cookieConsent,
                          platform: value as CustomConsentPlatform,
                          customCheckFunction: undefined,
                        },
                      })
                    }
                    disabled={isReadOnly}
                  >
                    <SelectTrigger id="custom-consent-type" className="h-9 min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom-global">Global Boolean</SelectItem>
                      <SelectItem value="custom-cookie">Cookie Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {customPlatform === 'custom-cookie' ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="custom-cookie-name" className="text-xs">Cookie Name</Label>
                    <Input
                      id="custom-cookie-name"
                      value={settings.cookieConsent.cookieName || ''}
                      onChange={(e) =>
                        onChange({
                          ...settings,
                          cookieConsent: {
                            ...settings.cookieConsent,
                            platform: 'custom-cookie',
                            cookieName: e.target.value,
                            customCheckFunction: undefined,
                          },
                        })
                      }
                      disabled={isReadOnly}
                      placeholder="cookie_consent"
                      className="h-9"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="custom-global-variable" className="text-xs">Global Boolean</Label>
                    <Input
                      id="custom-global-variable"
                      value={globalVariableValue}
                      onChange={(e) =>
                        onChange({
                          ...settings,
                          cookieConsent: {
                            ...settings.cookieConsent,
                            platform: 'custom-global',
                            globalVariable: e.target.value,
                            customCheckFunction: undefined,
                          },
                        })
                      }
                      disabled={isReadOnly}
                      placeholder="window.cookieConsentGiven"
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                )}

                {legacyCustomCheck && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-2 flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-800">
                      Legacy custom JavaScript is no longer editable. Simple dotted globals are read safely; complex expressions stay disabled until replaced.
                      <code className="block bg-amber-100 px-1 py-0.5 rounded mt-1 break-all">{legacyCustomCheck}</code>
                    </p>
                  </div>
                )}
              </div>
            )}

            {settings.cookieConsent.framework === 'onetrust' && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-2 flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  Widget will check <code className="bg-blue-100 px-1 rounded">window.OnetrustActiveGroups</code> for marketing consent
                </p>
              </div>
            )}

            {settings.cookieConsent.framework === 'cookiebot' && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-2 flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  Widget will check <code className="bg-blue-100 px-1 rounded">window.Cookiebot.consent.marketing</code>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
