import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { castJson, toJson } from '../lib/supabase/json-utils';
import type {
  SurveyRule,
  SurveyRuleInsert,
  SurveyRuleUpdate,
  SurveyVariable,
  SurveyVariableInsert,
  SurveyVariableUpdate,
  RuleConditions,
} from '../lib/supabase/survey-rules-types';

type SupabaseClientType = SupabaseClient<Database>;

export async function listSurveyRules(
  supabase: SupabaseClientType,
  studyId: string
): Promise<{ data: SurveyRule[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('survey_rules')
    .select('*')
    .eq('study_id', studyId)
    .order('position', { ascending: true });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

    const rules: SurveyRule[] = (data || []).map(transformRuleFromDb);

  return { data: rules, error: null };
}

export async function getSurveyRule(
  supabase: SupabaseClientType,
  ruleId: string,
  studyId: string
): Promise<{ data: SurveyRule | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('survey_rules')
    .select('*')
    .eq('id', ruleId)
    .eq('study_id', studyId)
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: transformRuleFromDb(data), error: null };
}

export async function createSurveyRule(
  supabase: SupabaseClientType,
  studyId: string,
  input: Omit<SurveyRuleInsert, 'study_id'>
): Promise<{ data: SurveyRule | null; error: Error | null }> {
  const { data: existing } = await supabase
    .from('survey_rules')
    .select('position')
    .eq('study_id', studyId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const insert = {
    study_id: studyId,
    name: input.name,
    description: input.description ?? null,
    position: input.position ?? nextPosition,
    is_enabled: input.is_enabled ?? true,
    conditions: toJson(input.conditions ?? { groups: [] }),
    action_type: input.action_type,
    action_config: toJson(input.action_config),
    trigger_type: input.trigger_type ?? 'on_answer',
    trigger_config: toJson(input.trigger_config ?? {}),
  };

  const { data, error } = await supabase
    .from('survey_rules')
    .insert(insert)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: transformRuleFromDb(data), error: null };
}

export async function updateSurveyRule(
  supabase: SupabaseClientType,
  ruleId: string,
  studyId: string,
  updates: SurveyRuleUpdate
): Promise<{ data: SurveyRule | null; error: Error | null }> {
  const updateData: Record<string, unknown> = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.position !== undefined) updateData.position = updates.position;
  if (updates.is_enabled !== undefined) updateData.is_enabled = updates.is_enabled;
  if (updates.conditions !== undefined) updateData.conditions = toJson(updates.conditions);
  if (updates.action_type !== undefined) updateData.action_type = updates.action_type;
  if (updates.action_config !== undefined) updateData.action_config = toJson(updates.action_config);
  if (updates.trigger_type !== undefined) updateData.trigger_type = updates.trigger_type;
  if (updates.trigger_config !== undefined) updateData.trigger_config = toJson(updates.trigger_config);

  const { data, error } = await supabase
    .from('survey_rules')
    .update(updateData)
    .eq('id', ruleId)
    .eq('study_id', studyId)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: transformRuleFromDb(data), error: null };
}

export async function deleteSurveyRule(
  supabase: SupabaseClientType,
  ruleId: string,
  studyId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await supabase
    .from('survey_rules')
    .delete()
    .eq('id', ruleId)
    .eq('study_id', studyId);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

export async function reorderSurveyRules(
  supabase: SupabaseClientType,
  studyId: string,
  orderedIds: string[]
): Promise<{ success: boolean; error: Error | null }> {
  const updates = orderedIds.map((id, index) => ({
    id,
    position: index,
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from('survey_rules')
      .update({ position: update.position })
      .eq('id', update.id)
      .eq('study_id', studyId);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }
  }

  return { success: true, error: null };
}

export async function duplicateSurveyRule(
  supabase: SupabaseClientType,
  ruleId: string,
  studyId: string
): Promise<{ data: SurveyRule | null; error: Error | null }> {
  const { data: original, error: getError } = await getSurveyRule(supabase, ruleId, studyId);
  if (getError || !original) {
    return { data: null, error: getError || new Error('Rule not found') };
  }

  return createSurveyRule(supabase, studyId, {
    name: `${original.name} (Copy)`,
    description: original.description,
    is_enabled: original.is_enabled,
    conditions: original.conditions,
    action_type: original.action_type,
    action_config: original.action_config,
    trigger_type: original.trigger_type,
    trigger_config: original.trigger_config,
  });
}

export async function listSurveyVariables(
  supabase: SupabaseClientType,
  studyId: string
): Promise<{ data: SurveyVariable[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('survey_variables')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: true });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const variables: SurveyVariable[] = (data || []).map(transformVariableFromDb);

  return { data: variables, error: null };
}

export async function getSurveyVariable(
  supabase: SupabaseClientType,
  variableId: string,
  studyId: string
): Promise<{ data: SurveyVariable | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('survey_variables')
    .select('*')
    .eq('id', variableId)
    .eq('study_id', studyId)
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: transformVariableFromDb(data), error: null };
}

