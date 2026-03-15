/**
 * UI Components
 *
 * Core UI components for the Veritio platform.
 * Based on shadcn/ui with custom styling.
 */

// Core Components
export { Button, buttonVariants } from './button'
export { Input } from './input'
export type { InputProps } from './input'
export { Label } from './label'
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from './card'
export { Badge, badgeVariants } from './badge'
export { Avatar, AvatarFallback, AvatarImage } from './avatar'
export { Checkbox } from './checkbox'
export { RadioGroup, RadioGroupItem } from './radio-group'
export { Switch } from './switch'
export { Slider } from './slider'
export { Progress } from './progress'
export { Skeleton } from './skeleton'
export { Separator } from './separator'
export { Toggle, toggleVariants } from './toggle'

// Form Components
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './select'
export { Textarea } from './textarea'
export type { TextareaProps } from './textarea'
export { Field, FieldLabel, FieldDescription } from './field'
export { InputGroup } from './input-group'
export { BlurSaveInput } from './blur-save-input'
export type { BlurSaveInputProps } from './blur-save-input'
export { SearchableSelect } from './searchable-select'
export {
  Combobox,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxInput,
  ComboboxEmpty,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxSeparator,
} from './combobox'

// Dialog & Overlay Components
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog'
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './sheet'
export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
} from './popover'
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from './tooltip'
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './dropdown-menu'
export {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from './hover-card'
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './alert-dialog'
export { ConfirmDialog } from './confirm-dialog'
export { DeleteConfirmationDialog } from './delete-confirmation-dialog'
export { TypeToDeleteDialog } from './type-to-delete-dialog'

// Navigation & Layout Components
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs'
export { ScrollableTabsList } from './scrollable-tabs'
export { ScrollArea, ScrollBar } from './scroll-area'
export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from './collapsible'
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from './sidebar'
export { SegmentedControl } from './segmented-control'
export type { SegmentedControlOption, SegmentedControlProps } from './segmented-control'

// Feedback Components
export { Alert, AlertTitle, AlertDescription } from './alert'
export { EmptyState } from './empty-state'
export { Toaster, toast } from './sonner'
export { RealtimeStatus, RealtimeStatusBadge } from './realtime-status'

// Data Display Components
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table'
export { SortableColumnHeader } from './sortable-column-header'
export { AnimatedList, AnimatedListItem } from './animated-list'

// Utility Components
export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from './command'
export { KeyboardShortcutHint, EscapeHint } from './keyboard-shortcut-hint'
export { BrowserFrame } from './browser-frame'
export { Safari } from './safari'
export { LazyAreaChart, LazyBarChart, LazyLineChart, LazyPieChart } from './lazy-charts'
