/**
 * STRICT WHITELIST: Only these tools are accessible to users
 * No other tools from these toolkits will be available
 */
export const ALLOWED_COMPOSIO_TOOLS = [
  // Messaging
  'SLACK_SEND_MESSAGE',
  'TEAMS_SEND_MESSAGE_TO_CHANNEL',

  // Email
  'GMAIL_SEND_EMAIL',
  'OUTLOOK_SEND_EMAIL',

  // Project Management
  'JIRA_CREATE_ISSUE',
  'LINEAR_CREATE_ISSUE',
  'ASANA_CREATE_TASK',

  // Documentation
  'NOTION_CREATE_PAGE',
  'CONFLUENCE_CREATE_PAGE',
  'GOOGLEDOCS_CREATE_DOCUMENT',

  // Spreadsheets
  'GOOGLESHEETS_CREATE_SPREADSHEET',
  'GOOGLESHEETS_BATCH_UPDATE',
  'AIRTABLE_CREATE_RECORD',

  // File Storage
  'GOOGLEDRIVE_UPLOAD_FILE',

  // Calendar
  'GOOGLECALENDAR_CREATE_EVENT',
  'OUTLOOKCALENDAR_CREATE_EVENT',

  // Video Conferencing
  'ZOOM_CREATE_MEETING',
  'GOOGLEMEET_CREATE_MEETING',

  // CRM & Support
  'HUBSPOT_GET_CONTACTS',
  'HUBSPOT_SEARCH_CONTACTS',
  'INTERCOM_SEND_MESSAGE',

  // Design
  'FIGMA_GET_FILE',
] as const;

export type AllowedComposioTool = typeof ALLOWED_COMPOSIO_TOOLS[number];

/**
 * Tool descriptions for UI display
 */
export const TOOL_DESCRIPTIONS: Record<string, { category: string; description: string }> = {
  // Messaging
  'SLACK_SEND_MESSAGE': {
    category: 'Messaging',
    description: 'Post the card sort results summary to #ux-research',
  },
  'TEAMS_SEND_MESSAGE_TO_CHANNEL': {
    category: 'Messaging',
    description: 'Share this study report in the Design team channel',
  },

  // Email
  'GMAIL_SEND_EMAIL': {
    category: 'Email',
    description: 'Email the study invitation to these 10 participants',
  },
  'OUTLOOK_SEND_EMAIL': {
    category: 'Email',
    description: 'Send the usability test report to the stakeholder list',
  },

  // Project Management
  'JIRA_CREATE_ISSUE': {
    category: 'Project Management',
    description: 'Create a bug ticket: Users can\'t find the search icon — from tree test',
  },
  'LINEAR_CREATE_ISSUE': {
    category: 'Project Management',
    description: 'Log this finding as a Linear issue tagged UX-Research',
  },
  'ASANA_CREATE_TASK': {
    category: 'Project Management',
    description: 'Create a task: Follow up on prototype test — assign to Priya, due Friday',
  },

  // Documentation
  'NOTION_CREATE_PAGE': {
    category: 'Documentation',
    description: 'Add this insight to our Research Findings database in Notion',
  },
  'CONFLUENCE_CREATE_PAGE': {
    category: 'Documentation',
    description: 'Create a new research report page under the UX Research space',
  },
  'GOOGLEDOCS_CREATE_DOCUMENT': {
    category: 'Documentation',
    description: 'Create a new Google Doc with the interview script template',
  },

  // Spreadsheets
  'GOOGLESHEETS_CREATE_SPREADSHEET': {
    category: 'Spreadsheets',
    description: 'Export the tree test results to a new Google Sheet',
  },
  'GOOGLESHEETS_BATCH_UPDATE': {
    category: 'Spreadsheets',
    description: 'Update Google Sheet with new data',
  },
  'AIRTABLE_CREATE_RECORD': {
    category: 'Spreadsheets',
    description: 'Add this participant to the Research Panel base with tags',
  },

  // File Storage
  'GOOGLEDRIVE_UPLOAD_FILE': {
    category: 'File Storage',
    description: 'Upload the session recording to the Q1 Research folder',
  },

  // Calendar
  'GOOGLECALENDAR_CREATE_EVENT': {
    category: 'Calendar',
    description: 'Schedule a moderated session with Ravi on Thursday 3-4 PM',
  },
  'OUTLOOKCALENDAR_CREATE_EVENT': {
    category: 'Calendar',
    description: 'Block 2 hours tomorrow for research synthesis',
  },

  // Video
  'ZOOM_CREATE_MEETING': {
    category: 'Video',
    description: 'Create a Zoom meeting for tomorrow\'s prototype test session',
  },
  'GOOGLEMEET_CREATE_MEETING': {
    category: 'Video',
    description: 'Set up a Google Meet for the participant interview at 2 PM',
  },

  // CRM
  'HUBSPOT_GET_CONTACTS': {
    category: 'CRM',
    description: 'Pull the list of enterprise users who signed up last month for recruitment',
  },
  'HUBSPOT_SEARCH_CONTACTS': {
    category: 'CRM',
    description: 'Search for contacts matching recruitment criteria',
  },
  'INTERCOM_SEND_MESSAGE': {
    category: 'CRM / Support',
    description: 'Send an in-app message to users who used feature X asking to join a study',
  },

  // Design
  'FIGMA_GET_FILE': {
    category: 'Design',
    description: 'Get the link to the latest prototype in our Checkout Redesign project',
  },
};

