'use client'
import { Info } from 'lucide-react'
import { Input } from '@veritio/ui/components/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'

interface PasswordProtectionSectionProps {
  password: string
  onChange: (value: string) => void
  onBlur: () => void
}

export function PasswordProtectionSection({
  password,
  onChange,
  onBlur,
}: PasswordProtectionSectionProps) {
  return (
    <section className="p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <h3 className="text-xs font-semibold text-foreground">
          Password Protection
        </h3>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px]">
              <p className="text-sm">
                If your Figma prototype is password protected, enter the password here.
                It will be shown to participants so they can access the prototype during the test.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="text-[13px] text-muted-foreground mb-3">
        Enter your prototype password so we can provide it to participants.
      </p>
      <Input
        type="text"
        placeholder="Prototype password"
        value={password}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="h-10"
      />
    </section>
  )
}
