'use client';
import { useEffect, useState } from 'react';
import {
  Plus,
  Calculator,
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
  Edit,
  Hash,
  Tags,
  BarChart,
} from 'lucide-react';
import { Button } from '@veritio/ui/components/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@veritio/ui/components/collapsible';
import { Badge } from '@veritio/ui/components/badge';
import { useSurveyRulesStore, useVariables } from '@veritio/prototype-test/stores';
import { VariableEditorDialog } from './variable-editor-dialog';
import type { StudyFlowQuestion } from '@veritio/prototype-test/lib/supabase/study-flow-types';
import type { SurveyVariable, VariableType } from '@veritio/prototype-test/lib/supabase/survey-rules-types';

interface VariablesPanelProps {
  studyId: string;
  questions: StudyFlowQuestion[];
}

const VARIABLE_TYPE_ICONS: Record<VariableType, React.ReactNode> = {
  score: <Calculator className="h-4 w-4" />,
  classification: <Tags className="h-4 w-4" />,
  counter: <Hash className="h-4 w-4" />,
};

const VARIABLE_TYPE_LABELS: Record<VariableType, string> = {
  score: 'Score',
  classification: 'Classification',
  counter: 'Counter',
};

const VARIABLE_TYPE_COLORS: Record<VariableType, string> = {
  score: 'bg-muted text-muted-foreground',
  classification: 'bg-muted text-muted-foreground',
  counter: 'bg-muted text-muted-foreground',
};

export function VariablesPanel({ studyId, questions }: VariablesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingVariableId, setEditingVariableId] = useState<string | null>(null);

  const variables = useVariables();
  const {
    isLoading,
    isSaving,
    error,
    loadVariables,
    deleteVariable,
  } = useSurveyRulesStore();

  // Load variables when panel opens
  useEffect(() => {
    if (isOpen && studyId) {
      loadVariables();
    }
  }, [isOpen, studyId, loadVariables]);

  const handleAddVariable = () => {
    setEditingVariableId(null);
    setIsEditorOpen(true);
  };

  const handleEditVariable = (variableId: string) => {
    setEditingVariableId(variableId);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingVariableId(null);
  };

  const handleDeleteVariable = async (variableId: string) => {
    if (confirm('Are you sure you want to delete this variable? Any rules using it will need to be updated.')) {
      await deleteVariable(variableId);
    }
  };

  const getVariableSummary = (variable: SurveyVariable): string => {
    const config = variable.config;

    if (config.type === 'score') {
      const qCount = config.questions.length;
      return `${qCount} question${qCount !== 1 ? 's' : ''} • ${config.aggregation}`;
    }

    if (config.type === 'classification') {
      const rCount = config.ranges.length;
      return `${rCount} range${rCount !== 1 ? 's' : ''} from ${config.sourceVariable}`;
    }

    if (config.type === 'counter') {
      const vCount = config.countValues.length;
      return `Counts ${vCount} value${vCount !== 1 ? 's' : ''}`;
    }

    return '';
  };

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <BarChart className="h-4 w-4" />
              <span className="font-medium">Score Variables</span>
              {variables.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {variables.length}
                </Badge>
              )}
            </Button>
          </CollapsibleTrigger>

          <Button variant="outline" size="sm" onClick={handleAddVariable} disabled={isSaving}>
            <Plus className="mr-1 h-3 w-3" />
            Add Variable
          </Button>
        </div>

        <CollapsibleContent className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading variables...
            </div>
          ) : variables.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center">
              <Calculator className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">No variables yet</p>
              <p className="mt-1 text-xs text-gray-500">
                Create score variables to branch logic based on calculated values
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleAddVariable}>
                <Plus className="mr-1 h-3 w-3" />
                Create your first variable
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {variables.map((variable: any) => (
                <div
                  key={variable.id}
                  className="flex items-center justify-between rounded-lg border bg-white p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-md p-2 ${VARIABLE_TYPE_COLORS[variable.variable_type as VariableType]}`}>
                      {VARIABLE_TYPE_ICONS[variable.variable_type as VariableType]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{variable.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {VARIABLE_TYPE_LABELS[variable.variable_type as VariableType]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {variable.description || getVariableSummary(variable)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditVariable(variable.id)}
                      disabled={isSaving}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteVariable(variable.id)}
                      disabled={isSaving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-2 text-sm text-red-600">Error: {error}</p>
          )}

          {/* Info box about using variables */}
          {variables.length > 0 && (
            <div className="mt-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Using Variables in Rules</p>
              <p className="mt-1">
                Reference these variables in rule conditions using the &quot;Variable&quot; source type,
                then compare against values using operators like equals, greater than, etc.
              </p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Variable Editor Dialog */}
      <VariableEditorDialog
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        variableId={editingVariableId}
        studyId={studyId}
        questions={questions}
        existingVariables={variables}
      />
    </div>
  );
}
