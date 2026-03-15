'use client';

import { ALLOWED_COMPOSIO_TOOLS, TOOL_DESCRIPTIONS, getToolsByCategory } from '@/lib/composio/allowed-tools';

export function AllowedToolsList() {
  const toolsByCategory = getToolsByCategory();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-2">Available Integrations</h3>
        <p className="text-sm text-muted-foreground">
          You can use these {ALLOWED_COMPOSIO_TOOLS.length} tools to automate your research workflow
        </p>
      </div>

      {Object.entries(toolsByCategory).map(([category, tools]) => (
        <div key={category}>
          <h4 className="text-sm font-medium mb-2">{category}</h4>
          <div className="space-y-2">
            {tools.map((toolName) => (
              <div key={toolName} className="text-sm border rounded-lg p-3">
                <div className="font-mono text-xs text-muted-foreground mb-1">
                  {toolName}
                </div>
                <div className="text-muted-foreground">
                  {TOOL_DESCRIPTIONS[toolName]?.description || toolName}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
