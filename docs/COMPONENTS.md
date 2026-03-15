# UI Components Reference

Quick reference for available components. Use existing components before creating new ones.

---

## Shadcn UI Components

Located in `src/components/ui/`. Import from `@/components/ui/{name}`.

### Layout & Container
| Component | Usage |
|-----------|-------|
| `Card` | Content containers with header/footer |
| `Sheet` | Side panels (mobile nav, filters) |
| `Dialog` | Modal dialogs |
| `AlertDialog` | Confirmation dialogs |
| `Tabs` | Tab navigation |
| `ScrollableTabs` | Tabs with horizontal scroll for overflow |
| `Collapsible` | Single collapsible |
| `Separator` | Horizontal/vertical dividers |
| `ScrollArea` | Custom scrollbars |
| `Sidebar` | App navigation sidebar |
| `Popover` | Floating content panels |

### Form Controls
| Component | Usage |
|-----------|-------|
| `Button` | All buttons (variants: default, outline, ghost, destructive) |
| `Input` | Text inputs |
| `Textarea` | Multi-line text |
| `Select` | Dropdowns |
| `SearchableSelect` | Searchable dropdown with filtering |
| `Combobox` | Autocomplete select with search |
| `Checkbox` | Boolean toggles |
| `Switch` | On/off toggles |
| `RadioGroup` | Single selection from options |
| `Slider` | Range selection |
| `Label` | Form field labels |
| `Toggle` | Toggle button (pressed/unpressed state) |
| `SegmentedControl` | Inline button group for single selection |
| `Command` | Command palette with search |
| `DropdownMenu` | Dropdown menus with nested items |

### Data Display
| Component | Usage |
|-----------|-------|
| `Table` | Data tables |
| `Badge` | Status indicators, tags |
| `Avatar` | User images |
| `Progress` | Progress bars |
| `Skeleton` | Loading placeholders |
| `Tooltip` | Hover info |
| `SortableColumnHeader` | Table column with sort indicators |
| `AnimatedList` | Animated list with transitions |

### Feedback
| Component | Usage |
|-----------|-------|
| `Alert` | Inline messages |
| `Sonner` | Toast notifications (use `toast()`) |

### Performance
| Component | Usage |
|-----------|-------|
| `LazyCharts` | Lazy-loaded chart components (Recharts) |

---

## Custom Components

### Dialogs & Modals
| Component | Path | Usage |
|-----------|------|-------|
| `ConfirmDialog` | ui/confirm-dialog | Yes/No confirmations |
| `TypeToDeleteDialog` | ui/type-to-delete-dialog | Dangerous action confirmation (type to confirm) |
| `DeleteConfirmationDialog` | ui/delete-confirmation-dialog | Simple delete confirmation |
| `CreateStudyDialog` | dashboard/create-study-dialog | New study modal |
| `CreateProjectDialog` | dashboard/create-project-dialog | New project modal |
| `ImportExportDialog` | builders/shared/import-export-dialog | CSV/JSON import/export |
| `PDFExportDialog` | analysis/shared/pdf-export-dialog | PDF export options |
| `ValidationModal` | validation/validation-modal | Study validation issues |

### Form Helpers
| Component | Path | Usage |
|-----------|------|-------|
| `Field` | ui/field | Form field wrapper with label + error |
| `InputGroup` | ui/input-group | Input with prefix/suffix |
| `BlurSaveInput` | ui/blur-save-input | Auto-save on blur |

### Layout & Display
| Component | Path | Usage |
|-----------|------|-------|
| `KeyboardShortcutHint` | ui/keyboard-shortcut-hint | Show keyboard shortcuts |
| `BrowserFrame` | ui/browser-frame | Browser window mockup |
| `Safari` | ui/safari | Safari browser mockup |

### Status Indicators
| Component | Path | Usage |
|-----------|------|-------|
| `RealtimeStatus` | ui/realtime-status | Connection status dot |
| `StudyStatusBadge` | dashboard/studies-table/study-status-badge | Study status pills |
| `StudyTypeIcon` | dashboard/studies-table/study-type-icon | Study type icons |
| `SaveStatus` | builders/save-status | Saving/saved indicator |

