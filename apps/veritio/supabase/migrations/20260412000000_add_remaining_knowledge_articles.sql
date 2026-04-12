-- ================================================================
-- Migration: Add Remaining Knowledge Base Articles
-- Description: Cover keyboard shortcuts, study launch, preview,
--              import/export, AI insights, public sharing, widget
--              config, recording clips, and team invitations
-- ================================================================

-- ================================================================
-- 1. KEYBOARD SHORTCUTS
-- ================================================================

INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Keyboard Shortcuts',
  'keyboard-shortcuts',
  'Speed up your workflow with keyboard shortcuts for navigation, editing, and managing studies.',
  '# Keyboard Shortcuts

Veritio has context-aware keyboard shortcuts that change based on which page you''re on. Press **?** at any time to see available shortcuts.

## Global Navigation

Use **G** then a letter to navigate quickly:
- **G then D** — Go to Dashboard
- **G then P** — Go to Projects
- **G then S** — Go to Studies
- **G then A** — Go to Archive
- **G then ,** — Go to Settings

## Global Actions

- **Cmd+B** — Toggle sidebar
- **Cmd+N** — Create new project (dashboard)
- **Esc** — Close panel / Go back

## Builder Shortcuts

### Tab Navigation (Number Keys)
- **1** — Details tab
- **2** — Content / Tree tab
- **3** — Tasks tab
- **4** — Study Flow tab
- **5** — Settings tab
- **6** — Branding tab

### Builder Actions
- **Cmd+S** — Save changes
- **Cmd+P** — Preview study
- **Esc** — Back to project

### Tree Test (Tree Tab)
**Navigation Mode:**
- **Arrow keys** — Navigate between nodes
- **Space** — Start moving a node
- **Enter** — Edit selected node

**Moving Mode (after pressing Space):**
- **Up/Down arrows** — Move node up or down
- **Right arrow** — Indent (make child)
- **Left arrow** — Outdent (make sibling)
- **Enter** — Confirm position
- **Esc** — Cancel move

**Editing Mode:**
- **Enter** — Add sibling node
- **Shift+Enter** — Add child node
- **Tab / Shift+Tab** — Indent / Outdent
- **Backspace** — Delete node

### Card Sort (Content Tab)
- **Up/Down arrows** — Navigate cards
- **Delete** — Delete selected card

### Survey / Prototype Tasks
- **N** — Add new question or task
- **Delete** — Delete selected item
- **Cmd+D** — Duplicate item

## Results Shortcuts

- **Cmd+E** — Export data
- **Cmd+R** — Refresh data
- **Left/Right arrows** — Navigate between participants

*Note: On Windows/Linux, use Ctrl instead of Cmd.*',
  'Features',
  ARRAY['shortcuts', 'keyboard', 'productivity', 'navigation'],
  ARRAY[
    'dashboard', 'dashboard.projects', 'dashboard.studies', 'dashboard.archive',
    'builder', 'builder.details', 'builder.content', 'builder.tree', 'builder.tasks',
    'builder.study-flow', 'builder.settings', 'builder.branding',
    'card-sort', 'card-sort.details', 'card-sort.content',
    'tree-test', 'tree-test.details', 'tree-test.tree', 'tree-test.tasks',
    'survey', 'survey.details', 'survey.study-flow',
    'prototype', 'prototype.details', 'prototype.prototype', 'prototype.prototype-tasks',
    'first-click', 'first-click.details', 'first-click.first-click-tasks',
    'first-impression', 'first-impression.details', 'first-impression.first-impression-designs',
    'live-website', 'live-website.details', 'live-website.live-website-setup', 'live-website.live-website-tasks',
    'results', 'settings'
  ],
  60
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 2. LAUNCHING YOUR STUDY
-- ================================================================

INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Launching Your Study',
  'launching-your-study',
  'Learn how to launch, pause, resume, and complete your study with the status workflow.',
  '# Launching Your Study

## Study Status Workflow

Studies progress through these statuses:

- **Draft** — Being configured, not yet visible to participants
- **Active** — Live and accepting responses
- **Paused** — Temporarily stopped (link shows a paused message)
- **Completed** — Finished collecting data

## How to Launch

1. Open your study in the **Builder**
2. Click the **Launch Study** button in the top navigation
3. Veritio automatically validates your study configuration
4. If validation passes, a confirmation dialog appears
5. Click **Launch Study** to confirm
6. You''re redirected to the **Recruit** page to start sharing

## Pre-Launch Validation

Before launching, Veritio checks that your study is properly configured:
- Study has a title
- Required content is complete (cards, tree, tasks, designs, or questions)
- Study flow sections are configured
- Correct answers are set (for tree tests)
- Images are uploaded (for first click and first impression)

If issues are found, you''ll see a validation modal with links to fix each issue.

## Managing Study Status

Once launched, use the status dropdown in the builder header:
- **Pause** — Temporarily stop accepting responses
- **Resume** — Reactivate a paused study
- **Complete** — Mark the study as finished
- **Reopen** — Resume a completed study for more responses

## Tips

- **Preview before launching** to catch issues (Cmd+P)
- **Auto-save runs before launch** so your latest changes are included
- **You can pause anytime** without losing data
- **Share the link** immediately after launching via the Recruit page',
  'Features',
  ARRAY['launch', 'activate', 'status', 'publish'],
  ARRAY[
    'builder', 'builder.details',
    'card-sort', 'card-sort.details',
    'tree-test', 'tree-test.details',
    'survey', 'survey.details',
    'prototype', 'prototype.details',
    'first-click', 'first-click.details',
    'first-impression', 'first-impression.details',
    'live-website', 'live-website.details',
    'recruit'
  ],
  85
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 3. STUDY PREVIEW
-- ================================================================

INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Previewing Your Study',
  'previewing-your-study',
  'Test your study as a participant would see it without collecting real data.',
  '# Previewing Your Study

Preview mode lets you experience your study exactly as participants will, without affecting your data.

## How to Preview

1. In the **Builder**, press **Cmd+P** or click the **Preview** button
2. Veritio validates your study and auto-saves any changes
3. A new tab opens with your study in preview mode
4. Walk through the entire flow as a participant would

## What Happens in Preview

- The study opens with `?preview=true` appended to the URL
- **No data is collected** — your responses won''t appear in results
- You see the full participant experience: welcome screen, instructions, main activity, and thank you page
- Branding and theming are applied as they will appear to real participants

## When to Preview

- **After major content changes** — Verify cards, tasks, or questions look right
- **After study flow edits** — Check welcome screens, instructions, and question order
- **After branding updates** — Confirm colors, logo, and theme look correct
- **Before launching** — Do a final run-through of the entire study

## Troubleshooting

### Preview Tab Didn''t Open?
Your browser may have blocked the popup. Look for a popup-blocked indicator in the address bar, or use the fallback **Open Preview** button.

### Changes Not Showing?
Preview always auto-saves before opening. If you still see old content, try refreshing the preview tab.

## Tips
- **Test on mobile too** — Resize your browser or use device mode
- **Try different paths** — If you have skip logic, test each branch
- **Check timing** — Make sure time limits and exposure durations feel right',
  'Features',
  ARRAY['preview', 'testing', 'validation'],
  ARRAY[
    'builder', 'builder.details',
    'card-sort', 'card-sort.details', 'card-sort.content',
    'tree-test', 'tree-test.details', 'tree-test.tree', 'tree-test.tasks',
    'survey', 'survey.details', 'survey.study-flow',
    'prototype', 'prototype.details', 'prototype.prototype',
    'first-click', 'first-click.details', 'first-click.first-click-tasks',
    'first-impression', 'first-impression.details', 'first-impression.first-impression-designs',
    'live-website', 'live-website.details'
  ],
  75
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 4. IMPORT / EXPORT IN BUILDER
-- ================================================================

INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Importing & Exporting Content',
  'importing-exporting-content',
  'Bulk import cards, tree nodes, tasks, or questions from CSV, JSON, or plain text files.',
  '# Importing & Exporting Content

