'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

interface Study {
  id: string
  title: string
  status: string
  study_type: string
}

interface StudySelectorProps {
  studies: Study[]
  selectedStudyId: string | null
  onStudyChange: (studyId: string | null) => void
}

export function StudySelector({
  studies,
  selectedStudyId,
  onStudyChange,
}: StudySelectorProps) {
  const [open, setOpen] = React.useState(false)

  // Filter studies - show only active studies (plus currently selected to prevent orphaning)
  const activeStudies = studies.filter(
    (s) => s.status === 'active' || s.id === selectedStudyId
  )

  const selectedStudy = studies.find((s) => s.id === selectedStudyId)
  const isSelectedStudyInactive =
    selectedStudy && selectedStudy.status !== 'active'

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Active Study</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-9 w-full justify-between font-normal"
          >
            <span className="truncate">
              {selectedStudy?.title || 'Select a study...'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[308px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search studies..." />
            <CommandList>
              <CommandEmpty>No studies found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="none"
                  onSelect={() => {
                    onStudyChange(null)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${!selectedStudyId ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <span className="text-muted-foreground">No study selected</span>
                </CommandItem>
                {activeStudies.map((study) => (
                  <CommandItem
                    key={study.id}
                    value={study.title}
                    onSelect={() => {
                      onStudyChange(study.id)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${selectedStudyId === study.id ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <span className="truncate">{study.title}</span>
                    {study.status !== 'active' && (
                      <Badge variant="outline" className="ml-auto text-[12px] px-1.5 py-0">
                        {study.status}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {isSelectedStudyInactive && (
        <div className="flex items-center gap-1.5 text-amber-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>Selected study is not active</span>
        </div>
      )}
    </div>
  )
}