---

## Providers

Located in `src/components/providers/`.

| Provider | Usage |
|----------|-------|
| `AuthProvider` | Better-auth session provider |
| `SWRProvider` | SWR configuration provider |
| `ProgressBar` | Page transition progress (NProgress) |

---

## Auth Components

Located in `src/components/auth/`.

| Component | Usage |
|-----------|-------|
| `UserButton` | User avatar dropdown with sign out |

---

## Dashboard Components

Located in `src/components/dashboard/`.

### Main Components
| Component | Usage |
|-----------|-------|
| `AppSidebar` | Main navigation sidebar |
| `Header` | Dashboard header with breadcrumbs |
| `WelcomeBanner` | Welcome message for new users |
| `StatsRow` | Dashboard statistics display |
| `RecentStudiesGrid` | Grid of recent study cards |
| `RecentStudyCard` | Individual study card |
| `ShareLink` | Study share link copier |
| `Skeletons` | Loading skeletons for dashboard |

### Studies Table
| Component | Path | Usage |
|-----------|------|-------|
| `StudiesTable` | studies-table/studies-table | Main studies table |
| `StudiesTableToolbar` | studies-table/studies-table-toolbar | Search, filter, actions |
| `StudyActionMenu` | studies-table/study-action-menu | Row action dropdown |
| `StudyStatusBadge` | studies-table/study-status-badge | Status pills |
| `StudyTypeIcon` | studies-table/study-type-icon | Type icons |

### Study Creation
| Component | Usage |
|-----------|-------|
| `CreateStudyDialog` | New study modal |
| `CreateProjectDialog` | New project modal |
| `StudyTypeCard` | Study type selection card |
| `StudyTypeSection` | Grouped study type options |

---

## Settings Components

Located in `src/components/settings/`.

### Typography Conventions (all settings tabs must follow)
| Element | Classes | Example |
|---------|---------|---------|
| Item name/title | `font-medium` (base 16px) | Integration name, section heading |
| Description | `text-sm text-muted-foreground` | "Secure your account with a strong password" |
| Helper/hint text | `text-xs text-muted-foreground` | "Name changes are managed through your provider" |
| Labels | `<Label>` component | Form field labels |
| Buttons | Default size or `size="sm"` — never add `text-xs` | Action buttons |
| Container | `max-w-2xl` (standard), `max-w-4xl` (wide like Integrations) | Outer wrapper div |

Do NOT use `text-xs` for descriptions or `text-sm` for names — this makes the tab look inconsistent with the rest of Settings.

### Shell
| Component | Usage |
|-----------|-------|
| `SettingsShell` | Settings page layout with tabs |
| `BrandingPreviewStandalone` | Branding preview component |

### Tabs
| Tab | Usage |
|-----|-------|
| `ProfileTab` | User profile settings |
| `AccountTab` | Account management, integrations (Figma) |
| `AppearanceTab` | Theme settings |
| `NotificationsTab` | Email notification preferences |
| `DataPrivacyTab` | Data and privacy settings |
| `IntegrationsTab` | Third-party service connections and triggers |
| `StudyDefaultsTab` | Default study settings |

### Study Defaults Sections
| Component | Path | Usage |
|-----------|------|-------|
| `BrandingDefaultsSection` | study-defaults/ | Default branding |
| `SettingsDefaultsSection` | study-defaults/ | Default study settings |
| `NotificationsDefaultsSection` | study-defaults/ | Default notifications |

---

## Validation Components

Located in `src/components/validation/`.

| Component | Usage |
|-----------|-------|
| `ValidationModal` | Full validation issues modal |
| `ValidationSectionGroup` | Grouped validation issues |
| `ValidationIssueItem` | Individual issue row |

---

## Study-Type Components

### Card Sort

