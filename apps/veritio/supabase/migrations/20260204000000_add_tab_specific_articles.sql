-- ================================================================
-- Migration: Add Tab-Specific Knowledge Articles
-- Description: Add detailed articles for each tab in each study type builder
-- ================================================================

-- ============================================
-- PROTOTYPE TEST TAB-SPECIFIC ARTICLES
-- ============================================

-- Prototype Tab: Connecting Figma
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Connecting Your Figma Prototype',
  'connecting-figma-prototype',
  'Learn how to connect your Figma account and import prototypes for testing.',
  '# Connecting Your Figma Prototype

## Connect Your Figma Account
Click **Connect Figma** and authorize access to your Figma files. This is a one-time setup.

## Selecting a Prototype
Once connected:
- Browse your recent Figma files
- Search by file name
- Select the file containing your prototype

## Choosing the Starting Frame
Select which frame participants will see first. Pick the frame that represents the beginning of your user flow.

## Frame Requirements
- Frames must have interactive hotspots
- Navigation should be connected between frames
- Avoid frames with missing links

## Refreshing Your Prototype
If you update your Figma file:
- Click **Refresh** to pull latest changes
- Review that starting frame is still correct
- Test the flow before launching',
  'Prototype Test',
  ARRAY['prototype', 'figma', 'setup'],
  ARRAY['prototype.prototype', 'builder.prototype'],
  90
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Tasks Tab: Creating Tasks
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Creating Prototype Test Tasks',
  'creating-prototype-tasks',
  'Learn how to create effective tasks with success criteria and follow-up paths.',
  '# Creating Prototype Test Tasks

## What is a Task?
A task is a goal you ask participants to complete in your prototype, like "Find the checkout button" or "Add an item to your cart".

## Task Components

### Title
A short name for your task (e.g., "Complete checkout").

### Instruction
Clear directions for participants. Use action-oriented language:
- Good: "Find where you would change your password"
- Bad: "Password settings"

### Starting Screen
The frame where this task begins. Can differ from the prototype starting screen.

## Success Criteria

### Reach a Screen
Task completes when participant reaches ANY goal screen you define. Good for tasks with multiple valid endpoints.

### Follow a Path
Task completes only when participant follows the EXACT sequence of screens you specify. Use for testing specific user flows.

## Setting Goal Screens
Click frames in your prototype to mark them as goals. Participants reaching any goal screen complete the task.

## Follow-up Paths
Define the exact sequence of frames:
1. Click **Follow a Path**
2. Navigate through your prototype
3. Each click adds to the path
4. Participant must follow this exact sequence

## Tips
- Start with 3-5 tasks
- Test one flow per task
- Put critical tasks first',
  'Prototype Test',
  ARRAY['prototype', 'tasks', 'success-criteria'],
  ARRAY['prototype.tasks', 'prototype.prototype-tasks', 'builder.prototype-tasks'],
  95
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Tasks Tab: Task Types Explained
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Task Flow vs Free Flow Tasks',
  'task-flow-vs-free-flow',
  'Understand the difference between Task Flow and Free Flow task types.',
  '# Task Flow vs Free Flow Tasks

## Task Flow
Participants complete tasks in a specific order you define. Each task must be finished before moving to the next.

**When to use:**
- Testing a sequential process
- Tasks build on each other
- You need consistent data across participants

## Free Flow
Participants can attempt tasks in any order and skip tasks if stuck.

**When to use:**
- Testing overall navigation
- Participants might approach tasks differently
- You want natural exploration behavior

## Changing Task Type
Select the type when creating a task. You can change it anytime before launching.

## Mixed Approach
You can have some Task Flow and some Free Flow tasks in the same study by ordering your tasks strategically.',
  'Prototype Test',
  ARRAY['prototype', 'tasks', 'task-flow'],
  ARRAY['prototype.tasks', 'prototype.prototype-tasks', 'builder.prototype-tasks'],
  85
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ============================================
-- CARD SORT TAB-SPECIFIC ARTICLES
-- ============================================

-- Content Tab: Adding Cards
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Adding Cards to Your Card Sort',
  'adding-cards-card-sort',
  'Learn how to add, edit, and organize cards for your card sort study.',
  '# Adding Cards to Your Card Sort

## What are Cards?
Cards represent the items participants will sort into categories. These are typically content items, features, or navigation labels.

## Adding Cards
Click **Add Card** and enter the label. Keep labels:
- Short (2-5 words)
- Clear and unambiguous
- Representative of actual content

## Bulk Import
Have many cards? Use bulk import:
1. Click **Import Cards**
2. Paste labels (one per line)
3. Review and confirm

## Editing Cards
Click any card to edit its label. Changes apply immediately.

## Deleting Cards
Hover over a card and click the delete icon. Be careful - this cannot be undone after launching.

## Card Descriptions (Optional)
Add descriptions to provide context. Useful when labels alone might be unclear.

## How Many Cards?
- Minimum: 15 cards
- Recommended: 30-60 cards
- Maximum: Keep under 100 for participant fatigue

