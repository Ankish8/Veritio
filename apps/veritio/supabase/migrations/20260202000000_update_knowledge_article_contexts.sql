-- ================================================================
-- Migration: Update Knowledge Article Contexts
-- Description: Add study-type-specific contexts to articles for better matching
-- ================================================================

-- Update Prototype Test articles to include prototype-prefixed contexts
UPDATE knowledge_articles
SET contexts = ARRAY['prototype', 'prototype.details', 'prototype.prototype', 'prototype.prototype-tasks', 'builder.prototype', 'builder.prototype-tasks']
WHERE slug = 'prototype-test-best-practices';

UPDATE knowledge_articles
SET contexts = ARRAY['prototype', 'prototype.results', 'results', 'results.analysis', 'results.overview']
WHERE slug = 'analyzing-prototype-test-paths';

-- Update Tree Test articles to include tree-test-prefixed contexts
UPDATE knowledge_articles
SET contexts = ARRAY['tree-test', 'tree-test.details', 'tree-test.tree', 'tree-test.tasks', 'builder.tree', 'builder.tasks']
WHERE slug = 'tree-test-best-practices';

UPDATE knowledge_articles
SET contexts = ARRAY['tree-test', 'tree-test.results', 'results', 'results.analysis', 'results.overview']
WHERE slug = 'understanding-task-success-metrics';

UPDATE knowledge_articles
SET contexts = ARRAY['tree-test', 'tree-test.results', 'results', 'results.analysis', 'results.analysis.pie-tree']
WHERE slug = 'using-pie-tree-visualization';

-- Update Card Sort articles to include card-sort-prefixed contexts
UPDATE knowledge_articles
SET contexts = ARRAY['card-sort', 'card-sort.details', 'card-sort.content', 'builder.content', 'results.analysis']
WHERE slug = 'card-sort-best-practices';

UPDATE knowledge_articles
SET contexts = ARRAY['card-sort', 'card-sort.results', 'results', 'results.analysis', 'results.analysis.similarity']
WHERE slug = 'understanding-similarity-matrix';

UPDATE knowledge_articles
SET contexts = ARRAY['card-sort', 'card-sort.results', 'results', 'results.analysis', 'results.analysis.dendrogram']
WHERE slug = 'reading-dendrograms';

UPDATE knowledge_articles
SET contexts = ARRAY['card-sort', 'card-sort.results', 'results', 'results.analysis', 'results.analysis.standardization']
WHERE slug = 'category-standardization';

-- Update Survey articles to include survey-prefixed contexts
UPDATE knowledge_articles
SET contexts = ARRAY['survey', 'survey.details', 'survey.study-flow', 'builder.study-flow', 'builder.study-flow.survey']
WHERE slug = 'survey-best-practices';

UPDATE knowledge_articles
SET contexts = ARRAY['survey', 'survey.study-flow', 'builder.study-flow', 'builder.study-flow.survey']
WHERE slug = 'survey-logic-branching';

-- Update Study Flow articles for ALL study types
UPDATE knowledge_articles
SET contexts = ARRAY[
  'card-sort.study-flow', 'tree-test.study-flow', 'survey.study-flow', 'prototype.study-flow',
  'builder.study-flow', 'builder.study-flow.welcome', 'builder.study-flow.agreement',
  'builder.study-flow.screening', 'builder.study-flow.pre_study', 'builder.study-flow.instructions',
  'builder.study-flow.post_study', 'builder.study-flow.thank_you'
]
WHERE slug = 'customizing-study-flow';

UPDATE knowledge_articles
SET contexts = ARRAY[
  'card-sort.study-flow.screening', 'tree-test.study-flow.screening',
  'survey.study-flow.screening', 'prototype.study-flow.screening',
  'builder.study-flow.screening'
]
WHERE slug = 'creating-screening-questions';

-- Update Branding article for ALL study types
UPDATE knowledge_articles
SET contexts = ARRAY[
  'card-sort.branding', 'tree-test.branding', 'survey.branding', 'prototype.branding',
  'builder.branding'
]
WHERE slug = 'customizing-study-branding';

-- Update Settings article for ALL study types
UPDATE knowledge_articles
SET contexts = ARRAY[
  'card-sort.settings', 'tree-test.settings', 'survey.settings', 'prototype.settings',
  'builder.settings'
]
WHERE slug = 'study-settings-configuration';

-- Update Welcome article for dashboard contexts
UPDATE knowledge_articles
SET contexts = ARRAY['dashboard', 'dashboard.projects', 'dashboard.studies', 'dashboard.archive']
WHERE slug = 'welcome-to-optimal';

-- Update Project article for dashboard contexts
UPDATE knowledge_articles
SET contexts = ARRAY['dashboard', 'dashboard.projects']
WHERE slug = 'creating-your-first-project';

-- Update Sharing/Export articles for results contexts
UPDATE knowledge_articles
SET contexts = ARRAY['results', 'results.sharing', 'results.overview']
WHERE slug = 'sharing-your-study';

UPDATE knowledge_articles
SET contexts = ARRAY['results', 'results.downloads', 'results.overview']
WHERE slug = 'exporting-your-data';

-- Update Participant articles for results contexts
UPDATE knowledge_articles
SET contexts = ARRAY['results', 'results.participants', 'results.overview']
WHERE slug = 'understanding-participant-status';

UPDATE knowledge_articles
SET contexts = ARRAY['results', 'results.participants', 'results.analysis']
WHERE slug = 'using-segments-for-analysis';

-- Add a prototype-specific "getting started" article for prototype details page
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Getting Started with Prototype Testing',
  'getting-started-prototype-testing',
  'Learn how to set up and run prototype tests with Figma designs to validate your UX before development.',
  '# Getting Started with Prototype Testing