```
src/components/
├── builders/card-sort/
│   ├── card-editor.tsx           # Card list editor
│   ├── card-image-upload.tsx     # Card image uploader
│   ├── category-editor.tsx       # Category list editor
│   ├── settings-panel.tsx        # Card sort settings
│   ├── message-editor.tsx        # Welcome/thank you messages
│   ├── unified-editor.tsx        # Combined card/category editor
│   ├── components/
│   │   ├── edit-card-dialog.tsx      # Card edit modal
│   │   ├── inline-card-edit-form.tsx # Inline card editing
│   │   ├── inline-edit-form.tsx      # Generic inline edit
│   │   ├── sortable-card-item.tsx    # DnD card item
│   │   └── sortable-category-item.tsx # DnD category item
│   └── sections/
│       ├── cards-section.tsx     # Cards tab section
│       ├── categories-section.tsx # Categories tab section
│       └── settings-section.tsx  # Settings tab section
│
├── players/card-sort/
│   ├── card-sort-player.tsx      # Main player component
│   ├── card-sort-header.tsx      # Player header
│   ├── card-sort-footer.tsx      # Player footer
│   ├── screens/                  # Welcome, complete, error, submitting
│   ├── modals/                   # Instructions, validation, delete category
│   └── drag-components/          # DnD card/category components
│
└── analysis/card-sort/
    ├── analysis-tab.tsx          # Main analysis tab
    ├── results-overview.tsx      # Summary stats
    ├── similarity-matrix.tsx     # Card similarity heatmap
    ├── dendrogram.tsx            # Hierarchical clustering
    ├── category-agreement.tsx    # Category-level analysis
    ├── categories-tab.tsx        # Categories analysis
    ├── pca-tab.tsx               # PCA analysis
    ├── standardization-grid.tsx  # Category standardization
    ├── export-dropdown.tsx       # Export options
    ├── participants/             # Participant views
    │   ├── participants-tab-container.tsx
    │   ├── participants-list.tsx
    │   ├── participant-table-row.tsx
    │   ├── participant-detail-dialog.tsx
    │   ├── participant-stats-grid.tsx
    │   ├── participant-bulk-actions.tsx
    │   ├── create-segment-modal.tsx
    │   ├── segments-list.tsx
    │   ├── condition-builder.tsx
    │   ├── condition-group-builder.tsx
    │   └── template-grid.tsx
    ├── categories/               # Category analysis
    │   └── standardized-category-editor.tsx
    ├── segmentation/             # Segmentation system
    │   ├── segment-dropdown.tsx
    │   ├── segment-comparison-bar.tsx
    │   ├── segment-filter-badge.tsx
    │   ├── segment-summary.tsx
    │   ├── global-segment-indicator.tsx
    │   └── filter-configs/       # Filter type configs
    ├── questionnaire/            # Survey responses
    │   ├── questionnaire-tab.tsx
    │   ├── question-card.tsx
    │   ├── notes/                # Question notes
    │   ├── section-notes/        # Section notes
    │   └── response-visualizations/ # Chart components
    └── floating-action-bar/      # Floating panel system
        ├── FloatingActionBar.tsx
        ├── FloatingActionBarIcons.tsx
        ├── FloatingActionBarPanel.tsx
        ├── FloatingActionBarContext.tsx
        ├── PanelContainer.tsx
        ├── MobilePanelToggle.tsx
        ├── MobilePanelModal.tsx
        └── panels/
            ├── GlobalNotesPanel.tsx
            ├── StudyInfoPanel.tsx
            ├── KnowledgeBasePanel.tsx
            └── KeyboardShortcutsPanel.tsx
```

### Tree Test