## Tips
- Use real content labels, not placeholders
- Include a representative sample of your content
- Test your cards with a colleague first',
  'Card Sort',
  ARRAY['card-sort', 'cards', 'content'],
  ARRAY['card-sort.content', 'builder.content'],
  95
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Content Tab: Categories for Closed Sort
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Setting Up Categories (Closed Sort)',
  'setting-up-categories-closed-sort',
  'Learn how to define categories for closed card sort studies.',
  '# Setting Up Categories (Closed Sort)

## Open vs Closed Sort
- **Open Sort**: Participants create their own categories
- **Closed Sort**: Participants sort into categories you define

## When to Use Closed Sort
- Validating an existing navigation structure
- Testing proposed category names
- Comparing specific organizational schemes

## Adding Categories
1. Select **Closed Sort** as your sort type
2. Click **Add Category**
3. Enter the category name
4. Repeat for all categories

## Category Guidelines
- Use 4-8 categories typically
- Keep names clear and distinct
- Avoid overlapping categories
- Match your actual navigation labels

## Category Descriptions
Add optional descriptions to clarify what belongs in each category.

## Testing Your Categories
Before launching:
- Can you sort all cards yourself?
- Are categories mutually exclusive?
- Would users understand these labels?',
  'Card Sort',
  ARRAY['card-sort', 'categories', 'closed-sort'],
  ARRAY['card-sort.content', 'builder.content'],
  90
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ============================================
-- TREE TEST TAB-SPECIFIC ARTICLES
-- ============================================

-- Tree Tab: Building Your Tree
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Building Your Navigation Tree',
  'building-navigation-tree',
  'Learn how to create and structure your navigation tree for testing.',
  '# Building Your Navigation Tree

## What is a Tree Test?
A tree test validates your navigation structure without visual design. Participants find items using only text labels.

## Adding Nodes
Click **Add Node** to create navigation items. Each node represents a menu item or page.

## Creating Hierarchy
Drag nodes to nest them under parent items:
- Level 1: Main navigation
- Level 2: Submenus
- Level 3+: Deeper pages

## Editing Nodes
Click any node to edit its label. Use clear, user-friendly terms.

## Import from Sitemap
Have an existing structure? Import from:
- CSV file
- Indented text
- Copy from spreadsheet

## Tree Guidelines
- Limit depth to 4-5 levels
- Include 30-100 items
- Use realistic labels
- Mirror your actual/proposed navigation

## Testing Your Tree
Before launching:
- Can you find key items yourself?
- Are labels clear without context?
- Is the structure logical?',
  'Tree Test',
  ARRAY['tree-test', 'tree', 'navigation'],
  ARRAY['tree-test.tree', 'builder.tree'],
  95
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Tasks Tab: Tree Test Tasks
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Creating Tree Test Tasks',
  'creating-tree-test-tasks',
  'Learn how to write effective tasks and mark correct answers for tree testing.',
  '# Creating Tree Test Tasks

## What is a Task?
A task asks participants to find something in your navigation tree. Example: "Where would you find information about return policies?"

## Writing Good Tasks
Use realistic scenarios based on actual user needs:
- Good: "You want to track your recent order. Where would you look?"
- Bad: "Find Order Tracking"

## Setting Correct Answers
For each task, mark which node(s) are correct:
1. Create the task
2. Click in the tree to select correct answer(s)
3. Multiple nodes can be correct if appropriate

## Task Guidelines
- Write 5-10 tasks
- Test critical user journeys
- Use natural language
- Avoid jargon from your tree labels

## Task Order
Participants complete tasks in order. Put most important tasks first in case of dropoff.

## Scoring
Tasks are scored as:
- **Direct Success**: Found correct answer directly
- **Indirect Success**: Found answer after backtracking
- **Failure**: Selected wrong answer
- **Skip**: Gave up on task',
  'Tree Test',
  ARRAY['tree-test', 'tasks', 'scenarios'],
  ARRAY['tree-test.tasks', 'builder.tasks'],
  95
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ============================================
-- SURVEY TAB-SPECIFIC ARTICLES
-- ============================================

-- Study Flow Tab: Adding Questions
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Adding Survey Questions',
  'adding-survey-questions',
  'Learn how to add different question types to your survey.',
  '# Adding Survey Questions

## Question Types

### Multiple Choice
One answer from several options. Use for mutually exclusive choices.

### Checkboxes
Multiple answers allowed. Use when options aren''t mutually exclusive.

### Likert Scale
Rating scale (e.g., 1-5 or Strongly Disagree to Strongly Agree). Use for measuring attitudes.

### Open Text
Free-form text response. Use for detailed feedback or explanations.

### Number
Numeric input. Use for quantities, ratings, or scores.

## Adding a Question
1. Click **Add Question**
2. Select question type
3. Enter question text
4. Add answer options (for multiple choice/checkboxes)

## Question Settings
- **Required**: Participant must answer
- **Randomize**: Shuffle option order
- **Other Option**: Allow custom text input

## Tips
- Keep surveys under 10 minutes
- Put important questions early
- One concept per question
- Avoid leading questions',
  'Survey',
  ARRAY['survey', 'questions', 'setup'],
  ARRAY['survey.study-flow', 'builder.study-flow', 'builder.study-flow.survey'],
  95
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ============================================
-- COMMON TABS (ALL STUDY TYPES)
-- ============================================