Prototype testing lets you validate your Figma designs with real users before investing in development.

## What You Need

### Figma Prototype
- A Figma file with connected frames
- Interactive hotspots for navigation
- Clear starting and ending points for tasks

### Test Tasks
- Define 3-5 user tasks to validate
- Each task should test a specific flow or feature
- Write clear, goal-oriented task instructions

## Setting Up Your Test

### 1. Connect Your Figma Account
Go to the **Prototype** tab and connect your Figma account to import prototypes.

### 2. Select Your Prototype
Choose the Figma file and frame where participants will start.

### 3. Configure Tasks
On the **Tasks** tab, create tasks with:
- Clear instructions
- Expected success paths
- Time limits (optional)

### 4. Set Up Study Flow
Configure welcome screens, instructions, and post-test questions.

## Tips for Success

- **Test your prototype yourself first** to ensure all paths work
- **Keep tasks focused** on one goal each
- **Use realistic scenarios** that match actual user needs
- **Preview before launching** to catch issues',
  'Getting Started',
  ARRAY['prototype', 'figma', 'getting-started'],
  ARRAY['prototype', 'prototype.details'],
  95
)
ON CONFLICT (slug) DO UPDATE SET
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Add similar "getting started" articles for other study types
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Getting Started with Card Sorting',
  'getting-started-card-sorting',
  'Learn how to set up and run card sort studies to understand how users categorize your content.',
  '# Getting Started with Card Sorting

Card sorting helps you discover how users naturally organize and categorize information.

## Choosing Your Approach

### Open Card Sort
Participants create their own categories.
- Best for: Discovering user mental models
- Use when: You want to learn how users think about your content

### Closed Card Sort
Participants sort into predefined categories.
- Best for: Validating an existing structure
- Use when: Testing a proposed navigation

## Setting Up Your Study

### 1. Add Your Cards
Go to the **Content** tab and add the items you want sorted:
- Add 15-60 cards for best results
- Use real content labels
- Keep text concise (2-5 words)

### 2. Choose Sort Type
Select open or closed sort based on your research goals.

### 3. Configure Categories (Closed Sort)
If closed sort, define the categories participants will sort into.

### 4. Set Up Study Flow
Add welcome screens, instructions, and post-sort questions.

## Tips for Success

- **Use actual content labels** not placeholder text
- **Include a representative sample** of your content
- **Test with 15-30 participants** for reliable patterns
- **Review results** using similarity matrix and dendrograms',
  'Getting Started',
  ARRAY['card-sort', 'getting-started', 'content'],
  ARRAY['card-sort', 'card-sort.details', 'card-sort.content'],
  95
)
ON CONFLICT (slug) DO UPDATE SET
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Getting Started with Tree Testing',
  'getting-started-tree-testing',
  'Learn how to set up and run tree tests to validate your information architecture.',
  '# Getting Started with Tree Testing

Tree testing validates whether users can find information using your proposed navigation structure.

## What You Need

### Your Navigation Tree
A text-based hierarchy of your site structure without visual design elements.

### Test Tasks
Realistic scenarios that ask users to find specific information.

## Setting Up Your Study

### 1. Build Your Tree
Go to the **Tree** tab and create your navigation structure:
- Use realistic labels
- Include 30-100 items
- Limit depth to 4-5 levels

### 2. Create Tasks
On the **Tasks** tab, write tasks that:
- Use user language (not internal jargon)
- Have a clear goal
- Test critical navigation paths

### 3. Mark Correct Answers
For each task, indicate which node(s) are correct answers.

### 4. Set Up Study Flow
Configure welcome screens and any pre/post questions.

## Tips for Success

- **Write 5-10 tasks** testing key user journeys
- **Use realistic scenarios** based on actual user needs
- **Test with 30-50 participants** for reliable results
- **Analyze paths** not just success rates',
  'Getting Started',
  ARRAY['tree-test', 'getting-started', 'navigation'],
  ARRAY['tree-test', 'tree-test.details', 'tree-test.tree', 'tree-test.tasks'],
  95
)
ON CONFLICT (slug) DO UPDATE SET
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Getting Started with Surveys',
  'getting-started-surveys',
  'Learn how to create effective surveys that gather actionable insights from your users.',
  '# Getting Started with Surveys

Surveys help you gather targeted feedback and insights from your users.

## Planning Your Survey

### Define Your Goals
What do you want to learn? Common survey goals:
- Measure satisfaction
- Understand user needs
- Gather demographic data
- Collect feature requests

### Choose Question Types
- **Multiple choice**: Mutually exclusive options
- **Checkboxes**: Multiple answers allowed
- **Likert scales**: Measure attitudes/opinions
- **Open text**: Detailed feedback

## Setting Up Your Study

### 1. Add Questions
Go to the **Study Flow** tab and add your questions:
- Keep it focused (5-10 minutes completion time)
- Put essential questions early
- One concept per question

### 2. Configure Logic (Optional)
Add skip logic or display conditions to:
- Show relevant follow-up questions
- Skip sections based on responses

### 3. Set Up Flow
Configure welcome screen, instructions, and thank you message.

## Tips for Success

- **Test your survey** before launching
- **Avoid leading questions**
- **Randomize option order** when appropriate
- **Include progress indicators** for longer surveys',
  'Getting Started',
  ARRAY['survey', 'getting-started', 'questions'],
  ARRAY['survey', 'survey.details', 'survey.study-flow'],
  95
)
ON CONFLICT (slug) DO UPDATE SET
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;
