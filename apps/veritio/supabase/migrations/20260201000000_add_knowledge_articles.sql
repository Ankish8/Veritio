-- ================================================================
-- Migration: Add Knowledge Articles Table
-- Description: Stores context-aware knowledge base articles for the floating panel
-- ================================================================

-- ================================================================
-- 1. Create knowledge_articles table
-- ================================================================
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  preview TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  contexts TEXT[] NOT NULL,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- 2. Create indexes for efficient querying
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_category ON knowledge_articles(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_contexts ON knowledge_articles USING GIN(contexts);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_tags ON knowledge_articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_priority ON knowledge_articles(priority DESC);

-- ================================================================
-- 3. Enable RLS on knowledge_articles (public read access)
-- ================================================================
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read knowledge articles (they're public content)
CREATE POLICY "Knowledge articles are publicly readable" ON knowledge_articles
  FOR SELECT USING (true);

-- Policy: Only admins can insert/update/delete (we'll use service role key)
-- For now, allow all authenticated operations since we don't have admin role yet
CREATE POLICY "Service role can manage knowledge articles" ON knowledge_articles
  FOR ALL USING (true);

-- ================================================================
-- 4. Create trigger for updated_at timestamp
-- ================================================================
CREATE OR REPLACE FUNCTION update_knowledge_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_articles_updated_at
  BEFORE UPDATE ON knowledge_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_articles_updated_at();

-- ================================================================
-- 5. Seed initial knowledge base content
-- ================================================================

-- Getting Started Articles
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority) VALUES
(
  'Welcome to Veritio',
  'welcome-to-veritio',
  'Get started with the UX Research Platform. Learn how to create projects, run studies, and analyze results.',
  '# Welcome to Veritio

Veritio is a comprehensive UX research platform that helps you understand how users think about and navigate your content.

## What You Can Do

- **Card Sort Studies**: Discover how users naturally categorize your content
- **Tree Test Studies**: Validate your information architecture
- **Survey Studies**: Gather targeted feedback with customizable questionnaires
- **Prototype Testing**: Test Figma prototypes with real users

## Getting Started

1. **Create a Project**: Projects help organize related studies
2. **Add a Study**: Choose the study type that matches your research goals
3. **Configure Your Study**: Add content, customize the flow, and brand your study
4. **Launch & Share**: Get a shareable link for participants
5. **Analyze Results**: View insights and export your data

## Need Help?

Browse the knowledge base for detailed guides on each feature, or contact support for assistance.',
  'Getting Started',
  ARRAY['onboarding', 'introduction', 'basics'],
  ARRAY['dashboard', 'dashboard.projects', 'dashboard.studies'],
  100
),
(
  'Creating Your First Project',
  'creating-your-first-project',
  'Learn how to create and organize projects to manage your UX research studies effectively.',
  '# Creating Your First Project

Projects are containers that help you organize related studies. For example, you might create a project for a website redesign that contains card sorts, tree tests, and surveys.

## How to Create a Project

1. Click the **+ New** button in the sidebar
2. Select **New Project**
3. Enter a project name and optional description
4. Click **Create**

## Project Organization Tips

- **Group by initiative**: Keep all studies for a single project or feature together
- **Use descriptive names**: Include the product area or date for easy identification
- **Add descriptions**: Help team members understand the project''s purpose

## What''s Next?

Once you have a project, you can add studies to it. Each study type serves a different research purpose.',
  'Getting Started',
  ARRAY['projects', 'organization', 'basics'],
  ARRAY['dashboard', 'dashboard.projects'],
  90
),

-- Card Sort Articles
(
  'Card Sort Best Practices',
  'card-sort-best-practices',
  'Tips for running effective card sort studies including card selection, participant recruitment, and analysis strategies.',
  '# Card Sort Best Practices

Card sorting helps you understand how users naturally categorize information. Here''s how to get the most from your studies.

## Choosing Cards

- **15-60 cards** is ideal for most studies
- Use actual content labels, not placeholder text
- Keep card text concise (2-5 words)
- Include a representative sample of your content

## Open vs Closed Sorts

**Open Sort**: Participants create their own categories
- Best for: Discovering user mental models
- When to use: Early in design process

**Closed Sort**: Participants sort into predefined categories
- Best for: Validating a proposed structure
- When to use: Testing a specific IA proposal

## Participant Guidelines

- Aim for **15-30 participants** for reliable patterns
- More participants needed for open sorts (more variation)
- Include diverse user perspectives when possible

## Common Mistakes to Avoid

1. Too many cards (participant fatigue)
2. Ambiguous card labels
3. Testing with only internal stakeholders
4. Ignoring outlier categorizations',
  'Best Practices',
  ARRAY['card-sort', 'methodology', 'tips'],
  ARRAY['builder.content', 'results.analysis'],
  80
),
(
  'Understanding the Similarity Matrix',
  'understanding-similarity-matrix',
  'Learn how to interpret the similarity matrix and identify patterns in how participants grouped cards together.',
  '# Understanding the Similarity Matrix

The similarity matrix shows how often pairs of cards were sorted into the same category, helping you identify natural groupings.

## How to Read the Matrix

- **Cells**: Each cell shows the percentage of participants who grouped two cards together
- **Color intensity**: Darker colors indicate higher similarity (more often grouped together)
- **Diagonal**: Always 100% (a card is always with itself)

## Interpreting Results

### Strong Pairs (70-100%)
Cards frequently grouped together. These have a clear relationship in users'' minds.

### Moderate Pairs (40-70%)
Some agreement but not universal. May indicate:
- Different user mental models
- Cards that could go in multiple categories
- Need for clearer labeling

### Weak Pairs (0-40%)
Rarely grouped together. These cards are perceived as distinct concepts.

## Using the Matrix

1. **Identify clusters**: Look for blocks of high-similarity cards
2. **Find outliers**: Cards with low similarity to everything may need rethinking
3. **Validate categories**: Cards in the same proposed category should show high similarity',
  'Analysis',
  ARRAY['similarity-matrix', 'analysis', 'visualization'],
  ARRAY['results.analysis', 'results.analysis.similarity'],
  75
),
(
  'Reading Dendrograms',
  'reading-dendrograms',
  'A guide to understanding hierarchical clustering visualizations and how to identify optimal category groupings.',
  '# Reading Dendrograms

A dendrogram (tree diagram) shows hierarchical relationships between cards based on how participants grouped them.

## Anatomy of a Dendrogram

- **Leaves**: Individual cards at the bottom
- **Branches**: Lines connecting related items
- **Height**: Distance from leaves indicates similarity (lower = more similar)
- **Clusters**: Groups of cards joined at similar heights

## How to Interpret

### Reading Bottom-Up
1. Start with the cards at the bottom
2. Follow branches upward to see which cards merge first
3. Earlier merges (lower height) = stronger relationships

### Finding Natural Clusters
- Look for large gaps in merge heights
- The "elbow" point often indicates a natural number of categories
- Cutting the tree at different heights gives different grouping levels

## Practical Application

1. **Identify 4-7 main clusters** for primary navigation
2. **Check subclusters** for potential second-level categories
3. **Note singleton cards** that don''t cluster well (may need special handling)

## Tips

- Compare dendrogram clusters to your proposed IA
- Don''t force an exact number of categories
- Consider multiple valid interpretations',
  'Visualization',
  ARRAY['dendrogram', 'clustering', 'visualization'],
  ARRAY['results.analysis', 'results.analysis.dendrogram'],
  70
),
(
  'Category Standardization',
  'category-standardization',
  'Learn how to standardize participant-created categories in open card sorts to reveal meaningful patterns.',
  '# Category Standardization

In open card sorts, participants create their own category names. Standardization helps you group similar categories to reveal patterns.

## Why Standardize?

Participants may create categories with:
- Different names for the same concept ("Help" vs "Support" vs "Assistance")
- Variations in specificity ("Products" vs "Product Catalog")
- Spelling/formatting differences

## How to Standardize

1. **Review all categories** created by participants
2. **Identify similar categories** that represent the same concept
3. **Create a standardized name** that captures the shared meaning
4. **Map original categories** to standardized versions

## Best Practices

- **Be conservative**: Only merge clearly equivalent categories
- **Document decisions**: Note why categories were merged
- **Keep originals**: Always preserve the original participant data
- **Check edge cases**: Some categories may fit multiple standards

## After Standardization

- Re-analyze the similarity matrix with standardized categories
- Look for new patterns that emerge
- Compare standardized results to your proposed IA',
  'Analysis',
  ARRAY['standardization', 'categories', 'open-sort'],
  ARRAY['results.analysis', 'results.analysis.standardization'],
  65
),

-- Tree Test Articles
(
  'Tree Test Best Practices',
  'tree-test-best-practices',
  'Design effective tree tests to validate your information architecture and identify navigation issues.',
  '# Tree Test Best Practices

Tree testing validates whether users can find information using your proposed navigation structure.

## Creating Your Tree

- **Use realistic labels**: Match what you''d actually use on your site
- **Include 30-100 items**: Enough depth without overwhelming
- **Limit depth to 4-5 levels**: Deeper trees increase difficulty
- **Balance breadth**: Avoid one category with 20 items and others with 3

## Writing Good Tasks

1. **Use user language**: Avoid internal jargon
2. **Be specific**: "Find the return policy" not "Find policies"
3. **Include a clear goal**: Participants should know when they''ve succeeded
4. **Test real scenarios**: Base tasks on actual user needs

## Number of Tasks

- **5-10 tasks** is typical
- More tasks = more data but longer completion time
- Prioritize critical paths in your IA

## Participant Guidelines

- **30-50 participants** for reliable results
- Include users unfamiliar with your current structure
- Mix of demographics/user types if relevant',
  'Best Practices',
  ARRAY['tree-test', 'methodology', 'tasks'],
  ARRAY['builder.tree', 'builder.tasks'],
  80
),
(
  'Understanding Task Success Metrics',
  'understanding-task-success-metrics',
  'Learn how to interpret tree test success rates, directness scores, and time metrics.',
  '# Understanding Task Success Metrics

Tree test results help you identify where users succeed and struggle with your navigation.

## Key Metrics

### Success Rate
Percentage of participants who found the correct answer.
- **70%+ is good**: Most users can find the content
- **50-70% needs attention**: Navigation could be clearer
- **Below 50% is problematic**: Significant findability issues

### Directness Score
Percentage who found the answer without backtracking.
- High directness = clear, intuitive path
- Low directness = users are guessing or lost

### Time to Complete
How long participants took to complete the task.
- Compare across tasks to identify difficult ones
- Longer times may indicate confusion even with eventual success

## Analyzing Results

1. **Start with success rates**: Identify struggling tasks
2. **Check directness**: High success + low directness = lucky guessing
3. **Review paths taken**: Where do users go wrong?
4. **Compare user segments**: Do different groups struggle with different tasks?',
  'Analysis',
  ARRAY['metrics', 'success-rate', 'analysis'],
  ARRAY['results.analysis', 'results.overview'],
  75
),
(
  'Using the Pie Tree Visualization',
  'using-pie-tree-visualization',
  'Navigate the pie tree to see exactly where users clicked for each task and identify problem areas.',
  '# Using the Pie Tree Visualization

The pie tree shows the distribution of user clicks across your tree structure for each task.

## How It Works

- Each node shows a **pie chart** of user selections
- **Green segments**: Clicks leading toward the correct answer
- **Red segments**: Clicks leading away from correct answer
- **Size**: Larger segments = more clicks

## Reading the Visualization

### At Each Level
1. See how many users selected each option
2. Green portions show users on the right track
3. Red portions reveal common wrong turns

### Following Paths
- Click on segments to drill down
- See where users diverged from the correct path
- Identify "competitor" categories that attract clicks

## Actionable Insights

- **Large red segments**: Category label may be misleading
- **Distributed clicks**: No clear winner, labels need work
- **Drop-offs**: Users gave up at certain points
- **Wrong paths**: Users may have a different mental model',
  'Visualization',
  ARRAY['pie-tree', 'visualization', 'paths'],
  ARRAY['results.analysis', 'results.analysis.pie-tree'],
  70
),

-- Survey Articles
(
  'Survey Best Practices',
  'survey-best-practices',
  'Design effective surveys that gather actionable insights while maintaining high completion rates.',
  '# Survey Best Practices

Well-designed surveys provide valuable insights without frustrating participants.

## Question Design

### Be Clear and Specific
- One question = one concept
- Avoid double-barreled questions ("Do you find the site fast and easy to use?")
- Use simple language

### Choose the Right Question Type
- **Multiple choice**: When options are mutually exclusive
- **Checkboxes**: When multiple answers apply
- **Likert scales**: For measuring attitudes
- **Open text**: For detailed feedback (use sparingly)

## Survey Length

- **5-10 minutes** is ideal for unsolicited surveys
- **15-20 minutes** maximum for motivated participants
- Show progress indicators for longer surveys
- Put essential questions early

## Avoiding Bias

- Don''t lead with positive/negative language
- Randomize option order when appropriate
- Include "Not applicable" or "Prefer not to answer" when relevant
- Test your survey before launching',
  'Best Practices',
  ARRAY['survey', 'questions', 'methodology'],
  ARRAY['builder.study-flow', 'builder.study-flow.survey'],
  80
),
(
  'Using Survey Logic and Branching',
  'survey-logic-branching',
  'Create dynamic surveys that adapt based on participant responses using skip logic and display rules.',
  '# Using Survey Logic and Branching

Smart surveys adapt to each participant, showing only relevant questions.

## Skip Logic

Skip logic jumps participants past questions based on their answers.

**Example**: If someone answers "No" to "Have you used our product?", skip the detailed product questions.

### Setting Up Skip Logic
1. Select the trigger question
2. Choose the condition (e.g., "Answer equals No")
3. Select where to skip to

## Display Logic

Display logic shows or hides questions based on previous answers.

**Example**: Only show "Which features do you use?" if they''ve indicated product usage.

### When to Use Each
- **Skip logic**: Jump over entire sections
- **Display logic**: Show/hide individual questions

## Best Practices

- Test all logic paths before launching
- Don''t create overly complex branching
- Ensure required questions are reachable in all paths
- Preview the survey from a participant''s view',
  'Features',
  ARRAY['logic', 'branching', 'skip-logic'],
  ARRAY['builder.study-flow', 'builder.study-flow.survey'],
  70
),

-- Prototype Test Articles
(
  'Prototype Test Best Practices',
  'prototype-test-best-practices',
  'Run effective prototype tests to validate designs before development with real user feedback.',
  '# Prototype Test Best Practices

Prototype testing lets you validate Figma designs with real users before investing in development.

## Preparing Your Prototype

- **Connect frames**: Ensure navigation flows work
- **Add hotspots**: Make interactive areas clear
- **Test all paths**: Walk through every task yourself first
- **Consider starting points**: Where should each task begin?

## Writing Effective Tasks

1. **Focus on user goals**: "Find and add a product to your cart"
2. **Be realistic**: Tasks should mirror actual use cases
3. **Define success clearly**: Know what "completion" means
4. **Provide context**: Brief scenarios help participants understand intent

## Number of Tasks

- **3-5 tasks** per session is typical
- Each task should test a specific flow or feature
- Prioritize critical user journeys

## Participant Selection

- Match your target users
- Include both novices and power users if relevant
- 5-8 participants often reveal most issues',
  'Best Practices',
  ARRAY['prototype', 'testing', 'figma'],
  ARRAY['builder.prototype', 'builder.prototype-tasks'],
  80
),
(
  'Analyzing Prototype Test Paths',
  'analyzing-prototype-test-paths',
  'Understand how users navigate through your prototype and identify where they struggle or succeed.',
  '# Analyzing Prototype Test Paths

Path analysis reveals how users actually navigate your prototype versus your intended flow.

## Path Types

### Direct Path
User follows the optimal path to complete the task. Indicates clear, intuitive design.

### Successful with Detours
User completed the task but took extra steps. May indicate:
- Exploration behavior
- Unclear navigation
- Competing elements

### Failed Paths
User couldn''t complete the task. Analyze where they:
- Got stuck
- Gave up
- Made incorrect choices

## Key Metrics

- **Success rate**: Percentage who completed the task
- **Directness**: How closely users followed the optimal path
- **Time on task**: Duration indicates difficulty
- **Click count**: More clicks may suggest confusion

## Identifying Issues

1. **Heat maps**: See where users click most
2. **Drop-off points**: Where do users abandon tasks?
3. **Common wrong turns**: Which elements mislead users?
4. **Time delays**: Where do users hesitate?',
  'Analysis',
  ARRAY['paths', 'analysis', 'prototype'],
  ARRAY['results.analysis', 'results.overview'],
  75
),

-- Study Flow Articles
(
  'Customizing Your Study Flow',
  'customizing-study-flow',
  'Configure welcome screens, questionnaires, and thank you pages to create a professional participant experience.',
  '# Customizing Your Study Flow

The study flow defines what participants see before, during, and after your main study activity.

## Flow Sections

### Welcome Screen
First thing participants see.
- Add your study title and purpose
- Set expectations for time required
- Include any important instructions

### Participant Agreement
Optional consent/terms acceptance.
- Include privacy information
- Explain how data will be used
- Required before proceeding

### Screening Questions
Filter participants based on criteria.
- Ask qualifying questions upfront
- Redirect non-qualifying participants gracefully
- Keep screening brief

### Pre-Study Questions
Gather context before the main activity.
- Demographics
- Prior experience
- Relevant background

### Instructions
Explain how to complete the study.
- Keep instructions clear and brief
- Include examples if helpful
- Mention any time expectations

### Post-Study Questions
Gather feedback after the activity.
- Overall impressions
- Difficulty ratings
- Open feedback

### Thank You Screen
Final message to participants.
- Express gratitude
- Provide next steps if any
- Include contact information if appropriate',
  'Features',
  ARRAY['study-flow', 'customization', 'setup'],
  ARRAY['builder.study-flow', 'builder.study-flow.welcome', 'builder.study-flow.agreement', 'builder.study-flow.screening', 'builder.study-flow.pre_study', 'builder.study-flow.instructions', 'builder.study-flow.post_study', 'builder.study-flow.thank_you'],
  85
),
(
  'Creating Screening Questions',
  'creating-screening-questions',
  'Filter participants based on qualifying criteria to ensure you get feedback from your target audience.',
  '# Creating Screening Questions

Screening questions help ensure participants match your target audience before they begin the study.

## When to Use Screening

- Testing with specific user segments
- Requiring certain experience levels
- Filtering for geographic or demographic criteria
- Ensuring relevant professional background

## Writing Effective Screeners

### Be Direct
Ask exactly what you need to know.
- "Have you purchased from our website in the last 6 months?"
- "What is your current job role?"

### Use Closed Questions
Multiple choice or yes/no for easy filtering.

### Don''t Tip Off Answers
Avoid making the "right" answer obvious.
- Bad: "Do you have experience with our product (required for this study)?"
- Good: "Which of these products have you used?"

## Setting Up Screening Logic

1. Add your screening questions
2. Define qualifying answers
3. Configure what happens to disqualified participants:
   - Redirect to thank you page
   - Show custom message
   - Offer alternative',
  'Features',
  ARRAY['screening', 'questions', 'filtering'],
  ARRAY['builder.study-flow.screening'],
  70
),

-- Branding Articles
(
  'Customizing Your Study Branding',
  'customizing-study-branding',
  'Add your logo, colors, and style to create a professional, branded experience for participants.',
  '# Customizing Your Study Branding

Make your studies look professional and on-brand with custom styling options.

## Logo

- Upload your company or project logo
- Appears in the study header
- Recommended: PNG with transparent background
- Max dimensions: 200x80 pixels

## Colors

### Primary Color
- Used for buttons and accents
- Choose a color that matches your brand
- Ensure sufficient contrast for accessibility

### Background Color
- Sets the overall study background
- Light colors recommended for readability

## Style Presets

Choose from pre-designed visual styles:
- **Default**: Clean and professional
- **Vega**: Bold with high contrast
- **Nova**: Soft with rounded elements
- **Maia**: Minimal and flat
- **Lyra**: Elegant and refined

## Theme Mode

- **Light**: Standard light background
- **Dark**: Dark background for modern look
- **System**: Matches participant''s preference

## Tips

- Test your branding on multiple devices
- Ensure text remains readable
- Consider color blindness accessibility
- Preview before launching',
  'Features',
  ARRAY['branding', 'customization', 'design'],
  ARRAY['builder.branding'],
  75
),

-- Settings Articles
(
  'Study Settings and Configuration',
  'study-settings-configuration',
  'Configure study URLs, passwords, closing rules, and other advanced settings.',
  '# Study Settings and Configuration

Fine-tune your study with these configuration options.

## Custom URL

Create a memorable link for your study:
- Choose a custom slug (e.g., yoursite.com/s/my-study)
- Keep it short and relevant
- Avoid special characters

## Password Protection

Restrict access to your study:
- Set a password participants must enter
- Useful for internal testing
- Share password separately from link

## Closing Rules

Control when your study stops accepting responses:

### Close by Date
- Set a specific end date/time
- Study automatically closes

### Close by Response Count
- Set maximum number of participants
- Useful for budget management

### Both
- Study closes when either condition is met

## Language

- Set the default language for system text
- Participants see buttons/instructions in chosen language

## Multiple Response Prevention

Control whether participants can take the study multiple times:
- **Relaxed**: Cookie-based (easy to bypass)
- **Moderate**: Cookie + IP tracking
- **Strict**: Browser fingerprinting',
  'Features',
  ARRAY['settings', 'configuration', 'urls'],
  ARRAY['builder.settings'],
  70
),

-- Results & Sharing Articles
(
  'Sharing Your Study',
  'sharing-your-study',
  'Get your study link and share it with participants via email, social media, or your website.',
  '# Sharing Your Study

Once your study is active, share it with participants to collect responses.

## Getting Your Link

1. Go to your study
2. Click the **Share** tab or copy from the study header
3. Copy the unique study URL

## Sharing Methods

### Direct Link
- Email to participants
- Post in Slack/Teams
- Include in calendar invites

### QR Code
- Print for in-person recruitment
- Add to posters or flyers

### Embed Code
- Add to your website
- Include in newsletters

## Best Practices

- Test the link before sharing widely
- Include context about the study purpose
- Mention estimated completion time
- Provide contact for questions

## URL Parameters

Add tracking parameters to identify participant sources:
- `?src=email` for email campaigns
- `?src=linkedin` for social media
- View these in results to analyze sources',
  'Features',
  ARRAY['sharing', 'link', 'distribution'],
  ARRAY['results.sharing'],
  70
),
(
  'Exporting Your Data',
  'exporting-your-data',
  'Download your study results in CSV, Excel, or other formats for further analysis.',
  '# Exporting Your Data

Export your study data for analysis in external tools or archiving.

## Export Formats

### CSV
- Universal format
- Works with Excel, Google Sheets, SPSS, R
- One file per data type (participants, responses, etc.)

### Excel
- Multiple sheets in one file
- Formatted for easy reading
- Good for sharing with stakeholders

### PDF Reports
- Visual summary of results
- Include charts and key metrics
- Professional presentation format

## What''s Included

- **Participant data**: IDs, status, timestamps
- **Response data**: All answers and interactions
- **Analysis data**: Calculated metrics and scores
- **Metadata**: Study configuration, questions

## Tips

- Export regularly for backup
- Check data completeness before sharing
- Remove sensitive info if needed
- Document any data transformations',
  'Features',
  ARRAY['export', 'data', 'download'],
  ARRAY['results.downloads'],
  65
),

-- Participants Articles
(
  'Understanding Participant Status',
  'understanding-participant-status',
  'Learn what different participant statuses mean and how to manage your response data.',
  '# Understanding Participant Status

Participant status helps you understand the state of each response.

## Status Types

### Completed
- Participant finished the entire study
- All data is captured
- Include in analysis

### In Progress
- Participant started but hasn''t finished
- May have partial data
- Could still complete

### Abandoned
- Participant stopped before completing
- Left the study without finishing
- Partial data may be available

### Screened Out
- Didn''t meet screening criteria
- Redirected before main activity
- Not included in main analysis

## Managing Participants

### Excluding Responses
- Exclude suspicious or test responses
- Excluded participants don''t affect metrics
- Original data preserved

### Filtering by Status
- View only completed responses for clean analysis
- Review abandoned to identify drop-off points
- Check in-progress for potential outreach

## Best Practices

- Focus on completed responses for primary analysis
- Investigate high abandonment rates
- Exclude test/internal responses
- Document exclusion decisions',
  'Analysis',
  ARRAY['participants', 'status', 'data-management'],
  ARRAY['results.participants'],
  70
),
(
  'Using Segments for Analysis',
  'using-segments-for-analysis',
  'Create participant segments to compare results across different user groups and demographics.',
  '# Using Segments for Analysis

Segments let you filter and compare results across different participant groups.

## Creating Segments

1. Go to the Participants tab
2. Click "Create Segment"
3. Define filter conditions
4. Save with a descriptive name

## Filter Conditions

- **Status**: Complete, abandoned, etc.
- **URL Parameters**: Source tracking tags
- **Question Responses**: Specific survey answers
- **Categories Created**: For card sorts
- **Time Taken**: Duration ranges

## Comparing Segments

Once created, apply segments to:
- View filtered participant lists
- Compare analysis metrics between groups
- Export segment-specific data

## Example Use Cases

- Compare novice vs. expert users
- Analyze by traffic source (email vs. social)
- Filter by demographic responses
- Isolate specific time periods

## Best Practices

- Create segments before deep analysis
- Use descriptive names
- Document segment criteria
- Compare 2-3 segments at a time for clarity',
  'Analysis',
  ARRAY['segments', 'filtering', 'comparison'],
  ARRAY['results.participants', 'results.analysis'],
  65
);
