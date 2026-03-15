import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Shield, Info } from 'lucide-react'
import type { PrivacySettings, CookieConsentFramework } from '../../types'
import { DEFAULT_PRIVACY_SETTINGS } from '../../types'

interface PrivacySettingsPanelProps {
  privacy?: PrivacySettings
  onChange: (settings: PrivacySettings) => void
  isReadOnly?: boolean
}

export function PrivacySettingsPanel({
  privacy,
  onChange,
  isReadOnly = false,
}: PrivacySettingsPanelProps) {
  const settings = privacy || DEFAULT_PRIVACY_SETTINGS

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
              <div className="space-y-1.5">
                <Label htmlFor="custom-check" className="text-xs">Custom Check Function</Label>
                <Textarea
                  id="custom-check"
                  value={settings.cookieConsent.customCheckFunction || ''}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      cookieConsent: {
                        ...settings.cookieConsent,
                        customCheckFunction: e.target.value,
                      },
                    })
                  }
                  disabled={isReadOnly}
                  placeholder="window.cookieConsentGiven"
                  rows={2}
                  className="min-h-[60px] font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  JavaScript expression that returns true when consent is given
                </p>
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
