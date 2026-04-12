-- ================================================================
-- Migration: Comprehensive Knowledge Base Update
-- Description: Fix stale articles, add coverage for all 7 study types,
--              panel/CRM, recruit, settings, results, and create-with-AI pages
-- ================================================================

-- ================================================================
-- 1. Fix "Welcome to Optimal" → "Welcome to Veritio" (stale slug reference)
-- ================================================================
UPDATE knowledge_articles
SET
  title = 'Welcome to Veritio',
  slug = 'welcome-to-veritio',
  preview = 'Get started with the UX Research Platform. Learn how to create projects, run studies, and analyze results.',
  content = '# Welcome to Veritio

Veritio is a comprehensive UX research platform that helps you understand how users think about and navigate your content.

## What You Can Do

- **Card Sort Studies**: Discover how users naturally categorize your content
- **Tree Test Studies**: Validate your information architecture
- **Survey Studies**: Gather targeted feedback with customizable questionnaires
- **Prototype Testing**: Test Figma prototypes with real users
- **First Click Tests**: See where users click first on your designs
- **First Impression Tests**: Capture instant reactions to your designs
- **Live Website Tests**: Test real websites with task tracking, heatmaps, and session recordings

## Getting Started

1. **Create a Project**: Projects help organize related studies
2. **Add a Study**: Choose from 7 study types to match your research goals
3. **Configure Your Study**: Add content, customize the flow, and brand your study
4. **Launch & Share**: Get a shareable link for participants
5. **Analyze Results**: View insights, recordings, and export your data

## Quick Actions

- Use **Create with AI** to generate study configurations automatically
- Invite team members to collaborate in real time
- Browse the knowledge base for guides on each feature',
  contexts = ARRAY['dashboard', 'dashboard.projects', 'dashboard.studies', 'dashboard.archive'],
  priority = 100
WHERE slug IN ('welcome-to-optimal', 'welcome-to-veritio');

-- ================================================================
-- 2. FIRST CLICK TEST ARTICLES
-- ================================================================

-- First Click: Getting Started
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Getting Started with First Click Testing',
  'getting-started-first-click',
  'Learn how to set up first click tests to discover where users instinctively click on your designs.',
  '# Getting Started with First Click Testing

First click testing reveals where users instinctively click when trying to complete a task on your design. Research shows that users who get their first click right are significantly more likely to complete the task successfully.

## When to Use First Click Tests

- **Validating button placement**: Are CTAs in the right spot?
- **Testing navigation labels**: Do users find the right menu item?
- **Comparing design alternatives**: Which layout drives better first clicks?
- **Evaluating page hierarchy**: Is the most important content getting attention?

## Setting Up Your Study

### 1. Prepare Your Designs
Upload screenshots or design mockups as images (PNG, JPG, or WebP).

### 2. Create Tasks
On the **Tasks** tab, create tasks that ask users where they would click:
- "Where would you click to view your order history?"
- "Find the settings menu"
- Keep instructions action-oriented and specific

### 3. Define Areas of Interest (AOI)
Draw rectangular regions on your images to mark correct click areas. These are used to calculate success rates.

### 4. Configure Study Flow
Add welcome screens, instructions, and post-task questions.

## Tips for Success

- **Use realistic screenshots** at actual resolution
- **Define clear success areas** that are generous but meaningful
- **Test 3-5 tasks** per design to keep sessions short
- **Include follow-up questions** asking why participants clicked where they did',
  'Getting Started',
  ARRAY['first-click', 'getting-started', 'click-testing'],
  ARRAY['first-click', 'first-click.details'],
  95
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- First Click: Tasks & AOI
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Creating First Click Tasks & Areas of Interest',
  'first-click-tasks-aoi',
  'Learn how to create tasks with images and define click target areas for measuring accuracy.',
  '# Creating First Click Tasks & Areas of Interest

## Adding Tasks

Each task presents an image and asks participants where they would click to accomplish a goal.

### Task Components
- **Image**: Upload a screenshot or design mockup
- **Task instruction**: What should the user try to do?
- **Areas of Interest (AOI)**: Regions marking correct click areas

### Writing Good Instructions
- Be specific: "Where would you click to change your password?"
- Use natural language, not UI labels
- Focus on user goals, not interface elements

## Areas of Interest (AOI)

AOIs are rectangular regions you draw on your image to define "correct" click zones.

### Drawing AOIs
1. Click **Add AOI** on your task image
2. Click and drag to draw a rectangle over the target area
3. Name the AOI (e.g., "Settings Button", "Navigation Menu")
4. Add multiple AOIs if several locations are acceptable

### AOI Best Practices
- **Be generous**: Include some padding around interactive elements
- **Multiple valid areas**: If several clicks could work, add multiple AOIs
- **Name descriptively**: AOI names appear in analysis results
- **Cover the full target**: Include the entire clickable area, not just the label

## Task Settings

- **Randomize tasks**: Shuffle task order across participants
- **Time limit**: Optional per-task time limit
- **Image scaling**: Control how images display on different screen sizes',
  'First Click',
  ARRAY['first-click', 'tasks', 'aoi', 'areas-of-interest'],
  ARRAY['first-click.first-click-tasks', 'builder.first-click-tasks'],
  90
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- First Click: Results Analysis
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Analyzing First Click Results',
  'first-click-results-analysis',
  'Understand click distributions, heatmaps, and success metrics from your first click tests.',
  '# Analyzing First Click Results

## Key Metrics

### Click Accuracy
Percentage of participants who clicked within an Area of Interest (AOI). Higher accuracy means the design effectively guides users.

### Time to First Click
How long participants took before clicking. Faster clicks suggest more intuitive design.

### Click Distribution
Where all participants clicked, shown as individual dots or aggregated patterns.

## Visualization Tools

### Click Maps
View individual click positions overlaid on your design. Filter by:
- Correct vs incorrect clicks
- Time ranges
- Participant segments

### Heatmaps
Aggregated click density visualization showing hot spots where most users clicked. Red = high density, blue = low density.

### Cluster Analysis
Automatically groups nearby clicks into clusters to identify distinct click patterns.

## Interpreting Results

### High Accuracy + Fast Time
Design element is well-placed and clearly communicates its purpose.

### High Accuracy + Slow Time
Users eventually find it but hesitate. Consider making the element more prominent.

### Low Accuracy + Scattered Clicks
Users are confused about where to click. The design needs clearer visual hierarchy.

### Low Accuracy + Concentrated Wrong Area
Users are drawn to a competing element. Review visual prominence and labeling.

## Tips
- Compare results across tasks to identify systemic design issues
- Use segments to see if different user groups behave differently
- Export click coordinates for detailed statistical analysis',
  'Analysis',
  ARRAY['first-click', 'analysis', 'heatmaps', 'click-maps'],
  ARRAY['first-click', 'results', 'results.analysis'],
  80
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 3. FIRST IMPRESSION TEST ARTICLES
-- ================================================================

