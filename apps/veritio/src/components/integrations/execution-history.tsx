'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Clock } from 'lucide-react';

interface ToolExecution {
  id: string;
  tool_name: string;
  arguments: Record<string, any>;
  result: any;
  successful: boolean;
  error: string | null;
  executed_at: string;
}

export function ExecutionHistory({ limit = 20 }: { limit?: number }) {
  const [executions, setExecutions] = useState<ToolExecution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/integrations/composio/executions?limit=${limit}`)
      .then((res) => res.json())
      .then((data) => {
        setExecutions(data.executions || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch execution history:', error);
        setLoading(false);
      });
  }, [limit]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No tool executions yet. Connect an integration and start automating!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {executions.map((execution) => (
        <Card key={execution.id} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-sm font-mono">{execution.tool_name}</code>
                {execution.successful ? (
                  <Badge variant="default" className="gap-1">
                    <Check className="w-3 h-3" />
                    Success
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <X className="w-3 h-3" />
                    Failed
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {new Date(execution.executed_at).toLocaleString()}
              </p>

              {execution.error && (
                <p className="text-xs text-destructive mt-2">{execution.error}</p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