```
src/components/
├── builders/tree-test/
│   ├── tree-editor.tsx           # Tree structure editor
│   ├── tree-node-item.tsx        # Tree node component
│   ├── task-editor.tsx           # Task editor
│   ├── node-selector.tsx         # Correct answer picker (single)
│   ├── multi-node-selector.tsx   # Correct answer picker (multiple)
│   ├── preview.tsx               # Tree preview
│   ├── settings-panel.tsx        # Tree test settings
│   ├── post-task-questions-modal.tsx  # Post-task questions
│   ├── post-task-question-editor.tsx  # Question editor
│   ├── import/
│   │   └── tree-import-modal.tsx # Tree import modal
│   └── tabs/
│       ├── tree-tab.tsx          # Tree structure tab
│       └── tasks-tab.tsx         # Tasks tab
│
├── players/tree-test/
│   ├── tree-test-player.tsx      # Main player component
│   └── components/
│       ├── instructions-screen.tsx
│       ├── task-header.tsx
│       └── tree-navigation.tsx
│
└── analysis/tree-test/
    ├── analysis-tab.tsx          # Main analysis tab
    ├── results-overview.tsx      # Summary stats
    ├── task-summary-table.tsx    # All tasks table
    ├── task-detail.tsx           # Single task analysis
    ├── task-overview-card.tsx    # Task overview card
    ├── task-performance-chart.tsx # Performance chart
    ├── metrics-badge-grid.tsx    # Metrics display
    ├── participant-responses.tsx # Per-participant view
    ├── destinations-overview.tsx # Destinations summary
    ├── downloads-tab.tsx         # Export options
    ├── participants/
    │   ├── tree-test-participants-tab-container.tsx
    │   ├── tree-test-participants-list.tsx
    │   └── participant-detail-dialog.tsx
    ├── task-results/             # Task result components
    │   ├── task-results-tab.tsx
    │   ├── task-selector.tsx
    │   ├── task-breadcrumb.tsx
    │   ├── statistics-card.tsx
    │   ├── result-pie-chart.tsx
    │   ├── score-bar.tsx
    │   ├── metric-bar.tsx
    │   ├── bullet-chart.tsx
    │   ├── time-box-plot.tsx
    │   ├── status-breakdown-table.tsx
    │   ├── compare-tasks-dialog.tsx
    │   └── comparison-paths-table.tsx
    ├── pietree/                  # Pie-tree visualization
    │   ├── pietree-tab.tsx
    │   ├── pietree-visualization.tsx
    │   ├── pietree-controls.tsx
    │   ├── pietree-legend.tsx
    │   ├── pietree-tooltip.tsx
    │   └── zoom-controls.tsx
    ├── paths/                    # Path analysis
    │   ├── paths-tab.tsx
    │   ├── paths-header.tsx
    │   ├── paths-table.tsx
    │   └── result-filters-dropdown.tsx
    ├── first-click/              # First click analysis
    │   ├── first-click-tab.tsx
    │   ├── first-click-header.tsx
    │   ├── first-click-summary.tsx
    │   └── first-click-table.tsx
    └── destinations/             # Destination analysis
        ├── destinations-tab.tsx
        ├── destinations-header.tsx
        └── destinations-table.tsx
```

### Prototype Test

```
src/components/
├── builders/prototype-test/
│   ├── prototype-preview.tsx     # Figma prototype preview
│   ├── figma-import-dialog.tsx   # Figma URL import dialog
│   ├── frame-selector-dialog.tsx # Frame selection dialog
│   ├── settings-panel.tsx        # Prototype settings
│   ├── task-list.tsx             # Task list editor
│   ├── task-item.tsx             # Individual task item
│   ├── path-list.tsx             # Path list
│   ├── path-preview.tsx          # Path preview
│   ├── path-management-modal.tsx # Path management dialog
│   ├── pathway-builder-modal.tsx # Pathway builder
│   ├── add-correct-answer-modal.tsx # Correct path modal
│   ├── success-criteria-selector.tsx # Success criteria
│   ├── flow-type-selector.tsx    # Flow type selection
│   ├── compact-flow-type-selector.tsx # Compact version
│   └── tabs/
│       ├── prototype-tab.tsx     # Prototype tab
│       └── tasks-tab.tsx         # Tasks tab
│
├── builders/panels/              # Builder side panels
│   ├── BuilderStudyInfoPanel.tsx
│   ├── BuilderTaskOptionsPanel.tsx
│   ├── BuilderPrototypeTaskOptionsPanel.tsx
│   ├── BuilderPrototypeSettingsPanel.tsx
│   └── prototype-settings/
│       ├── figma-account-section.tsx
│       ├── prototype-info-card.tsx
│       ├── starting-frame-section.tsx
│       ├── password-protection-section.tsx
│       └── tips-section.tsx
│
└── players/prototype-test/
    ├── prototype-test-player.tsx # Main player component
    ├── components/
    │   ├── figma-embed.tsx       # Figma embed iframe
    │   ├── figma-preloader.tsx   # Prototype preloader
    │   ├── task-overlay.tsx      # Task panel overlay
    │   ├── task-panel.tsx        # Task instructions panel
    │   ├── task-header.tsx       # Task header
    │   ├── task-complete-button.tsx
    │   ├── collapsed-task-indicator.tsx
    │   ├── success-modal.tsx     # Task success modal
    │   ├── skip-confirmation-dialog.tsx
    │   ├── post-task-questions-screen.tsx
    │   ├── instructions-screen.tsx
    │   ├── complete-screen.tsx
    │   ├── error-screen.tsx
    │   └── submitting-screen.tsx
    └── hooks/
        └── use-prototype-task-tracking.ts
```

