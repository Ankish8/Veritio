'use client'

/**
 * Edit Participant Dialog
 *
 * Form for editing participant details and demographics.
 * Tags are managed separately via EditTagsDialog.
 */

import { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { useParticipantActions } from '@/hooks/panel'
import {
  PARTICIPANT_STATUS,
  type PanelParticipantWithDetails,
  type PanelParticipantUpdate,
  type Demographics,
} from '@/lib/supabase/panel-types'

interface EditParticipantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participant: PanelParticipantWithDetails
  onSuccess: () => void
}

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+']
const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-Binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  { value: 'other', label: 'Other' },
]
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']

export function EditParticipantDialog({
  open,
  onOpenChange,
  participant,
  onSuccess,
}: EditParticipantDialogProps) {
  const { updateParticipant } = useParticipantActions()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  // Form state
  const [email, setEmail] = useState(participant.email)
  const [firstName, setFirstName] = useState(participant.first_name || '')
  const [lastName, setLastName] = useState(participant.last_name || '')
  const [status, setStatus] = useState(participant.status)
  const [demographics, setDemographics] = useState<Demographics>(
    participant.demographics || {}
  )

  // Reset form when participant changes
  useEffect(() => {
    setEmail(participant.email)
    setFirstName(participant.first_name || '')
    setLastName(participant.last_name || '')
    setStatus(participant.status)
    setDemographics(participant.demographics || {})
    setActiveTab('basic')
  }, [participant])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const updates: PanelParticipantUpdate = {
        email,
        first_name: firstName || null,
        last_name: lastName || null,
        status,
        demographics,
      }

      await updateParticipant(participant.id, updates)
      toast.success('Participant updated')
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update participant')
    } finally {
      setIsSubmitting(false)
    }
  }, [email, firstName, lastName, status, demographics, participant.id, updateParticipant, onSuccess])

  const updateDemographic = (field: keyof Demographics, value: string | undefined) => {
    setDemographics((prev) => ({
      ...prev,
      [field]: value || undefined,
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Participant</DialogTitle>
            <DialogDescription>
              Update participant details and demographics.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="demographics">Demographics</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-sm font-medium">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-first-name" className="text-sm font-medium">
                    First Name
                  </Label>
                  <Input
                    id="edit-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-last-name" className="text-sm font-medium">
                    Last Name
                  </Label>
                  <Input
                    id="edit-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="edit-status" className="text-sm font-medium">
                  Status
                </Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTICIPANT_STATUS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="demographics" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Country */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Country</Label>
                  <Input
                    placeholder="e.g., United States"
                    value={demographics.country || ''}
                    onChange={(e) => updateDemographic('country', e.target.value)}
                  />
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Language</Label>
                  <Input
                    placeholder="e.g., English"
                    value={demographics.language || ''}
                    onChange={(e) => updateDemographic('language', e.target.value)}
                  />
                </div>

                {/* Age Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Age Range</Label>
                  <Select
                    value={demographics.age_range || ''}
                    onValueChange={(v) => updateDemographic('age_range', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {AGE_RANGES.map((range) => (
                        <SelectItem key={range} value={range}>{range}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Gender</Label>
                  <Select
                    value={demographics.gender || ''}
                    onValueChange={(v) => updateDemographic('gender', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDERS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Industry */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Industry</Label>
                  <Input
                    placeholder="e.g., Technology"
                    value={demographics.industry || ''}
                    onChange={(e) => updateDemographic('industry', e.target.value)}
                  />
                </div>

                {/* Job Role */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Job Role</Label>
                  <Input
                    placeholder="e.g., Product Designer"
                    value={demographics.job_role || ''}
                    onChange={(e) => updateDemographic('job_role', e.target.value)}
                  />
                </div>

                {/* Company Size */}
                <div className="space-y-2 col-span-2">
                  <Label className="text-sm font-medium">Company Size</Label>
                  <Select
                    value={demographics.company_size || ''}
                    onValueChange={(v) => updateDemographic('company_size', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>{size} employees</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !email}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
