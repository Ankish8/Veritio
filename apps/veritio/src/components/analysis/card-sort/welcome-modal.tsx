'use client'

import { useEffect, useState } from 'react'
import { Layers3, GitBranch, ClipboardList, Frame, MousePointer, Eye, Globe, MessageSquare } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface WelcomeModalProps {
  studyId: string
  studyType?: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
}

const modalContent = {
  card_sort: {
    title: 'Card Sort Analysis',
    description: 'Discover how participants naturally organize and group your content.',
    details: 'Explore similarity matrices, dendrograms, and category patterns to understand user mental models.',
    icon: Layers3,
  },
  tree_test: {
    title: 'Tree Test Analysis',
    description: 'See where users succeed and struggle in your navigation.',
    details: 'Analyze task success rates, first-click accuracy, and path patterns to optimize findability.',
    icon: GitBranch,
  },
  survey: {
    title: 'Survey Analysis',
    description: 'Understand participant responses and uncover patterns.',
    details: 'View response distributions, filter by segments, and export data for deeper analysis.',
    icon: ClipboardList,
  },
  prototype_test: {
    title: 'Prototype Test Analysis',
    description: 'Understand how users navigate through your designs.',
    details: 'Explore task completion rates, click analysis, and path patterns to validate decisions.',
    icon: Frame,
  },
  first_click: {
    title: 'First-Click Analysis',
    description: 'Discover where users instinctively click first.',
    details: 'Analyze click distributions, heatmaps, and success rates to optimize your interface.',
    icon: MousePointer,
  },
  first_impression: {
    title: 'First Impression Analysis',
    description: 'Understand how users perceive your designs at first glance.',
    details: 'Explore response patterns, design comparisons, and question responses to validate visual decisions.',
    icon: Eye,
  },
  live_website_test: {
    title: 'Live Website Analysis',
    description: 'See how participants interact with your live website.',
    details: 'Analyze task completion, click events, scroll depth, and session recordings to optimize your site.',
    icon: Globe,
  },
}

export function WelcomeModal({ studyId, studyType = 'card_sort' }: WelcomeModalProps) {
  const [open, setOpen] = useState(false)
  const storageKey = `results-welcome-dismissed-${studyId}`

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true)
    }
  }, [storageKey])

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      localStorage.setItem(storageKey, 'true')
    }
    setOpen(newOpen)
  }

  const content = modalContent[studyType]
  const Icon = content.icon

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={true}>
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="rounded-xl bg-stone-100 p-3">
              <Icon className="h-6 w-6 text-stone-600" />
            </div>
          </div>
          <DialogTitle className="text-lg font-semibold">
            {content.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground text-center">
          {content.details}
        </p>

        <div className="flex justify-center pt-2">
          <Button onClick={() => handleOpenChange(false)}>
            Get started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
