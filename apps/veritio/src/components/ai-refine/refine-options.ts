import { Sparkles, SpellCheck, Shrink, Expand, BookOpen, Eye } from 'lucide-react'
import type { RefineAction } from '@/hooks/use-refine-text'

export const REFINE_OPTIONS: { action: RefineAction; label: string; icon: typeof Sparkles }[] = [
  { action: 'improve', label: 'Improve Writing', icon: Sparkles },
  { action: 'fix_grammar', label: 'Fix Grammar', icon: SpellCheck },
  { action: 'make_concise', label: 'Make Concise', icon: Shrink },
  { action: 'expand', label: 'Expand', icon: Expand },
  { action: 'simplify', label: 'Simplify Language', icon: BookOpen },
  { action: 'improve_clarity', label: 'Improve Clarity', icon: Eye },
]