-- First Impression: Getting Started
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Getting Started with First Impression Testing',
  'getting-started-first-impression',
  'Learn how to capture users'' instant reactions to your designs with timed exposure tests.',
  '# Getting Started with First Impression Testing

First impression testing (also called 5-second testing) captures users'' immediate reactions after briefly viewing a design. This reveals what stands out, what users remember, and their gut feelings about your design.

## When to Use First Impression Tests

- **Testing brand perception**: Does the design convey the right message?
- **Evaluating visual hierarchy**: What do users notice first?
- **Comparing design concepts**: Which option makes a stronger impression?
- **Validating messaging**: Do users understand the key value proposition?

## Setting Up Your Study

### 1. Upload Your Designs
On the **Designs** tab, upload images of the designs you want to test. You can test single or multiple designs.

### 2. Configure Exposure Time
Set how long participants see each design (typically 5 seconds). Shorter times test gut reactions; longer times allow more processing.

### 3. Add Follow-up Questions
After viewing, participants answer questions about what they remember, how they felt, and what they understood.

### 4. Set Weight Distribution
When testing multiple designs, control what percentage of participants see each variant.

## Tips for Success

- **5 seconds is the standard** for impression testing, but adjust based on design complexity
- **Ask open-ended questions** like "What do you remember?" and "What is this page about?"
- **Include rating scales** for attributes like trustworthiness, professionalism, clarity
- **Test with clean screenshots** without browser chrome or distracting elements',
  'Getting Started',
  ARRAY['first-impression', 'getting-started', '5-second-test'],
  ARRAY['first-impression', 'first-impression.details'],
  95
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- First Impression: Managing Designs
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Managing First Impression Designs',
  'first-impression-designs',
  'Learn how to add designs, configure exposure settings, and set up variant weighting.',
  '# Managing First Impression Designs

## Adding Designs

On the **Designs** tab:
1. Click **Add Design** to upload an image
2. Supported formats: PNG, JPG, WebP
3. Use high-resolution images that represent your actual design

## Design Settings

### Exposure Time
How long each design is shown to participants:
- **3 seconds**: Very quick gut reaction
- **5 seconds**: Standard first impression (recommended)
- **10 seconds**: Allows more detail processing

### Design Questions
Add questions specific to each design:
- Open text: "What do you remember seeing?"
- Multiple choice: "What is this website about?"
- Rating scale: "How trustworthy does this look? (1-7)"

## Testing Multiple Designs

### Weight Distribution
Control what percentage of participants see each design variant:
- Equal weights (50/50) for A/B comparison
- Skew weights (70/30) when you have a preferred option
- The weight distribution bar shows the visual split

### Between-Subjects Design
Each participant sees only one design, preventing cross-contamination of impressions.

## Tips
- **Use consistent image sizes** across variants for fair comparison
- **Avoid text-heavy designs** at short exposure times
- **Include a control variant** when testing changes to an existing design
- **Preview your study** to verify timing and question flow',
  'First Impression',
  ARRAY['first-impression', 'designs', 'variants'],
  ARRAY['first-impression.first-impression-designs', 'builder.first-impression-designs'],
  90
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- First Impression: Results
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Analyzing First Impression Results',
  'first-impression-results-analysis',
  'Interpret word clouds, response patterns, and variant comparisons from first impression tests.',
  '# Analyzing First Impression Results

## Analysis Views

### Response Analysis
View individual responses organized by question. See what participants wrote, selected, or rated after viewing your design.

### Word Cloud
Visualize the most common words participants used to describe your design. Larger words appeared more frequently.

**How to read it:**
- Dominant words reveal what users noticed most
- Unexpected words may indicate misperceptions
- Compare word clouds between variants to spot differences

### Variant Comparison
Side-by-side comparison of results across design variants:
- Compare average ratings
- Compare response distributions
- Statistical significance indicators

### AI Insights
AI-generated analysis summarizing key themes, sentiment patterns, and actionable recommendations from participant responses.

## Key Metrics

### Recall Accuracy
What percentage of participants correctly identified the purpose or key elements of the design.

### Sentiment Distribution
Breakdown of positive, neutral, and negative reactions.

### Attribute Ratings
Average scores for attributes like trustworthiness, clarity, professionalism, and appeal.

## Interpreting Results

### Strong Positive Impression
High recall + positive sentiment = design effectively communicates its purpose and appeals to users.

### Mixed Signals
Good recall but mixed sentiment = users understand it but have reservations about aesthetics or trust.

### Poor Recall
Low recall across participants = design lacks clear focal points or hierarchy.

## Tips
- Focus on **what users remember** more than what they rate
- Look for **unexpected associations** in open text responses
- Use the comparison view to make **data-driven design decisions**
- Export results for stakeholder presentations',
  'Analysis',
  ARRAY['first-impression', 'analysis', 'word-cloud', 'comparison'],
  ARRAY['first-impression', 'results', 'results.analysis'],
  80
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 4. LIVE WEBSITE TEST ARTICLES
-- ================================================================

-- Live Website: Getting Started
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Getting Started with Live Website Testing',
  'getting-started-live-website',
  'Learn how to test real websites with task tracking, click maps, session recordings, and A/B variants.',
  '# Getting Started with Live Website Testing

Live website testing lets you observe real users interacting with your actual website or web application. Unlike prototype testing, participants interact with a live, fully functional site.

## What You Can Track

- **Task completion**: Can users accomplish specific goals?
- **Click heatmaps**: Where do users click on each page?
- **Session recordings**: Full replay of user sessions (via rrweb)
- **Navigation paths**: How users move through your site
- **Custom events**: Track specific interactions

## Setting Up Your Study

### 1. Configure Your Website
On the **Website** tab, enter your site URL and choose a tracking method:
- **Snippet**: Add a JavaScript tracking snippet to your site
- **Reverse Proxy**: Route traffic through Veritio''s proxy (no code changes needed)

### 2. Create Tasks
On the **Tasks** tab, define goals for participants:
- "Find and purchase a subscription plan"
- "Update your profile picture"
- Define success paths by recording the URL sequence

### 3. Configure Tracking
Choose what to track:
- Heatmaps and click tracking
- Session recording (rrweb)
- Custom event tracking

### 4. Set Up A/B Variants (Optional)
Test different versions of your site:
- Define variant URLs
- Set traffic distribution percentages
- Compare results between variants

## Tips for Success
- **Test on a staging environment** first to verify tracking works
- **Record success paths** yourself before launching
- **Keep sessions under 15 minutes** to maintain engagement
- **Enable session recording** for the richest qualitative data',
  'Getting Started',
  ARRAY['live-website', 'getting-started', 'web-testing'],
  ARRAY['live-website', 'live-website.details'],
  95
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Live Website: Website Setup & Tasks
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Setting Up Website & Tasks',
  'live-website-setup-tasks',
  'Configure your target website URL, tracking method, and create tasks with success paths.',
  '# Setting Up Website & Tasks

## Website Configuration

