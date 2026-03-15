export interface ImportableItem {
  label: string
  description?: string | null
  imageUrl?: string | null // Optional image URL for card sort image cards
}

export interface ImportExportDialogProps {
  title: string
  description?: string
  items: ImportableItem[]
  onImport: (items: ImportableItem[]) => void
  itemName?: string // e.g., "card", "category"
  trigger?: React.ReactNode
}

export type ImportFormat = 'csv' | 'json' | 'text'
export type ExportFormat = 'csv' | 'json' | 'text'

export interface ParseResult {
  items: ImportableItem[]
  error: string | null
  duplicates: string[]
}