### Survey

```
src/components/analysis/survey/
├── participants/                 # Participant views
├── correlation/                  # Correlation analysis
│   ├── hooks/
│   └── utils/
└── cross-tabulation/            # Cross-tabulation analysis
    ├── hooks/
    └── utils/
```

---

## Shared Builder Components

Located in `src/components/builders/shared/`.

### Shell & Layout
| Component | Usage |
|-----------|-------|
| `BuilderShell` | Unified builder page layout |
| `ImportExportDialog` | CSV/JSON import/export |

### Post-Task Questions
| Component | Usage |
|-----------|-------|
| `PostTaskQuestionsModal` | Shared post-task questions modal |
| `PostTaskQuestionDisplayLogicEditor` | Display logic for questions |

### Tabs (Shared across study types)
```
tabs/
├── branding-tab.tsx              # Branding settings tab
├── branding/
│   ├── branding-tab.tsx
│   ├── preview/
│   │   └── branding-preview.tsx
│   ├── sections/
│   │   ├── color-section.tsx
│   │   ├── logo-section.tsx
│   │   └── style-section.tsx
│   └── hooks/
├── details-tab.tsx               # Study details tab
├── settings-tab.tsx              # Study settings tab
└── settings/
    ├── closing-rule-card.tsx
    ├── email-notifications-card.tsx
    ├── pagination-card.tsx
    ├── password-protection-card.tsx
    ├── response-prevention-card.tsx
    └── url-settings-card.tsx
```

---

## Shared Player Components

Located in `src/components/players/shared/`.

| Component | Usage |
|-----------|-------|
| `PostTaskQuestionsScreen` | Shared post-task questions renderer |

---

## Shared Analysis Components

Located in `src/components/analysis/shared/`.

### Core Components
| Component | Usage |
|-----------|-------|
| `ResultsPageShell` | Results page layout with header |
| `ResultsPageHeader` | Results page header |
| `ResultsEmptyState` | Empty state for no data |
| `DownloadsTabBase` | Base downloads/export tab |
| `PDFExportDialog` | PDF export configuration |
| `ParticipantDetailDialogBase` | Base participant detail dialog |
| `ParticipantsListBase` | Base participants list |

### Display Components
| Component | Usage |
|-----------|-------|
| `CompletionDisplay` | Completion status display |
| `TimeDisplay` | Time/duration display |
| `LocationDisplay` | Location display |

### Participant Detail Panel
```
participant-detail-panel/
├── ParticipantDetailPanel.tsx    # Full participant detail
└── ResponseRenderers.tsx         # Response type renderers
```

### Visualization Base
```
visualization-base/
├── VisualizationTable.tsx        # Base visualization table
├── VisualizationEmpty.tsx        # Empty visualization state
└── ProgressCell.tsx              # Progress cell renderer
```

---

## Study Flow Components

### Builder (`src/components/study-flow/builder/`)

#### Main Components
| Component | Usage |
|-----------|-------|
| `StudyFlowBuilder` | Main builder component |
| `FlowEditorPanel` | Flow editing panel |
| `FlowQuestionSection` | Question section editor |
| `FlowDemographicIdentifierSection` | Demographic identifier |
| `SectionConfig` | Section configuration |
| `SectionContainer` | Section wrapper |
| `RichTextEditor` | TipTap rich text editor |
| `RichTextMenuBar` | Rich text toolbar |
| `RichTextPipingInsert` | Piping reference inserter |
| `PipingReferenceNodeView` | Piping node renderer |

