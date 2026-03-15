'use client'

import { memo } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SegmentOperator } from '@/stores/segment-store'

interface UrlTag {
  key: string
  values: string[]
}

export interface UrlTagFilterConfigProps {
  availableUrlTags: UrlTag[]
  tagKey: string | undefined
  value: string | undefined
  onTagKeyChange: (key: string) => void
  onChange: (operator: SegmentOperator, value: string) => void
}

export const UrlTagFilterConfig = memo(function UrlTagFilterConfig({
  availableUrlTags,
  tagKey,
  value,
  onTagKeyChange,
  onChange,
}: UrlTagFilterConfigProps) {
  const selectedTag = availableUrlTags.find((t) => t.key === tagKey)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tag</Label>
        <Select value={tagKey} onValueChange={onTagKeyChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select tag" />
          </SelectTrigger>
          <SelectContent>
            {availableUrlTags.map(({ key }) => (
              <SelectItem key={key} value={key}>
                {key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tagKey && selectedTag && (
        <div className="space-y-2">
          <Label>Value is</Label>
          <Select
            value={value}
            onValueChange={(val) => onChange('equals', val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {selectedTag.values.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
})
