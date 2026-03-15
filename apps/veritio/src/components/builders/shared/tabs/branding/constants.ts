import type { RadiusOption, ThemeMode } from '@/components/builders/shared/types'

// Predefined color options
export const COLOR_PRESETS = [
  '#007A66', // Teal (default)
  '#2563EB', // Blue
  '#7C3AED', // Purple
  '#DB2777', // Pink
  '#DC2626', // Red
  '#EA580C', // Orange
  '#16A34A', // Green
  '#0D9488', // Cyan
  '#1F2937', // Gray
  '#000000', // Black
]

// Radius options
export const RADIUS_OPTIONS: { value: RadiusOption; label: string; description: string; pixels: number }[] = [
  { value: 'none', label: 'None', description: 'Sharp corners', pixels: 0 },
  { value: 'small', label: 'Small', description: 'Subtle rounding', pixels: 4 },
  { value: 'default', label: 'Default', description: 'Balanced', pixels: 8 },
  { value: 'large', label: 'Large', description: 'Rounded', pixels: 16 },
]

// Theme mode options
export const THEME_OPTIONS: { value: ThemeMode; label: string; description: string }[] = [
  { value: 'light', label: 'Light', description: 'Light background' },
  { value: 'dark', label: 'Dark', description: 'Dark background' },
  { value: 'system', label: 'System', description: 'Match device setting' },
]

// Sample options for preview
export const SAMPLE_OPTIONS = [
  { id: '1', label: 'Very satisfied' },
  { id: '2', label: 'Satisfied' },
  { id: '3', label: 'Neutral' },
]

// Sample checkbox options for preview
export const SAMPLE_CHECKBOXES = [
  { id: 'a', label: 'Option A', checked: true },
  { id: 'b', label: 'Option B', checked: false },
  { id: 'c', label: 'Option C', checked: true },
]