#### Flow Navigator
```
flow-navigator/
└── flow-navigator.tsx            # Flow step navigator
```

#### Flow Items
```
flow-items/
├── flow-activity-item.tsx        # Activity flow item
├── flow-step-item.tsx            # Generic step item
├── flow-agreement-section.tsx    # Agreement section
└── flow-prototype-activity-section.tsx
```

#### Sections
```
sections/
├── welcome-section.tsx
├── instructions-section.tsx
├── screening-section.tsx
├── agreement-section.tsx
├── identifier-section.tsx
├── questions-section.tsx
├── survey-questionnaire-section.tsx
├── thank-you-section.tsx
├── closed-section.tsx
├── prototype-test-settings-section.tsx
├── demographic-section-editor.tsx
├── demographic-field-mega-menu.tsx
├── location-field-config.tsx
├── intro-message-card.tsx
├── rejection-message-card.tsx
├── agreement-rejection-editor.tsx
├── question-list-item.tsx
├── section-action-buttons.tsx
└── section-advanced-settings-modal.tsx
```

#### Question Builder
```
question-builder/
├── question-editor.tsx           # Main question editor
├── question-card.tsx             # Question card wrapper
├── question-list.tsx             # Question list
├── question-image-upload.tsx     # Question image uploader
├── question-type-picker.tsx      # Type selection
├── question-type-switcher.tsx    # Type switcher
├── question-type-cards.tsx       # Type selection cards
├── display-logic-editor.tsx      # Display logic
├── branching-logic-editor.tsx    # Branching logic
├── ab-test-editor.tsx            # A/B test editor
├── ab-test-options-config.tsx    # A/B test options
├── inline-option-editor.tsx      # Inline option editing
├── simple-option-editor.tsx      # Simple option editing
├── sortable-option-row.tsx       # DnD option row
├── options-with-inline-logic-section.tsx
├── options-without-logic-section.tsx
├── other-option-section.tsx
├── selection-mode-toggle.tsx
├── random-order-toggle.tsx
├── checkbox-logic-hint.tsx
├── compound-condition-builder.tsx
├── description-piping-insert.tsx
├── bulk-edit-modal.tsx
├── pre-post-question-editor.tsx
├── pre-post-type-switcher.tsx
├── screening-question-editor.tsx
├── screening-intro-editor.tsx
├── rejection-message-editor.tsx
├── branching/                    # Branching components
│   ├── branch-target-selector.tsx
│   ├── choice-branching-editor.tsx
│   ├── scale-branching-editor.tsx
│   ├── default-target-section.tsx
│   └── constants.tsx
├── question-sections/            # Question type configs
│   ├── matrix-question-section.tsx
│   ├── nps-question-section.tsx
│   ├── ranking-question-section.tsx
│   └── text-question-section.tsx
└── type-configs/                 # Per-type configuration
    ├── matrix-config.tsx
    ├── multiple-choice-config.tsx
    ├── multiple-choice-toggles-config.tsx
    ├── nps-config.tsx
    ├── opinion-scale-config.tsx
    ├── ranking-config.tsx
    ├── selection-limits-config.tsx
    ├── text-config.tsx
    └── yes-no-config.tsx
```

#### Inline Logic
```
inline-logic/
├── survey-inline-option-editor.tsx
├── survey-options-with-logic.tsx
├── advanced-branching-section.tsx
├── advanced-branching-components.tsx
├── option-group-editor.tsx
├── branch-target-selector.tsx
├── numeric-branching-editor.tsx
└── text-branching-editor.tsx
```

#### Rules & Variables
```
rules/
├── variables-panel.tsx           # Variables list panel
├── variable-editor-dialog.tsx    # Variable editor modal
└── variable-configs/
    ├── counter-variable-config.tsx
    ├── score-variable-config.tsx
    ├── score-question-item.tsx
    ├── classification-variable-config.tsx
    └── classification-range-item.tsx
```

#### Survey Sections
```
survey-sections/
├── sections-panel.tsx            # Sections list panel
└── section-card.tsx              # Section card
```