export async function createSurveyVariable(
  supabase: SupabaseClientType,
  studyId: string,
  input: Omit<SurveyVariableInsert, 'study_id'>
): Promise<{ data: SurveyVariable | null; error: Error | null }> {
  const insert = {
    study_id: studyId,
    name: input.name,
    description: input.description ?? null,
    variable_type: input.variable_type,
    config: toJson(input.config),
  };

  const { data, error } = await supabase
    .from('survey_variables')
    .insert(insert)
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      return { data: null, error: new Error('A variable with this name already exists') };
    }
    return { data: null, error: new Error(error.message) };
  }

  return { data: transformVariableFromDb(data), error: null };
}

export async function updateSurveyVariable(
  supabase: SupabaseClientType,
  variableId: string,
  studyId: string,
  updates: SurveyVariableUpdate
): Promise<{ data: SurveyVariable | null; error: Error | null }> {
  const updateData: Record<string, unknown> = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.variable_type !== undefined) updateData.variable_type = updates.variable_type;
  if (updates.config !== undefined) updateData.config = toJson(updates.config);

  const { data, error } = await supabase
    .from('survey_variables')
    .update(updateData)
    .eq('id', variableId)
    .eq('study_id', studyId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: new Error('A variable with this name already exists') };
    }
    return { data: null, error: new Error(error.message) };
  }

  return { data: transformVariableFromDb(data), error: null };
}

export async function deleteSurveyVariable(
  supabase: SupabaseClientType,
  variableId: string,
  studyId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await supabase
    .from('survey_variables')
    .delete()
    .eq('id', variableId)
    .eq('study_id', studyId);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

// Use Database types directly for type safety
type DbSurveyRule = Database['public']['Tables']['survey_rules']['Row'];
type DbSurveyVariable = Database['public']['Tables']['survey_variables']['Row'];

function transformRuleFromDb(row: DbSurveyRule): SurveyRule {
  return {
    id: row.id,
    study_id: row.study_id,
    name: row.name,
    description: row.description,
    position: row.position,
    is_enabled: row.is_enabled,
    conditions: castJson<RuleConditions>(row.conditions, { groups: [] }),
    action_type: row.action_type as SurveyRule['action_type'],
    action_config: castJson<SurveyRule['action_config']>(row.action_config, {} as SurveyRule['action_config']),
    trigger_type: row.trigger_type as SurveyRule['trigger_type'],
    trigger_config: castJson<SurveyRule['trigger_config']>(row.trigger_config, {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function transformVariableFromDb(row: DbSurveyVariable): SurveyVariable {
  return {
    id: row.id,
    study_id: row.study_id,
    name: row.name,
    description: row.description,
    variable_type: row.variable_type as SurveyVariable['variable_type'],
    config: castJson<SurveyVariable['config']>(row.formula, {} as SurveyVariable['config']),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function toggleRulesEnabled(
  supabase: SupabaseClientType,
  studyId: string,
  ruleIds: string[],
  enabled: boolean
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await supabase
    .from('survey_rules')
    .update({ is_enabled: enabled })
    .in('id', ruleIds)
    .eq('study_id', studyId);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

export async function deleteMultipleRules(
  supabase: SupabaseClientType,
  studyId: string,
  ruleIds: string[]
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await supabase
    .from('survey_rules')
    .delete()
    .in('id', ruleIds)
    .eq('study_id', studyId);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}