### Entering Your URL
On the **Website** tab, enter the full URL of your site (including https://).

### Tracking Methods

#### JavaScript Snippet
Add a small tracking script to your website:
- Copy the provided snippet
- Paste it before the closing `</body>` tag
- Works with any website you control

#### Reverse Proxy
Route traffic through Veritio without modifying your site:
- No code changes required
- Works with sites you don''t control
- May have compatibility limitations with some frameworks

## Creating Tasks

### Task Components
- **Title**: Short name ("Complete checkout flow")
- **Instruction**: What the participant should do
- **Success path**: The URL sequence that defines completion

### Recording Success Paths
1. Click **Record Path**
2. Navigate through your site as a user would
3. Each page you visit is captured as a step
4. The path becomes the success criteria

### Task Types
- **Sequential**: Participants must complete tasks in order
- **Free exploration**: Participants choose which tasks to attempt

## Tips
- Start tasks from a specific page, not the homepage
- Define multiple valid success paths when applicable
- Test all paths yourself before launching',
  'Live Website',
  ARRAY['live-website', 'setup', 'tasks', 'tracking'],
  ARRAY['live-website.live-website-setup', 'live-website.live-website-tasks', 'builder.live-website-setup', 'builder.live-website-tasks'],
  90
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Live Website: Tracking & AB Variants
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Tracking Modes & A/B Variants',
  'live-website-tracking-ab',
  'Configure heatmap tracking, session recordings, and set up A/B variant testing.',
  '# Tracking Modes & A/B Variants

## Tracking Modes

### Click Heatmaps
Records every click position on each page. Generates:
- Heatmap overlays showing click density
- Individual click dot maps
- Click counts per element

### Session Recording
Full session replay using rrweb technology:
- Records DOM changes, mouse movements, and scrolling
- Privacy-safe: masks sensitive input fields
- Replay sessions at different speeds
- Skip idle time automatically

### Event Tracking
Track custom interactions:
- Form submissions
- Button clicks
- Page scrolls
- Custom JavaScript events

## A/B Variant Testing

### Setting Up Variants
1. Click **Add Variant** on the Website tab
2. Enter the URL for each variant
3. Set traffic distribution percentages (e.g., 50/50)

### Per-Variant Configuration
Each variant can have its own:
- Starting URL
- Task definitions
- Success paths

### Variant Comparison
After collecting data, compare variants on:
- Task success rates
- Time on task
- Navigation efficiency
- Click patterns

## Tips
- **Enable all tracking modes** for the most comprehensive data
- **Test recording on staging** to verify it captures correctly
- **Equal variant splits** give the most statistically valid comparisons
- **Minimum 30 participants per variant** for meaningful results',
  'Live Website',
  ARRAY['live-website', 'tracking', 'ab-testing', 'heatmaps', 'recording'],
  ARRAY['live-website.live-website-setup', 'live-website.live-website-tasks'],
  85
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Live Website: Results
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Analyzing Live Website Results',
  'live-website-results-analysis',
  'Explore session recordings, navigation paths, click maps, and variant comparisons from live website tests.',
  '# Analyzing Live Website Results

## Analysis Views

### Task Results
Per-task breakdown showing:
- Success rate and completion time
- Path efficiency (direct vs detoured)
- Common failure points

### Navigation Paths
Sankey-style flow diagram showing how users moved through your site:
- Page-to-page transitions with participant counts
- Common paths highlighted
- Drop-off points identified

### Click Maps
Heatmap overlays on screenshots of your site pages:
- Configurable gradient colors and opacity
- Filter by task, variant, or participant segment
- Toggle between heatmap and individual dots

### Session Replay
Full replay of individual participant sessions:
- Play, pause, and scrub through recordings
- Speed controls (1x, 2x, 4x, 8x)
- Skip idle periods automatically
- See mouse movements, clicks, and scrolling

### Events Explorer
Detailed log of tracked events:
- Filter by event type, page, or participant
- Timeline view of event sequence
- Export raw event data

### Attention Maps
Visual representation of where users spend the most time looking or interacting.

### Variant Comparison
Side-by-side metrics for A/B testing:
- Task success rates per variant
- Completion time comparison
- Statistical significance indicators

## Tips
- Watch **session replays** for qualitative insights before diving into quantitative data
- Use **navigation paths** to identify the most common user journeys
- Combine **click maps** with **task results** to understand why users fail
- Filter by **segments** to see if different user groups behave differently',
  'Analysis',
  ARRAY['live-website', 'analysis', 'session-replay', 'navigation-paths'],
  ARRAY['live-website', 'results', 'results.analysis'],
  80
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 5. PANEL / CRM ARTICLES
-- ================================================================

-- Panel: Overview
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Managing Your Participant Panel',
  'managing-participant-panel',
  'Build and manage a reusable participant panel for recruiting across multiple studies.',
  '# Managing Your Participant Panel

The participant panel is your CRM for research participants. Build a pool of users you can invite to future studies, track their participation history, and manage incentives.

## Panel Overview

Your panel dashboard shows:
- Total participants and active count
- Recent signups and participation rates
- Segment distribution
- Incentive status

## Adding Participants

### Manual Entry
Add individual participants with name and email.

### Bulk Import
Import from CSV with columns for name, email, and custom attributes.

### Self-Registration Widget
Embed a signup widget on your site to let users join your panel organically.

### From Study Responses
Participants who provide their email during a study can be automatically added.

## Participant Profiles

Each participant profile shows:
- Contact information
- Study participation history
- Segment memberships
- Incentive history
- Custom attributes and tags

## Best Practices
- **Keep profiles updated** with relevant attributes for targeting
- **Tag participants** by expertise, demographics, or product usage
- **Track participation frequency** to avoid over-surveying individuals
- **Respect opt-out requests** promptly',
  'Features',
  ARRAY['panel', 'crm', 'participants', 'recruitment'],
  ARRAY['panel', 'panel.participants'],
  85
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Panel: Segments
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Creating Participant Segments',
  'panel-segments',
  'Organize your participant panel into segments for targeted study recruitment.',
  '# Creating Participant Segments

Segments let you group participants by shared characteristics for targeted recruitment.

## Creating a Segment

1. Go to **Panel > Segments**
2. Click **Create Segment**
3. Define filter conditions
4. Name your segment descriptively

## Filter Conditions

- **Demographics**: Age range, location, language
- **Custom attributes**: Job role, product usage, experience level
- **Participation history**: Number of studies completed, last active date
- **Tags**: Custom tags you have applied to participants
- **Study responses**: Answers from previous studies

## Using Segments

### For Recruitment
Select a segment when sending study invitations to target the right audience.

### For Analysis
Apply segments to study results to compare how different groups responded.

### Dynamic vs Static
- **Dynamic segments**: Automatically update as participant data changes
- **Static segments**: Fixed list of participants, doesn''t change

## Tips
- Create segments for your most common target audiences
- Combine multiple conditions for precise targeting
- Review segment sizes before sending invitations
- Keep segment names clear and descriptive',
  'Features',
  ARRAY['panel', 'segments', 'targeting', 'recruitment'],
  ARRAY['panel', 'panel.segments'],
  80
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Panel: Links, Widget & Incentives
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Panel Links, Widget & Incentives',
  'panel-links-widget-incentives',
  'Set up recruitment links, embed signup widgets, and manage participant incentives.',
  '# Panel Links, Widget & Incentives

## Recruitment Links

Generate shareable links to invite participants to join your panel:
- Unique link per recruitment campaign
- Track signups by source
- Set link expiration dates

### Link Tracking
Add UTM parameters to track which channels drive signups:
- `?utm_source=email` for newsletters
- `?utm_source=social` for social media posts

## Signup Widget

Embed a customizable widget on your website:
1. Go to **Panel > Widget**
2. Customize appearance (colors, fields)
3. Copy the embed code
4. Paste on your site

### Widget Configuration
- Choose which fields to display (name, email, custom fields)
- Set required vs optional fields
- Add custom screening questions
- Match your brand colors

## Incentives

Manage rewards for study participation:

### Incentive Types
- Gift cards
- Cash payments
- Points/credits
- Custom rewards

### Tracking
- View pending and completed payments
- Export incentive reports
- Track spending per study

## Tips
- **Use unique links** per recruitment channel for attribution
- **Keep the widget simple** with minimal required fields
- **Fulfill incentives promptly** to maintain participant trust
- **Set clear expectations** about incentive amounts and timing',
  'Features',
  ARRAY['panel', 'links', 'widget', 'incentives'],
  ARRAY['panel.links', 'panel.widget', 'panel.incentives'],
  75
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 6. RECRUIT PAGE ARTICLES
-- ================================================================

-- Recruit: Main Guide
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Recruiting Participants for Your Study',
  'recruiting-participants',
  'Learn how to share your study and recruit the right participants using links, panel invitations, and widgets.',
  '# Recruiting Participants for Your Study

The Recruit page is your distribution hub for getting participants into your study.

## Sharing Your Study

### Study Link
Copy your unique study URL to share directly. The URL uses your study code (e.g., `yourdomain.com/s/abc123`).

### QR Code
Generate a QR code for in-person recruitment at events, offices, or printed materials.

### Email Invitations
Send invitations directly from your panel:
1. Select a participant segment
2. Customize the email template
3. Track open and completion rates

### Embed Widget
Add a study widget to your website:
- Floating button that opens the study
- Inline embed in a specific page section

## Distribution Settings

Access via the settings panel (gear icon):
- **Redirect URLs**: Where to send participants after completion
- **UTM Tracking**: Add source parameters for attribution
- **Incentive Configuration**: Set up rewards for completion
- **Custom Parameters**: Pass metadata via URL params

## Time Estimate

The recruit page shows an estimated completion time based on your study configuration (number of tasks, questions, etc.).

## Tips
- **Test your study** before sharing widely
- **Send a pilot batch** to 3-5 people first
- **Include context** about the study purpose when sharing
- **Monitor early responses** for issues',
  'Features',
  ARRAY['recruit', 'sharing', 'distribution', 'participants'],
  ARRAY['recruit'],
  90
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Recruit: Distribution Settings
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Distribution Settings & UTM Tracking',
  'distribution-settings-utm',
  'Configure redirect URLs, UTM parameters, and incentives for your study distribution.',
  '# Distribution Settings & UTM Tracking

## Redirect URLs

### Completion Redirect
Send participants to a specific URL after they finish:
- Thank you page on your site
- Incentive claim page
- Back to your product

### Disqualification Redirect
Where to send screened-out participants:
- Generic thank you page
- Alternative survey

## UTM Tracking

Track where your participants come from:

### Standard Parameters
- `?utm_source=` — Where the traffic comes from (email, social, panel)
- `?utm_medium=` — The marketing medium (link, banner, qr)
- `?utm_campaign=` — Campaign name for grouping

### Viewing UTM Data
UTM parameters appear in your results under participant data. Use them to:
- Compare completion rates by source
- Identify highest-quality participant sources
- Calculate ROI per recruitment channel

## Incentive Configuration

Set up participant rewards:
- Define reward type and amount
- Set distribution method
- Track fulfillment status

## Custom URL Parameters

Pass any key-value pair via URL:
- `?userId=123` to link to your user database
- `?condition=A` for experiment conditions
- Access these in your results data

## Tips
- **Always set a completion redirect** for a professional experience
- **Use UTM consistently** across all distribution channels
- **Test redirect URLs** before launching',
  'Features',
  ARRAY['recruit', 'utm', 'tracking', 'distribution'],
  ARRAY['recruit'],
  80
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 7. SETTINGS ARTICLES
-- ================================================================

-- Settings: Profile & Account
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Account & Profile Settings',
  'account-profile-settings',
  'Manage your profile, account security, and connected services.',
  '# Account & Profile Settings

## Profile Settings

### Display Name & Avatar
- Update your name displayed across the platform
- Upload a profile avatar
- Changes reflect in real-time collaboration

### Notification Preferences
- Email notifications for study completions
- Alerts when studies reach response limits
- Team collaboration notifications

## Account Settings

### Password & Security
- Change your password
- Enable two-factor authentication
- View active sessions

### Connected Accounts
- Google sign-in
- GitHub authentication
- Other OAuth providers

### Danger Zone
- Delete your account (irreversible)
- Export all your data before deletion

## Tips
- **Use a recognizable avatar** for team collaboration
- **Enable 2FA** for added security
- **Review active sessions** periodically',
  'Settings',
  ARRAY['settings', 'profile', 'account', 'security'],
  ARRAY['settings', 'settings.profile', 'settings.account'],
  80
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Settings: Study Defaults & Integrations
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Study Defaults, Integrations & AI Models',
  'study-defaults-integrations',
  'Configure default study settings, connect third-party tools, and manage AI model preferences.',
  '# Study Defaults, Integrations & AI Models

## Study Defaults

### Default Branding
Set default branding that applies to all new studies:
- Logo
- Primary and background colors
- Theme preset

### Default Language
Choose the default language for study UI text (buttons, instructions).

### Notification Defaults
Set default notification preferences for new studies.

## Integrations

Connect third-party tools to enhance your workflow:

### Slack Integration
- Get notified in Slack when participants complete studies
- Share results summaries to channels

### Webhook Integration
- Send study events to your own endpoints
- Integrate with Zapier, Make, or custom automation

### API Access
- Generate API keys for programmatic access
- Use the API to automate study creation and data retrieval

## AI Models

Configure AI-powered features:
- Choose which LLM powers AI insights and analysis
- Set API keys for your preferred provider
- Configure AI assistant behavior

## Team Settings

### Team Management
- Invite team members by email
- Assign roles: Admin, Editor, Viewer
- Remove members or change roles

### Team General Settings
- Team name and description
- Default project settings',
  'Settings',
  ARRAY['settings', 'integrations', 'ai', 'team'],
  ARRAY['settings', 'settings.study-defaults', 'settings.integrations', 'settings.ai-models', 'settings.team'],
  75
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 8. RESULTS DETAILED ARTICLES
-- ================================================================

-- Results: Overview Tab
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Understanding the Results Overview',
  'results-overview',
  'Navigate the results overview to see completion metrics, response trends, and study health indicators.',
  '# Understanding the Results Overview

The Overview tab gives you a high-level snapshot of your study''s performance and data quality.

## Key Metrics

### Completion Rate
Percentage of participants who finished the entire study. A healthy rate is above 70%.

### Total Responses
Number of completed, in-progress, and abandoned responses.

### Average Completion Time
How long participants typically take. Compare against your expected estimate.

### Response Trend
Chart showing responses over time. Useful for tracking recruitment momentum.

## Study Status

### Active
Study is live and accepting responses.

### Paused
Temporarily stopped. Existing link still works but shows a paused message.

### Completed
Study has reached its response limit or closing date.

## Quick Actions

From the overview you can:
- Pause or resume your study
- Copy the study link
- View recent participant responses
- Jump to detailed analysis

## Tips
- Check the overview **daily during active recruitment** to catch issues early
- A sudden drop in completion rate may indicate a study design problem
- High abandonment at a specific point suggests that section needs simplification',
  'Analysis',
  ARRAY['results', 'overview', 'metrics', 'completion'],
  ARRAY['results', 'results.overview'],
  85
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Results: Participants Tab
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Managing Participants & Responses',
  'results-participants-management',
  'Filter participants, manage segments, exclude responses, and understand status indicators.',
  '# Managing Participants & Responses

The Participants tab lets you review individual responses and manage your data quality.

## Participant List

Each row shows:
- **Status**: Completed, In Progress, Abandoned, Screened Out
- **Duration**: Time spent in the study
- **Date**: When they participated
- **Source**: UTM tracking data if available
- **Segment**: Applied segment tags

## Filtering & Sorting

### By Status
Filter to see only completed, in-progress, or abandoned responses.

### By Segment
Apply saved segments to compare groups.

### By Date Range
Focus on responses from a specific time period.

### By Source
Filter by UTM parameters to analyze recruitment channels.

## Managing Responses

### Excluding Participants
Mark suspicious or test responses as excluded:
- Excluded data is hidden from analysis
- Original data is preserved (exclusion is reversible)

### Identifying Test Responses
Look for: unusually fast completion times, your own IP address, or identical response patterns.

## Creating Segments

1. Define filter criteria
2. Save as a named segment
3. Apply to analysis views for group comparison

## Tips
- **Exclude test responses** before analyzing to keep data clean
- **Create segments early** so you can use them throughout analysis
- **Check for speeders** (participants who finish unusually fast)
- **Review abandoned responses** to identify problematic sections',
  'Analysis',
  ARRAY['results', 'participants', 'segments', 'filtering'],
  ARRAY['results', 'results.participants'],
  80
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Results: Questionnaire Tab
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Reviewing Questionnaire Responses',
  'results-questionnaire',
  'Analyze responses to pre-study, post-study, and screening questions across your study flow.',
  '# Reviewing Questionnaire Responses

The Questionnaire tab shows responses to all questions in your study flow (welcome, screening, pre-study, instructions, post-study, and thank you sections).

## Question Response Views

### Multiple Choice / Checkbox
- Bar charts showing response distribution
- Percentage breakdowns per option
- Filter by participant segment

### Likert Scale
- Mean, median, and distribution chart
- Compare across segments
- Track trends over time

### Open Text
- Individual response cards
- Search and filter responses
- Word frequency analysis

### Number
- Distribution histogram
- Mean, median, min, max statistics

## Filtering Responses

- By participant segment
- By completion status
- By specific answer to another question (cross-filtering)

## Tips
- **Cross-reference with main study data** for deeper insights
- **Read open text responses carefully** for unexpected themes
- **Compare pre vs post questions** to measure attitude changes
- **Export individual questions** for stakeholder reports',
  'Analysis',
  ARRAY['results', 'questionnaire', 'responses', 'questions'],
  ARRAY['results', 'results.questionnaire'],
  75
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Results: Recordings
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Viewing Session Recordings',
  'results-session-recordings',
  'Watch session replay recordings to see exactly how participants interacted with your study.',
  '# Viewing Session Recordings

Session recordings capture participants'' complete interactions, giving you qualitative context for your quantitative data.

## Available For

- Card Sort (drag-and-drop interactions)
- Tree Test (navigation paths)
- Prototype Test (Figma prototype clicks)
- First Click (click actions on images)
- Live Website Test (full site interaction via rrweb)

## Recording Player

### Playback Controls
- Play, pause, and scrub through the timeline
- Speed controls: 1x, 2x, 4x, 8x
- Skip idle periods automatically
- Frame-by-frame navigation

### What You See
- Mouse movements and clicks
- Scrolling behavior
- Form interactions
- Page transitions
- Task progress indicators

## Tips for Review

1. **Watch struggling participants first**: Sort by longest completion time
2. **Focus on failed tasks**: What did users do differently?
3. **Note hesitation points**: Where users paused before acting
4. **Share clips**: Share recording links with stakeholders for context

## Privacy

- Recordings do not capture keystrokes in password fields
- Sensitive form inputs are automatically masked
- Recordings are stored securely and accessible only to study owners',
  'Features',
  ARRAY['recordings', 'session-replay', 'playback'],
  ARRAY['results', 'results.recordings'],
  70
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Results: Reports & Downloads
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Reports & Data Export',
  'results-reports-downloads',
  'Generate PDF reports, export data to CSV/Excel, and share results with stakeholders.',
  '# Reports & Data Export

The Report tab provides tools for exporting your study data and generating shareable reports.

## Export Formats

### CSV
- Raw data in comma-separated format
- Compatible with Excel, Google Sheets, R, SPSS
- One file per data category (participants, responses, metrics)

### Excel
- Formatted workbook with multiple sheets
- Charts and summary statistics included
- Ready to share with stakeholders

### PDF Report
- Professional visual summary of key findings
- Includes charts, metrics, and highlighted insights
- Customizable: choose which sections to include

## What You Can Export

- **Participant data**: IDs, status, timestamps, demographics
- **Response data**: All answers, clicks, paths, and interactions
- **Analysis data**: Calculated metrics, scores, and aggregations
- **Visualizations**: Charts and diagrams as images

## Sharing Results

### Public Share Link
Generate a read-only link to share results with anyone:
- No login required
- Choose which tabs to expose
- Set link expiration

### Team Sharing
Team members with access can view results directly in the platform.

## Tips
- **Export early and often** for backup
- **Use PDF reports** for executive presentations
- **CSV exports** are best for further statistical analysis
- **Public links** are great for sharing with clients or stakeholders',
  'Features',
  ARRAY['reports', 'export', 'download', 'sharing'],
  ARRAY['results', 'results.report', 'results.downloads'],
  70
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 9. DETAILED ANALYSIS ARTICLES PER STUDY TYPE
-- ================================================================

-- Card Sort: Deep Dive
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Card Sort Analysis Deep Dive',
  'card-sort-analysis-deep-dive',
  'Master the similarity matrix, dendrogram, category agreement scores, and standardization tools.',
  '# Card Sort Analysis Deep Dive

## Analysis Sub-Tabs

### Cards Tab
View card-level analysis:
- **Similarity Matrix**: See how often each pair of cards was grouped together (darker = more similar)
- **Dendrogram**: Hierarchical tree showing natural card clusters
- Identify strong pairs (70%+), moderate pairs (40-70%), and weak pairs (below 40%)

### Categories Tab
Analyze participant-created categories:
- **Agreement Score**: How consistently participants grouped cards
- **Category Frequency**: Most common categories created
- **Standardization**: Merge similar category names (e.g., "Help" + "Support" → "Support")

### Pie Tree
Interactive tree visualization:
- Each node shows a pie chart of how cards were distributed across categories
- Drill down to see sub-categorization patterns
- Green = agreement, Red = disagreement

## Key Analysis Workflow

1. **Check the similarity matrix** for obvious clusters
2. **Review the dendrogram** to find natural groupings
3. **Standardize categories** if running an open sort
4. **Compare to your proposed IA** using the agreement scores
5. **Create segments** to see if different user groups categorize differently

## Tips
- Cut the dendrogram at different heights to explore different numbers of categories
- Standardize conservatively — only merge truly equivalent categories
- Look for "bridging" cards that appear in multiple clusters',
  'Analysis',
  ARRAY['card-sort', 'similarity-matrix', 'dendrogram', 'standardization'],
  ARRAY['card-sort', 'card-sort.results', 'results', 'results.analysis'],
  75
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Tree Test: Deep Dive
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Tree Test Analysis Deep Dive',
  'tree-test-analysis-deep-dive',
  'Analyze task success rates, navigation paths, directness scores, and the pie tree visualization.',
  '# Tree Test Analysis Deep Dive

## Analysis Sub-Tabs

### Tasks Tab
Per-task metrics showing:
- **Success Rate**: Percentage who found the correct answer
- **Directness Score**: Percentage who found it without backtracking
- **Average Time**: Mean time to complete the task
- **Score Breakdown**: Direct success / Indirect success / Failure / Skip

### Paths Tab
Detailed navigation path analysis:
- See the exact sequence of nodes each participant visited
- Identify common wrong turns
- Find "competitor" nodes that attract clicks away from the correct answer

### Pie Tree
Interactive visualization per task:
- Each node shows the percentage of users who selected it
- Green = correct path, Red = wrong path
- Click to drill into sub-trees
- Reveals exactly where users diverge

## Interpreting Metrics

| Success Rate | Directness | Interpretation |
|---|---|---|
| High (70%+) | High | Clear, intuitive navigation |
| High | Low | Users find it eventually but struggle |
| Low (< 50%) | Any | Significant findability problem |
| Medium | Low | Users are guessing |

## Analysis Workflow

1. Sort tasks by **success rate** (lowest first)
2. For failing tasks, review **navigation paths** to find where users go wrong
3. Use the **pie tree** to visualize decision points
4. Check if **competitor nodes** need relabeling
5. Compare across **segments** for different user groups',
  'Analysis',
  ARRAY['tree-test', 'analysis', 'success-rate', 'paths', 'pie-tree'],
  ARRAY['tree-test', 'tree-test.results', 'results', 'results.analysis'],
  75
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Prototype Test: Deep Dive
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Prototype Test Analysis Deep Dive',
  'prototype-test-analysis-deep-dive',
  'Analyze task success rates, user paths through Figma prototypes, and identify usability issues.',
  '# Prototype Test Analysis Deep Dive

## Key Metrics

### Task Success Rate
Percentage of participants who completed each task successfully, based on whether they reached a goal screen or followed the defined path.

### Directness Score
How closely users followed the optimal path:
- **Direct**: Followed the expected path exactly
- **Indirect**: Completed the task but with extra steps
- **Failed**: Never reached the goal

### Time on Task
Duration from task start to completion. Compare across tasks to identify difficult flows.

### Click Count
Number of interactions per task. Higher counts may indicate confusion or exploration.

## Path Analysis

### Path Visualization
See the exact sequence of frames each participant navigated:
- Correct frames highlighted in green
- Wrong turns marked in red
- Common detour points identified

### Drop-Off Analysis
Find where participants abandoned tasks:
- Which screen did they leave on?
- How many screens into the flow?
- Were they stuck on a dead end?

## Common Patterns

### Easy Task Indicators
- High success rate (80%+)
- Low click count
- Fast completion time
- Mostly direct paths

### Problem Indicators
- Low success rate (< 50%)
- High click count
- Long completion time
- Scattered paths with no dominant route

## Tips
- **Focus on failed tasks** for the biggest improvement opportunities
- **Watch recordings** of struggling participants for context
- **Compare intended vs actual paths** to find design mismatches
- **Test redesigns** with a follow-up study to validate improvements',
  'Analysis',
  ARRAY['prototype', 'analysis', 'paths', 'usability'],
  ARRAY['prototype', 'prototype.results', 'results', 'results.analysis'],
  75
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Survey: Deep Dive
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Survey Analysis Deep Dive',
  'survey-analysis-deep-dive',
  'Analyze survey responses with cross-tabulation, correlation analysis, and NPS scoring.',
  '# Survey Analysis Deep Dive

## Analysis Views

### Question Analysis
Per-question response breakdown:
- **Charts**: Bar charts, pie charts, or distribution graphs per question
- **Statistics**: Mean, median, mode for numeric/scale questions
- **Response table**: Individual text responses for open-ended questions

### Cross-Tabulation
Compare responses across different questions:
- Select a primary question and a comparison question
- View how answers to one question correlate with another
- Useful for segment-based analysis (e.g., satisfaction by user type)

### Correlation Analysis
Statistical relationships between questions:
- Identify which questions are correlated
- Discover unexpected relationships in your data
- Correlation strength indicators

### NPS Analysis
If you included an NPS (Net Promoter Score) question:
- Overall NPS score (-100 to +100)
- Distribution of Promoters (9-10), Passives (7-8), Detractors (0-6)
- Compare NPS across segments

## Response Quality

### Completion Patterns
- Which questions had the highest skip rates?
- Where did participants drop off?
- Average time per question

### Open Text Analysis
- Read through responses for common themes
- Use word frequency analysis
- AI-generated summaries of key themes

## Tips
- **Start with overall distributions** before drilling into cross-tabs
- **Compare NPS across segments** for actionable insights
- **Read open text responses** for context that numbers alone don''t provide
- **Export to CSV** for advanced statistical analysis in R or SPSS',
  'Analysis',
  ARRAY['survey', 'analysis', 'cross-tabulation', 'correlation', 'nps'],
  ARRAY['survey', 'survey.results', 'results', 'results.analysis'],
  75
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 10. CREATE WITH AI & COLLABORATION ARTICLES
-- ================================================================

-- Create with AI
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Creating Studies with AI',
  'creating-studies-with-ai',
  'Use AI to automatically generate study configurations, tasks, and questions from a description of your research goals.',
  '# Creating Studies with AI

The **Create with AI** feature uses artificial intelligence to generate complete study configurations from a description of your research goals.

## How It Works

1. Go to **Create with AI** from the dashboard
2. Describe your research goal in plain language
3. AI generates a complete study configuration including:
   - Study type recommendation
   - Tasks or questions
   - Study flow settings
   - Suggested participant count

## Example Prompts

- "I want to validate the navigation of our e-commerce site"
- "Create a survey to measure customer satisfaction with our new feature"
- "Test first impressions of our new landing page design"
- "Set up a card sort for our knowledge base articles"

## What Gets Generated

### Study Type
AI recommends the best study type for your goals (card sort, tree test, survey, etc.).

### Content
- Tasks with clear instructions
- Survey questions with appropriate types
- Cards or tree structures (for card sorts / tree tests)

### Study Flow
- Welcome screen text
- Instructions tailored to your study type
- Post-study questions

## After Generation

Review and edit the generated configuration:
- Modify tasks, questions, or content
- Adjust study flow sections
- Add branding and settings
- Preview before launching

## Tips
- **Be specific** in your description for better results
- **Include context** about your target audience
- **Review all generated content** before launching
- **Iterate**: regenerate sections you''re not happy with',
  'Features',
  ARRAY['ai', 'create', 'generation', 'automation'],
  ARRAY['create-with-ai'],
  85
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Team Collaboration
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Team Collaboration & Real-Time Editing',
  'team-collaboration',
  'Collaborate with your team in real time using shared cursors, comments, and role-based access.',
  '# Team Collaboration & Real-Time Editing

Veritio supports real-time collaboration so your team can work on studies together.

## Real-Time Editing

### Shared Cursors
See team members'' cursors in the builder as they edit. Changes sync instantly via CRDT (Yjs) technology.

### Simultaneous Editing
Multiple team members can edit the same study simultaneously:
- Builder tabs (details, content, tasks, etc.)
- Study flow sections
- Branding and settings

### Conflict-Free
Changes are automatically merged without conflicts using CRDT technology.

## Comments

### Adding Comments
Click the comments panel (speech bubble icon) in the floating action bar to:
- Leave feedback on specific sections
- Ask questions to teammates
- Track discussion threads

### Notifications
Get notified when teammates comment on your studies.

## Team Roles

### Admin
Full access to all features, settings, and team management.

### Editor
Can create and edit studies, view results, but cannot manage team settings.

### Viewer
Read-only access to studies and results.

## Inviting Team Members

1. Go to **Settings > Team**
2. Click **Invite Member**
3. Enter their email address
4. Choose their role
5. They receive an invitation link

## Tips
- **Use comments** instead of external chat for study-specific discussions
- **Assign roles appropriately** to protect sensitive data
- **Check the presence indicator** to see who''s currently viewing',
  'Features',
  ARRAY['collaboration', 'team', 'real-time', 'comments'],
  ARRAY['dashboard', 'settings', 'settings.team'],
  70
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 11. DASHBOARD ARTICLES
-- ================================================================

-- Dashboard: Managing Projects
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Managing Projects & Studies',
  'managing-projects-studies',
  'Organize your research with projects, manage study status, and use the archive for completed work.',
  '# Managing Projects & Studies

## Projects

Projects are containers for organizing related studies. Use them to group studies by initiative, product area, or time period.

### Creating a Project
1. Click **+ New** in the sidebar
2. Select **New Project**
3. Enter a name and optional description

### Project Organization Tips
- Group by research initiative or sprint
- Include dates in names for easy reference
- Use descriptions to document the project goal

## Studies

### Study Status
- **Draft**: Study is being configured, not yet live
- **Active**: Accepting participant responses
- **Paused**: Temporarily not accepting responses
- **Completed**: Finished collecting data

### Moving Studies
Drag studies between projects or use the context menu to move them.

### Duplicating Studies
Create a copy of an existing study to reuse its configuration.

## Archive

### Archiving Projects
Move completed projects to the archive to keep your dashboard clean:
- Archived projects are still accessible
- Results and data are preserved
- Restore from archive anytime

### Viewing Archives
Go to the **Archive** page from the sidebar to see all archived projects.

## Tips
- **Archive completed projects** regularly to reduce dashboard clutter
- **Use consistent naming** across projects for searchability
- **Add study type in the name** for quick identification',
  'Getting Started',
  ARRAY['projects', 'studies', 'dashboard', 'organization'],
  ARRAY['dashboard', 'dashboard.projects', 'dashboard.studies', 'dashboard.archive'],
  80
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 12. UPDATE EXISTING ARTICLES TO INCLUDE NEW STUDY TYPE CONTEXTS
-- ================================================================

-- Update study flow articles to include first-click, first-impression, live-website
UPDATE knowledge_articles
SET contexts = ARRAY[
  'card-sort.study-flow', 'tree-test.study-flow', 'survey.study-flow', 'prototype.study-flow',
  'first-click.study-flow', 'first-impression.study-flow', 'live-website.study-flow',
  'builder.study-flow', 'builder.study-flow.welcome', 'builder.study-flow.agreement',
  'builder.study-flow.screening', 'builder.study-flow.pre_study', 'builder.study-flow.instructions',
  'builder.study-flow.post_study', 'builder.study-flow.thank_you'
]
WHERE slug = 'customizing-study-flow';

-- Update screening questions for all study types
UPDATE knowledge_articles
SET contexts = ARRAY[
  'card-sort.study-flow.screening', 'tree-test.study-flow.screening',
  'survey.study-flow.screening', 'prototype.study-flow.screening',
  'first-click.study-flow.screening', 'first-impression.study-flow.screening',
  'live-website.study-flow.screening',
  'builder.study-flow.screening'
]
WHERE slug = 'creating-screening-questions';

-- Update branding article for all study types
UPDATE knowledge_articles
SET contexts = ARRAY[
  'card-sort.branding', 'tree-test.branding', 'survey.branding', 'prototype.branding',
  'first-click.branding', 'first-impression.branding', 'live-website.branding',
  'builder.branding'
]
WHERE slug = 'customizing-study-branding';

-- Update settings article for all study types
UPDATE knowledge_articles
SET contexts = ARRAY[
  'card-sort.settings', 'tree-test.settings', 'survey.settings', 'prototype.settings',
  'first-click.settings', 'first-impression.settings', 'live-website.settings',
  'builder.settings'
]
WHERE slug = 'study-settings-configuration';

-- Update welcome/instructions for all study types
UPDATE knowledge_articles
SET contexts = ARRAY[
  'prototype.study-flow', 'card-sort.study-flow', 'tree-test.study-flow', 'survey.study-flow',
  'first-click.study-flow', 'first-impression.study-flow', 'live-website.study-flow',
  'builder.study-flow', 'builder.study-flow.welcome', 'builder.study-flow.instructions'
]
WHERE slug = 'configuring-welcome-instructions';

-- Update pre/post study questions for all study types
UPDATE knowledge_articles
SET contexts = ARRAY[
  'prototype.study-flow', 'card-sort.study-flow', 'tree-test.study-flow', 'survey.study-flow',
  'first-click.study-flow', 'first-impression.study-flow', 'live-website.study-flow',
  'builder.study-flow', 'builder.study-flow.pre_study', 'builder.study-flow.post_study'
]
WHERE slug = 'adding-pre-post-study-questions';

-- Update configuring study settings for all study types
UPDATE knowledge_articles
SET contexts = ARRAY[
  'prototype.settings', 'card-sort.settings', 'tree-test.settings', 'survey.settings',
  'first-click.settings', 'first-impression.settings', 'live-website.settings',
  'builder.settings'
]
WHERE slug = 'configuring-study-settings';

-- Update branding guide for all study types
UPDATE knowledge_articles
SET contexts = ARRAY[
  'prototype.branding', 'card-sort.branding', 'tree-test.branding', 'survey.branding',
  'first-click.branding', 'first-impression.branding', 'live-website.branding',
  'builder.branding'
]
WHERE slug = 'customizing-study-branding-guide';

-- Update study details for all study types
UPDATE knowledge_articles
SET contexts = ARRAY[
  'prototype.details', 'card-sort.details', 'tree-test.details', 'survey.details',
  'first-click.details', 'first-impression.details', 'live-website.details',
  'builder.details', 'builder'
]
WHERE slug = 'setting-up-study-details';

-- Update sharing article for results + recruit contexts
UPDATE knowledge_articles
SET contexts = ARRAY['results', 'results.sharing', 'results.overview', 'recruit']
WHERE slug = 'sharing-your-study';

-- Update export article for results contexts
UPDATE knowledge_articles
SET contexts = ARRAY['results', 'results.downloads', 'results.overview', 'results.report']
WHERE slug = 'exporting-your-data';

-- Update participant status article
UPDATE knowledge_articles
SET contexts = ARRAY['results', 'results.participants', 'results.overview']
WHERE slug = 'understanding-participant-status';

-- Update segments article for results + panel
UPDATE knowledge_articles
SET contexts = ARRAY['results', 'results.participants', 'results.analysis', 'panel', 'panel.segments']
WHERE slug = 'using-segments-for-analysis';

-- ================================================================
-- 13. ADDITIONAL BUILDER ARTICLES FOR NEW STUDY TYPES
-- ================================================================

-- First Click: Getting Started Details
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Setting Up First Click Study Details',
  'first-click-study-details',
  'Configure basic information for your first click test including name, description, and project assignment.',
  '# Setting Up First Click Study Details

## Study Name
Choose a descriptive internal name for your first click test. Participants won''t see this.

**Good names:**
- "Homepage CTA Test - March 2026"
- "Settings Page Redesign Click Test"
- "Mobile Nav v2 First Click"

## Description
Add internal notes about:
- What design you''re testing and why
- Which version or iteration this is
- Key hypotheses you want to validate

## Study Type
First click tests present static images and ask participants to click where they would interact to complete a task.

**Best for:**
- Validating button and CTA placement
- Testing visual hierarchy
- Comparing design alternatives

## Next Steps
After setting up details, go to the **Tasks** tab to add images and define click tasks.',
  'First Click',
  ARRAY['first-click', 'details', 'setup'],
  ARRAY['first-click.details'],
  85
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- First Impression: Details
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Setting Up First Impression Study Details',
  'first-impression-study-details',
  'Configure basic information for your first impression (5-second) test.',
  '# Setting Up First Impression Study Details

## Study Name
Choose a descriptive internal name. Participants won''t see this.

**Good names:**
- "New Landing Page Impression Test"
- "Brand Refresh A/B Impression"
- "Mobile Onboarding Screen Test"

## Description
Document:
- Which designs you''re testing
- What impressions you hope to measure
- Target audience for the test

## Study Type
First impression tests briefly show a design, then ask participants about their immediate reactions and recall.

**Best for:**
- Brand perception testing
- Landing page evaluation
- Comparing design concepts
- Validating visual communication

## Next Steps
After setting up details, go to the **Designs** tab to upload your design images and configure exposure time.',
  'First Impression',
  ARRAY['first-impression', 'details', 'setup'],
  ARRAY['first-impression.details'],
  85
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- Live Website: Details
INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Setting Up Live Website Test Details',
  'live-website-study-details',
  'Configure basic information for your live website test.',
  '# Setting Up Live Website Test Details

## Study Name
Choose a descriptive internal name. Participants won''t see this.

**Good names:**
- "Checkout Flow Test - Production"
- "Navigation Redesign Live Test"
- "Search Feature A/B Test"

## Description
Document:
- Which website or web app you''re testing
- Specific user flows under investigation
- A/B variant details if applicable

## Study Type
Live website tests let participants interact with your actual website while tracking clicks, navigation paths, and session recordings.

**Best for:**
- Testing live production sites
- Task-based usability testing
- Gathering heatmaps and click data
- A/B variant comparison
- Session recording for qualitative analysis

## Next Steps
After setting up details, go to the **Website** tab to configure your target URL and tracking method.',
  'Live Website',
  ARRAY['live-website', 'details', 'setup'],
  ARRAY['live-website.details'],
  85
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;

-- ================================================================
-- 14. AI ASSISTANT ARTICLE (for results pages)
-- ================================================================

INSERT INTO knowledge_articles (title, slug, preview, content, category, tags, contexts, priority)
VALUES (
  'Using the AI Research Assistant',
  'ai-research-assistant',
  'Get AI-powered insights, summaries, and recommendations from your study results.',
  '# Using the AI Research Assistant

The AI Research Assistant (sparkles icon in the floating bar) helps you interpret your study results and generate insights.

## What It Can Do

### Summarize Results
Ask for a summary of your study findings and the AI will analyze response patterns, highlight key metrics, and surface notable trends.

### Answer Questions
Ask specific questions about your data:
- "What was the most common path for Task 3?"
- "Which cards had the lowest agreement scores?"
- "Summarize the open-text feedback"

### Generate Insights
Request actionable recommendations based on your data patterns.

### Compare Segments
Ask the AI to compare results between participant segments.

## How to Use

1. Click the **sparkles icon** in the floating action bar
2. Type your question or request
3. The AI analyzes your study data and responds
4. Follow up with additional questions

## Tips
- **Be specific** in your questions for more useful answers
- **Reference specific tasks or questions** by name
- **Ask for comparisons** between segments or time periods
- **Request actionable recommendations** not just descriptions',
  'Features',
  ARRAY['ai', 'assistant', 'insights', 'analysis'],
  ARRAY['results', 'results.analysis', 'results.overview'],
  65
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  contexts = EXCLUDED.contexts,
  priority = EXCLUDED.priority;