#### Preview
```
preview/
├── study-flow-preview.tsx        # Main preview component
├── preview-layout.tsx            # Preview layout wrapper
├── preview-banner.tsx            # Preview mode banner
├── preview-question-renderer.tsx # Question preview
└── sections/
    ├── welcome-preview.tsx
    ├── instructions-preview.tsx
    ├── identifier-preview.tsx
    ├── agreement-preview.tsx
    ├── questions-preview.tsx
    ├── activity-preview.tsx
    ├── tree-test-interactive-preview.tsx
    ├── thank-you-preview.tsx
    └── closed-preview.tsx
```

#### Mobile Layout
```
mobile/
├── mobile-layout.tsx             # Mobile-specific layout
├── mobile-flow-header.tsx        # Mobile header
├── mobile-flow-bottom-sheet.tsx  # Bottom sheet navigation
└── mobile-preview-overlay.tsx    # Mobile preview overlay
```

### Player (`src/components/study-flow/player/`)

#### Main Components
| Component | Usage |
|-----------|-------|
| `StudyFlowPlayer` | Main orchestrator |
| `StepLayout` | Step wrapper with back button |
| `BrandingProvider` | Theme/branding context |
| `ThemeProvider` | Dark/light mode |
| `PreviewBanner` | Preview mode banner |
| `AutoAdvanceIndicator` | Auto-advance countdown |
| `OptionKeyboardHint` | Option keyboard shortcuts |
| `SaveProgressDialog` | Save progress dialog |

#### Question Renderers
```
question-renderers/
├── question-renderer.tsx         # Router component
├── single-line-text.tsx
├── multi-line-text.tsx
├── multiple-choice-question.tsx
├── nps-question.tsx
├── opinion-scale-question.tsx
├── matrix-question.tsx
├── ranking-question.tsx
└── yes-no-question.tsx
```

#### Steps
```
steps/
├── welcome-step.tsx
├── instructions-step.tsx
├── screening-step.tsx
├── rejection-step.tsx
├── agreement-step.tsx
├── identifier-step.tsx
├── questions-step.tsx
├── survey-questions-step.tsx
├── thank-you-step.tsx
├── closed-step.tsx
├── early-survey-end-step.tsx
├── demographic-field-renderer.tsx
├── location-cascade-field.tsx
└── identifier/
    └── lib/
```

#### States
```
states/
├── password-required-state.tsx   # Password gate
├── duplicate-blocked-state.tsx   # Duplicate response block
├── study-error-state.tsx         # Error state
└── preview-banner.tsx            # Preview mode banner
```

#### Progressive Reveal
```
progressive-reveal/
├── animated-question.tsx         # Animated question appearance
└── continue-button.tsx           # Continue button
```

---

## Study Flow Design System

### IMPORTANT: Always Check Existing Components First

**Before implementing any UI in study flows, CHECK:**

1. `src/components/study-flow/player/step-layout.tsx` - Base layout with built-in back button
2. `src/components/study-flow/player/steps/` - Existing step implementations
3. `src/components/ui/keyboard-shortcut-hint.tsx` - Keyboard hint badges

### Study Flow Button Patterns

**DO:**
```typescript
import { StepLayout, BrandedButton } from '../step-layout'
import { ArrowRight } from 'lucide-react'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'

<StepLayout
  title="Step Title"
  showBackButton={!isFirstPage}  // Use built-in back button
  onBack={handleBack}
  actions={
    <BrandedButton onClick={handleNext}>
      Continue
      <ArrowRight className="ml-2 h-4 w-4" />
      <KeyboardShortcutHint shortcut="enter" variant="dark" />
    </BrandedButton>
  }
>
  {/* Content */}
</StepLayout>
```

**DON'T:**
```typescript
// Don't create custom buttons with wrong icons/missing shortcuts
<Button onClick={handleBack}>
  <ChevronLeft className="mr-2" />  // Wrong! Use ArrowLeft or built-in
  Previous
</Button>
```

### Component Map