Save time by importing content in bulk instead of adding items one by one.

## Supported Formats

### Plain Text
One item per line. Simplest format for quick imports.
```
Homepage
About Us
Contact Page
Products
```

### CSV
Two columns: label and optional description.
```
label,description
Homepage,Main landing page
About Us,Company information
Contact Page,Support and contact form
```

### JSON
Array of objects with label and optional description.
```json
[
  { "label": "Homepage", "description": "Main landing page" },
  { "label": "About Us" }
]
```

## How to Import

1. Click the **Import** button in the content area
2. Choose your format (Text, CSV, or JSON)
3. Either paste content or upload a file (.txt, .csv, or .json)
4. Preview the parsed items
5. Click **Import** to add them

## What You Can Import

- **Card Sort**: Cards with labels and descriptions
- **Tree Test**: Tree nodes
- **Survey**: Questions
- **Prototype / First Click**: Tasks
- **First Impression**: Design screen labels

## Exporting Content

Export your existing content for backup or reuse:
1. Click the **Export** button
2. Choose format (Text, CSV, or JSON)
3. **Copy to clipboard** or **Download as file**

## Tips
- **Auto-detection**: File extension determines the format automatically
- **Duplicate warning**: Import detects and warns about duplicate labels
- **Bulk editing**: Export, edit in a spreadsheet, then re-import
- Use **Cmd+Enter** to quickly confirm import or download',
  'Features',
  ARRAY['import', 'export', 'bulk', 'csv', 'json'],
  ARRAY[
    'card-sort.content', 'builder.content',
    'tree-test.tree', 'builder.tree',
    'tree-test.tasks', 'builder.tasks',
    'survey.study-flow', 'builder.study-flow',
    'prototype.prototype-tasks', 'builder.prototype-tasks',
    'first-click.first-click-tasks', 'builder.first-click-tasks',
    'first-impression.first-impression-designs', 'builder.first-impression-designs',
    'live-website.live-website-tasks', 'builder.live-website-tasks'
  ],
  70
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 5. AI INSIGHTS REPORT
-- ================================================================

INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Generating AI Insights Reports',
  'generating-ai-insights',
  'Use AI to automatically analyze your study results and generate narrative reports with charts and recommendations.',
  '# Generating AI Insights Reports

AI Insights Reports provide an automated narrative analysis of your study data, complete with charts, key findings, and actionable recommendations.

## Generating a Report

1. Go to your study **Results** page
2. Find the **AI Insights Report** card (rainbow border)
3. Click **Generate Insights**
4. The AI analyzes your data in the background (typically 30-60 seconds)
5. You can navigate away — you''ll get a notification when it''s ready

## What the Report Includes

### Executive Summary
A high-level overview of your study findings in narrative form.

### Sections
Each section covers a specific aspect of your results:
- **Narrative**: Written analysis explaining what the data shows
- **Key Findings**: Bullet-pointed highlights
- **Charts**: Auto-generated visualizations (bar charts, pie charts, line graphs)
- **Recommendations**: Actionable next steps based on the findings

## Report Status

- **Generate**: No report yet — click to create one
- **Processing**: AI is analyzing your data (shows progress %)
- **Completed**: Report is ready to view
- **Stale**: New responses received since the report was generated — consider regenerating

## Working with Reports

### Regenerating
Click **Regenerate** to create a fresh report incorporating new responses.

### Exporting
Download the report as a **PDF** for stakeholder presentations.

### Public Sharing
Enable AI Insights in your public share settings to include the report in shared results.

## Tips
- **Wait for sufficient data** — at least 10-15 responses for meaningful analysis
- **Regenerate after batches** of new responses rather than after every single one
- **Review the executive summary first** for a quick understanding
- **Use charts in presentations** — they''re designed to be stakeholder-friendly',
  'Analysis',
  ARRAY['ai', 'insights', 'report', 'analysis', 'automation'],
  ARRAY['results', 'results.analysis', 'results.overview'],
  75
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 6. PUBLIC RESULTS SHARING
-- ================================================================

INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Sharing Results Publicly',
  'sharing-results-publicly',
  'Create shareable links for stakeholders to view study results with optional password protection.',
  '# Sharing Results Publicly

Share your study results with stakeholders, clients, or team members who don''t have a Veritio account.

## Creating a Public Share Link

1. Go to your study **Results** page
2. Open the **Report** or **Downloads** tab
3. Find the **Public Results** card
4. Toggle **Public Results** on
5. Copy the generated share link

## Choosing What to Share

Control which sections are visible via checkboxes:
- **Overview** — Summary statistics and completion rates
- **Participants** — Response count and timing data
- **Analysis** — Main study results and visualizations
- **Questionnaire** — Pre and post study question responses
- **AI Insights** — AI-generated analysis report (if available)

## Access Controls

### Password Protection
Set an optional password that viewers must enter before seeing results. Share the password separately from the link.

### Link Expiration
Set an expiration date after which the link stops working.

### Regenerating Links
Click **Regenerate** to invalidate the old link and create a new one. Useful if you need to revoke access.

## What Viewers See

Public results pages show:
- Your study branding (logo, colors, theme)
- Selected result tabs with full visualizations
- Read-only view (no editing capabilities)
- Footer noting it''s a shared view

## View Tracking

Veritio tracks how many times your public link has been viewed and when it was last accessed.

## Tips
- **Password-protect sensitive data** and share the password via a different channel
- **Set expiration dates** for time-sensitive reports
- **Choose sections carefully** — only share what stakeholders need
- **Use AI Insights** in shared results for a polished, narrative presentation',
  'Features',
  ARRAY['sharing', 'public', 'stakeholders', 'results'],
  ARRAY['results', 'results.report', 'results.downloads', 'results.sharing'],
  70
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 7. WIDGET CONFIGURATION
-- ================================================================

INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Configuring the Intercept Widget',
  'configuring-intercept-widget',
  'Set up and customize the on-site recruitment widget with different styles, triggers, and targeting rules.',
  '# Configuring the Intercept Widget

The intercept widget appears on your website to recruit visitors into studies. Customize its appearance, timing, and targeting.

## Widget Styles

Choose how the widget appears:
- **Popup** — Small card in a corner of the screen (default)
- **Banner** — Full-width bar at top or bottom
- **Modal** — Centered overlay dialog
- **Drawer** — Side panel sliding in from the edge
- **Badge** — Persistent tab on the side of the page

## Trigger Types

Control when the widget appears:
- **Time Delay** — Show after N seconds on the page (default: 5s)
- **Scroll Percentage** — Trigger at a specific scroll depth (e.g., 50%)
- **Exit Intent** — Show when the user moves to leave the page

## Position Options

Varies by style:
- **Popup**: bottom-right, bottom-left, top-right, top-left
- **Banner**: top, bottom
- **Drawer**: left, right, top, bottom
- **Badge**: left, right

## Customization

### Visual
- **Colors**: Background, text, button, and brand colors
- **Border radius**: Square to rounded corners
- **Shadow**: None, small, medium, or large
- **Theme**: Light, dark, or match system preference
- **Animation**: Fade, slide, zoom, or bounce entrance

### Content
- **Title**: Headline text (default: "Help us improve!")
- **Description**: Supporting text explaining the study
- **Button text**: CTA label (default: "Get Started")

## Advanced Settings

### Frequency Capping
Limit how often the widget shows:
- Max impressions per visitor
- Time window: per day, week, month, or forever

### Targeting
Control who sees the widget:
- New visitors only
- Returning visitors only
- Exclude previous participants

### Scheduling
- Business hours only
- Specific days of the week
- Date range with timezone support

## Embedding

1. Customize your widget in **Panel > Widget**
2. Copy the generated embed code
3. Paste before the closing `</body>` tag on your site
4. Preview using the built-in widget preview tool

