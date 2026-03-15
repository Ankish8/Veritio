'use client'

import { memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Users } from 'lucide-react'

export interface PaginationCardProps {
  paginationMode: 'progressive' | 'one_per_page'
  onModeChange: (mode: 'progressive' | 'one_per_page') => void
  isReadOnly: boolean
}

export const PaginationCard = memo(function PaginationCard({
  paginationMode,
  onModeChange,
  isReadOnly,
}: PaginationCardProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5" />
          Participant Experience
        </CardTitle>
        <CardDescription>
          Control how questions are presented to participants during the survey.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={paginationMode}
          onValueChange={(value) => onModeChange(value as 'progressive' | 'one_per_page')}
          className="space-y-3"
          disabled={isReadOnly}
        >
          <div className="flex items-start gap-3">
            <RadioGroupItem value="one_per_page" id="pagination-one-per-page" className="mt-1" />
            <div className="space-y-1">
              <Label htmlFor="pagination-one-per-page" className="cursor-pointer font-medium">
                One question per page
              </Label>
              <p className="text-xs text-muted-foreground">
                Traditional pagination with navigation buttons. Each question is shown on its own page.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <RadioGroupItem value="progressive" id="pagination-progressive" className="mt-1" />
            <div className="space-y-1">
              <Label htmlFor="pagination-progressive" className="cursor-pointer font-medium">
                Progressive reveal
              </Label>
              <p className="text-xs text-muted-foreground">
                Questions appear one-by-one with smooth animations as participants answer. Creates a
                more engaging, conversational experience.
              </p>
            </div>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  )
})
