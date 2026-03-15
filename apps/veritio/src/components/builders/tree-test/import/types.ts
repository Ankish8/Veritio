export interface ParsedNode {
  label: string
  level: number
  children: ParsedNode[]
}

export type ImportFormat = 'text' | 'json' | 'csv'

export interface JsonTreeNode {
  label: string
  children?: JsonTreeNode[]
}

export interface TreeImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studyId: string
}