-- Study Flow Tab: Welcome & Instructions
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Configuring Welcome & Instructions',
  'configuring-welcome-instructions',
  'Set up welcome screens and instructions for your study participants.',
  '# Configuring Welcome & Instructions

## Welcome Screen
The first thing participants see. Include:
- Brief study description
- Estimated time to complete
- What to expect

## Instructions Screen
Appears before the main study. Explain:
- How to complete the study
- Any special controls or features
- What you''re looking for (optional)

## Agreement Screen
For consent and terms:
- Add your consent language
- Participants must agree to continue
- Required for research compliance

## Customizing Content
Each screen supports:
- Custom title
- Rich text content
- Enable/disable toggle

## Tips
- Keep text concise
- Use friendly, clear language
- Test on mobile devices',
  'Study Flow',
  ARRAY['study-flow', 'welcome', 'instructions'],
  ARRAY[
    'prototype.study-flow', 'card-sort.study-flow', 'tree-test.study-flow', 'survey.study-flow',
    'builder.study-flow', 'builder.study-flow.welcome', 'builder.study-flow.instructions'
  ],
  90
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Study Flow Tab: Pre/Post Study Questions
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Adding Pre & Post Study Questions',
  'adding-pre-post-study-questions',
  'Collect additional data with questions before and after your main study.',
  '# Adding Pre & Post Study Questions

## Pre-Study Questions
Asked before the main study. Use for:
- Demographics
- Experience level
- Screening criteria

## Post-Study Questions
Asked after completing the study. Use for:
- Overall impressions
- Difficulty ratings
- Open feedback

## Question Types Available
- Multiple choice
- Checkboxes
- Likert scales
- Open text
- Number input

## Adding Questions
1. Go to **Study Flow** tab
2. Click on Pre-Study or Post-Study section
3. Click **Add Question**
4. Configure question settings

## Tips
- Keep pre-study questions minimal
- Save detailed questions for post-study
- Make questions optional when possible
- Test the full flow yourself',
  'Study Flow',
  ARRAY['study-flow', 'questions', 'demographics'],
  ARRAY[
    'prototype.study-flow', 'card-sort.study-flow', 'tree-test.study-flow', 'survey.study-flow',
    'builder.study-flow', 'builder.study-flow.pre_study', 'builder.study-flow.post_study'
  ],
  85
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Settings Tab: Study Settings
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Configuring Study Settings',
  'configuring-study-settings',
  'Learn about the various settings available for your study.',
  '# Configuring Study Settings

## Participant Settings

### Response Limit
Maximum number of participants. Study auto-closes when reached.

### Allow Multiple Responses
Whether the same person can take the study again. Usually disabled for research.

### Time Limit
Optional time limit per session. Useful for timed tasks.

## Data Collection

### Record Timing
Track how long participants spend on each section.

### Collect Device Info
Record browser, device type, and screen size.

## Access Settings

### Password Protection
Require a password to access the study.

### Scheduling
Set start and end dates for data collection.

## Tips
- Set realistic response limits
- Enable timing for usability studies
- Test all settings before launching',
  'Settings',
  ARRAY['settings', 'configuration', 'options'],
  ARRAY[
    'prototype.settings', 'card-sort.settings', 'tree-test.settings', 'survey.settings',
    'builder.settings'
  ],
  85
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Branding Tab: Customization
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Customizing Study Branding',
  'customizing-study-branding-guide',
  'Make your study match your brand with custom colors and logos.',
  '# Customizing Study Branding

## Logo
Upload your company or project logo:
- Recommended size: 200x50px
- Formats: PNG, JPG, SVG
- Appears in study header

## Colors

### Primary Color
Used for buttons and interactive elements.

### Background Color
Main study background.

### Text Color
Ensure contrast with background for readability.

## Preview
Use **Preview** to see how branding looks to participants.

## Tips
- Use brand-compliant colors
- Test on both light and dark backgrounds
- Verify logo is readable at small sizes
- Check mobile appearance',
  'Branding',
  ARRAY['branding', 'customization', 'design'],
  ARRAY[
    'prototype.branding', 'card-sort.branding', 'tree-test.branding', 'survey.branding',
    'builder.branding'
  ],
  80
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Details Tab: Basic Setup
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Setting Up Study Details',
  'setting-up-study-details',
  'Configure the basic information for your study.',
  '# Setting Up Study Details

## Study Name
A descriptive name for your study. This is for your reference - participants won''t see it.

## Description
Internal notes about the study purpose. Helpful for team collaboration.

## Study URL
The link participants use to access your study. You can customize the URL slug.

## Project Assignment
Studies belong to projects. Move a study to a different project if needed.

## Tips
- Use clear, descriptive names
- Add context in the description
- Keep URL slugs short and memorable',
  'Getting Started',
  ARRAY['setup', 'details', 'basics'],
  ARRAY[
    'prototype.details', 'card-sort.details', 'tree-test.details', 'survey.details',
    'builder.details', 'builder'
  ],
  85
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;