## Tips
- **Start with a popup** — least intrusive, highest acceptance
- **Use time delay of 5-10 seconds** to let visitors orient first
- **Keep the message short** — one sentence explaining what you need
- **Test with the preview** before deploying to your live site',
  'Features',
  ARRAY['widget', 'intercept', 'recruitment', 'embed'],
  ARRAY['panel.widget', 'panel', 'recruit'],
  75
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 8. RECORDING CLIPS & SHARING
-- ================================================================

INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Recording Clips & Sharing',
  'recording-clips-sharing',
  'Create clips from session recordings, add tags, and share recordings with stakeholders via secure links.',
  '# Recording Clips & Sharing

Clips let you highlight key moments from session recordings and share them with your team or stakeholders.

## Creating Clips

1. Open a session recording from the **Recordings** tab
2. Find the moment you want to highlight
3. Click **Create Clip**
4. Set the **start and end times** using the range selector
5. Add a **title** (required, max 200 characters)
6. Add an optional **description** (max 1000 characters)
7. Save the clip

## Managing Clips

### Editing
Update a clip''s title, description, or time range after creation.

### Tagging
Add tags to organize clips by theme:
- Predefined tags (e.g., "confusion", "success", "bug")
- Custom tags for your specific research needs

### Deleting
Remove clips you no longer need (confirmation required).

## Sharing Recordings

### Creating a Share Link
1. Open a recording
2. Click **Share**
3. A unique share code is generated (16-character link)
4. Set access level: **View** or **Comment**
5. Optionally add password protection
6. Set expiration (default: 30 days)

### Share Link Features
- **Password protected**: Require a password to view
- **Expiration**: Links auto-expire after the set period
- **View tracking**: See how many times the link has been accessed
- **Revokable**: Disable a share link at any time

### Shared Recording View
Recipients see a dedicated playback page with:
- Video player with full controls
- Clip markers on the timeline
- Read-only access (no editing)

## Exporting Recordings

Export clips or full recordings as video files:
- Trimmed to clip boundaries
- Processed via FFmpeg

## Tips
- **Create clips during review** to mark interesting behaviors
- **Use tags consistently** across recordings for easier analysis
- **Share clips, not full recordings** to save stakeholders'' time
- **Set short expirations** for sensitive research data',
  'Features',
  ARRAY['recordings', 'clips', 'sharing', 'video', 'export'],
  ARRAY['results', 'results.recordings'],
  65
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 9. TEAM INVITATIONS
-- ================================================================

INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Inviting Team Members',
  'inviting-team-members',
  'Invite colleagues to collaborate on studies with role-based access control.',
  '# Inviting Team Members

Collaborate with your team by inviting members to your organization with role-based permissions.

## Team Roles

| Role | What They Can Do |
|------|-----------------|
| **Owner** | Full control over the organization |
| **Admin** | Manage team members and all projects |
| **Editor** | Edit projects and studies |
| **Viewer** | View projects and results (read-only) |

## Sending Invitations

### By Email
1. Go to **Settings > Team**
2. Click **Invite Member**
3. Enter their email address
4. Select a role
5. Add an optional personal message
6. Click **Send Invitation**

### By Invite Link
1. Go to **Settings > Team**
2. Click **Create Invite Link**
3. Select a role
4. Set optional limits (max uses, expiration)
5. Share the link with your team

## Accepting an Invitation

When someone receives an invite:
1. They click the invitation link
2. They see your organization name and their assigned role
3. If not signed in, they''re prompted to sign in or create an account
4. They click **Accept Invitation**
5. They''re automatically added to the organization and redirected to the dashboard

## Managing Invitations

- **Pending invitations** can be revoked before acceptance
- **Expired invitations** show an error page to recipients
- **Change roles** after a member joins via team settings

## Tips
- **Start with Viewer role** for stakeholders who only need to see results
- **Use Editor role** for researchers who create and manage studies
- **Reserve Admin** for team leads who manage membership
- **Use invite links** for onboarding multiple people at once',
  'Features',
  ARRAY['team', 'invitations', 'roles', 'collaboration'],
  ARRAY['settings', 'settings.team'],
  70
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;