| Need | Use This | Location |
|------|----------|----------|
| Step wrapper | `StepLayout` | `player/step-layout.tsx` |
| Primary button | `BrandedButton` | `player/step-layout.tsx` |
| Back button | `showBackButton` prop | Built into `StepLayout` |
| Keyboard hints | `KeyboardShortcutHint` | `ui/keyboard-shortcut-hint.tsx` |
| Forward icon | `ArrowRight` | `lucide-react` |
| Theming | `BrandingProvider` | `player/branding-provider.tsx` |

---

## Icon Library

Using **lucide-react**. Import icons directly:

```typescript
import { Plus, Trash2, Settings, ChevronRight } from 'lucide-react'

<Button>
  <Plus className="h-4 w-4 mr-2" />
  Add Item
</Button>
```

Common icons:
- Actions: `Plus`, `Trash2`, `Edit`, `Copy`, `Download`, `Upload`, `Save`
- Navigation: `ChevronRight`, `ChevronDown`, `ChevronLeft`, `ArrowLeft`, `ArrowRight`, `ExternalLink`
- Status: `Check`, `X`, `AlertCircle`, `Info`, `Loader2` (spinning), `CheckCircle`, `XCircle`
- Objects: `File`, `Folder`, `Settings`, `User`, `Search`, `Eye`, `EyeOff`
- Study types: `LayoutGrid` (card sort), `TreeDeciduous` (tree test), `FileText` (survey), `Figma` (prototype)

---

## Usage Patterns

### Toast Notifications
```typescript
import { toast } from 'sonner'

toast.success('Saved successfully')
toast.error('Failed to save')
toast.loading('Saving...')
```

### Confirm Before Delete
```typescript
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

<ConfirmDialog
  title="Delete study?"
  description="This action cannot be undone."
  confirmText="Delete"
  variant="destructive"
  onConfirm={handleDelete}
>
  <Button variant="ghost" size="icon">
    <Trash2 className="h-4 w-4" />
  </Button>
</ConfirmDialog>
```

### Form Field Pattern
```typescript
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

<Field label="Study Title" error={errors.title}>
  <Input value={title} onChange={setTitle} />
</Field>
```

### Lazy Loading Charts
```typescript
import { LazyBarChart, LazyPieChart } from '@/components/ui/lazy-charts'

// Charts are loaded on-demand
<LazyBarChart data={data} />
```

---

## Performance Patterns

### React.memo for List Items

List item components should use `memo` to prevent unnecessary re-renders:

```typescript
import { memo } from 'react'

export const ParticipantRow = memo(function ParticipantRow({ participant, onSelect }) {
  return <TableRow>...</TableRow>
})
```

**Already memoized:** `ParticipantTableRow`, `QuestionListItem`, `SortableCardItem`, `SortableCategoryItem`, `CategoryRow`, `TaskItem`, `TreeNodeItem`, `NoteItem`, `TextResponseRow`

### Virtualization for Large Lists

Use `useVirtualList` hook for lists with 100+ items:

```typescript
import { useVirtualList, VIRTUAL_LIST_PRESETS } from '@/hooks'

function LargeList({ items }) {
  const { parentRef, virtualItems, totalSize } = useVirtualList({
    items,
    ...VIRTUAL_LIST_PRESETS.tableRow, // 48px height, 10 overscan
  })

  return (
    <div ref={parentRef} className="h-[400px] overflow-auto">
      <div style={{ height: totalSize, position: 'relative' }}>
        {virtualItems.map(({ key, start, size, item }) => (
          <div key={key} style={{ position: 'absolute', top: start, height: size, width: '100%' }}>
            <RowComponent data={item} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Presets:** `tableRow` (48px), `compactItem` (36px), `card` (120px, dynamic), `textResponse` (80px, dynamic)

---

## Floating Action Bar System

Used in analysis pages for persistent panels.

```typescript
import { FloatingActionBar, FloatingActionBarProvider } from '@/components/analysis/card-sort/floating-action-bar'

// Provider wraps the analysis page
<FloatingActionBarProvider>
  <AnalysisContent />
  <FloatingActionBar />
</FloatingActionBarProvider>
```

**Available Panels:**
- `GlobalNotesPanel` - Study-wide notes
- `StudyInfoPanel` - Study information
- `KnowledgeBasePanel` - Contextual help articles
- `KeyboardShortcutsPanel` - Available keyboard shortcuts