/**
 * Static toolkit metadata for the integrations page.
 * Avoids slow external Composio API calls — these are the only toolkits we allow anyway.
 * Logos use Composio's public CDN.
 */
export interface AllowedToolkitInfo {
  slug: string
  name: string
  description: string
  logo: string
  categories: string[]
}

export const ALLOWED_TOOLKIT_META: AllowedToolkitInfo[] = [
  // Messaging
  { slug: 'slack', name: 'Slack', description: 'Send messages to Slack channels', logo: 'https://logos.composio.dev/api/slack', categories: ['Messaging'] },
  { slug: 'teams', name: 'Microsoft Teams', description: 'Send messages to Teams channels', logo: 'https://logos.composio.dev/api/teams', categories: ['Messaging'] },
  // Email
  { slug: 'gmail', name: 'Gmail', description: 'Send emails via Gmail', logo: 'https://logos.composio.dev/api/gmail', categories: ['Email'] },
  { slug: 'outlook', name: 'Outlook', description: 'Send emails via Outlook', logo: 'https://logos.composio.dev/api/outlook', categories: ['Email'] },
  // Project Management
  { slug: 'jira', name: 'Jira', description: 'Create and manage Jira issues', logo: 'https://logos.composio.dev/api/jira', categories: ['Project Management'] },
  { slug: 'linear', name: 'Linear', description: 'Create and manage Linear issues', logo: 'https://logos.composio.dev/api/linear', categories: ['Project Management'] },
  { slug: 'asana', name: 'Asana', description: 'Create and manage Asana tasks', logo: 'https://logos.composio.dev/api/asana', categories: ['Project Management'] },
  // Documentation
  { slug: 'notion', name: 'Notion', description: 'Create pages in Notion', logo: 'https://logos.composio.dev/api/notion', categories: ['Documentation'] },
  { slug: 'confluence', name: 'Confluence', description: 'Create pages in Confluence', logo: 'https://logos.composio.dev/api/confluence', categories: ['Documentation'] },
  { slug: 'googledocs', name: 'Google Docs', description: 'Create Google Docs documents', logo: 'https://logos.composio.dev/api/googledocs', categories: ['Documentation'] },
  // Spreadsheets
  { slug: 'googlesheets', name: 'Google Sheets', description: 'Create and update Google Sheets', logo: 'https://logos.composio.dev/api/googlesheets', categories: ['Spreadsheets'] },
  { slug: 'airtable', name: 'Airtable', description: 'Create records in Airtable bases', logo: 'https://logos.composio.dev/api/airtable', categories: ['Spreadsheets'] },
  // File Storage
  { slug: 'googledrive', name: 'Google Drive', description: 'Upload files to Google Drive', logo: 'https://logos.composio.dev/api/googledrive', categories: ['Storage'] },
  // Calendar
  { slug: 'googlecalendar', name: 'Google Calendar', description: 'Create calendar events', logo: 'https://logos.composio.dev/api/googlecalendar', categories: ['Calendar'] },
  { slug: 'outlookcalendar', name: 'Outlook Calendar', description: 'Create Outlook calendar events', logo: 'https://logos.composio.dev/api/outlookcalendar', categories: ['Calendar'] },
  // Video
  { slug: 'zoom', name: 'Zoom', description: 'Create Zoom meetings', logo: 'https://logos.composio.dev/api/zoom', categories: ['Video'] },
  { slug: 'googlemeet', name: 'Google Meet', description: 'Create Google Meet meetings', logo: 'https://logos.composio.dev/api/googlemeet', categories: ['Video'] },
  // CRM & Support
  { slug: 'hubspot', name: 'HubSpot', description: 'Search and manage HubSpot contacts', logo: 'https://logos.composio.dev/api/hubspot', categories: ['CRM'] },
  { slug: 'intercom', name: 'Intercom', description: 'Send in-app messages via Intercom', logo: 'https://logos.composio.dev/api/intercom', categories: ['CRM'] },
  // Design
  { slug: 'figma', name: 'Figma', description: 'Access Figma files and prototypes', logo: 'https://logos.composio.dev/api/figma', categories: ['Design'] },
]

/**
 * Get allowed toolkits filtered by search query. No external API call needed.
 */
export function getAllowedToolkits(search?: string): AllowedToolkitInfo[] {
  if (!search || search.trim().length === 0) return ALLOWED_TOOLKIT_META
  const q = search.trim().toLowerCase()
  return ALLOWED_TOOLKIT_META.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.slug.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q)
  )
}

/**
 * Check if a tool name is in the allowed list
 */
export function isAllowedTool(toolName: string): toolName is AllowedComposioTool {
  return ALLOWED_COMPOSIO_TOOLS.includes(toolName as AllowedComposioTool);
}

/**
 * Get tools grouped by category
 */
export function getToolsByCategory() {
  return ALLOWED_COMPOSIO_TOOLS.reduce((acc, toolName) => {
    const { category } = TOOL_DESCRIPTIONS[toolName] || { category: 'Other' };
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(toolName);
    return acc;
  }, {} as Record<string, AllowedComposioTool[]>);
}
