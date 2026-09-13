export function containsConcurrentIndex(sql: string) {
  return /\bcreate\s+(?:unique\s+)?index\s+concurrently\b/i.test(sql);
}

export function concurrentIndexTarget(statement: string) {
  const match = statement.match(
    /\bon\s+((?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)(?:\.(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*))?)/i,
  );
  return match?.[1] ?? null;
}

export function makeIndexCompatibleWithPartitioning(
  statement: string,
  partitioned: boolean,
) {
  return partitioned
    ? statement.replace(/\bINDEX\s+CONCURRENTLY\b/i, "INDEX")
    : statement;
}

const MIGRATION_AFTER = new Map<string, string>([
  // This enhancement was timestamped before the migration that creates its
  // prototype tables. Preserve its public filename, but apply it immediately
  // after the dependency for clean installations.
  [
    "20251228150000_prototype_test_enhancements.sql",
    "20260110000000_add_prototype_test_tables.sql",
  ],
  [
    "20251229110000_add_figma_file_modified.sql",
    "20251228150000_prototype_test_enhancements.sql",
  ],
  [
    "20251229120000_add_prototype_starting_frame.sql",
    "20251229110000_add_figma_file_modified.sql",
  ],
  [
    "20260108000001_add_widget_analytics.sql",
    "20260315000000_add_sharing_features.sql",
  ],
  [
    "20260121100000_optimize_study_flow_responses_rls.sql",
    "20260320000000_add_collaboration_features.sql",
  ],
  [
    "20260121110000_optimize_participants_studies_rls.sql",
    "20260121100000_optimize_study_flow_responses_rls.sql",
  ],
  [
    "20260124000000_builder_improvements.sql",
    "20260423000000_add_component_state_tracking.sql",
  ],
  [
    "20260209120000_fix_component_state_constraint.sql",
    "20260124000000_builder_improvements.sql",
  ],
  [
    "20260125000000_add_quick_win_indexes.sql",
    "20260320000000_add_collaboration_features.sql",
  ],
  [
    "20260201000000_denormalize_organization_id_to_studies.sql",
    "20260320000000_add_collaboration_features.sql",
  ],
  [
    "20260202000000_add_dashboard_materialized_views.sql",
    "20260201000000_denormalize_organization_id_to_studies.sql",
  ],
  [
    "20260222000000_add_live_website_screenshots.sql",
    "20260202000000_add_dashboard_materialized_views.sql",
  ],
  [
    "20260203000000_add_storage_tracking_columns.sql",
    "20260207000000_add_recording_tables.sql",
  ],
  [
    "20260210500000_add_recording_created_at_refs.sql",
    "20260309000000_add_recording_annotations.sql",
  ],
  [
    "20260211000000_partition_recordings_by_month.sql",
    "20260210500000_add_recording_created_at_refs.sql",
  ],
  [
    "20260211500000_add_linked_recording_created_at_trigger.sql",
    "20260211000000_partition_recordings_by_month.sql",
  ],
  [
    "20260214000000_archive_old_data.sql",
    "20260211500000_add_linked_recording_created_at_trigger.sql",
  ],
  [
    "20260214160000_add_conversation_mode.sql",
    "20260425000001_add_assistant_tables.sql",
  ],
  [
    "20260223_add_dom_snapshots.sql",
    "20260222000000_add_live_website_screenshots.sql",
  ],
  ["20260223_add_page_dimensions.sql", "20260223_add_dom_snapshots.sql"],
  [
    "20260226100000_allow_multiple_study_participations.sql",
    "20260316000000_add_panel_tables.sql",
  ],
  [
    "20260226120000_add_study_source_to_panel.sql",
    "20260226100000_allow_multiple_study_participations.sql",
  ],
]);

export function orderMigrationFilenames(filenames: string[]) {
  const ordered = [...filenames].sort((left, right) =>
    left.localeCompare(right),
  );

  for (const [filename, dependency] of MIGRATION_AFTER) {
    const currentIndex = ordered.indexOf(filename);
    const dependencyIndex = ordered.indexOf(dependency);
    if (currentIndex === -1 || dependencyIndex === -1) continue;

    ordered.splice(currentIndex, 1);
    const updatedDependencyIndex = ordered.indexOf(dependency);
    ordered.splice(updatedDependencyIndex + 1, 0, filename);
  }

  return ordered;
}

/**
 * PostgreSQL treats several semicolon-delimited commands sent in one query as
 * one implicit transaction. CREATE INDEX CONCURRENTLY is forbidden in that
 * transaction, so concurrent-index migrations must be issued statement by
 * statement. This splitter preserves quoted strings, identifiers, comments,
 * and dollar-quoted function bodies.
 */
export function splitSqlStatements(sql: string) {
  const statements: string[] = [];
  let start = 0;
  let singleQuoted = false;
  let doubleQuoted = false;
  let lineComment = false;
  let blockCommentDepth = 0;
  let dollarTag: string | null = null;

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1];

    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }

    if (blockCommentDepth > 0) {
      if (character === "/" && next === "*") {
        blockCommentDepth += 1;
        index += 1;
      } else if (character === "*" && next === "/") {
        blockCommentDepth -= 1;
        index += 1;
      }
      continue;
    }

    if (dollarTag) {
      if (sql.startsWith(dollarTag, index)) {
        index += dollarTag.length - 1;
        dollarTag = null;
      }
      continue;
    }

    if (singleQuoted) {
      if (character === "'" && next === "'") {
        index += 1;
      } else if (character === "'") {
        singleQuoted = false;
      }
      continue;
    }

    if (doubleQuoted) {
      if (character === '"' && next === '"') {
        index += 1;
      } else if (character === '"') {
        doubleQuoted = false;
      }
      continue;
    }

    if (character === "-" && next === "-") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      blockCommentDepth = 1;
      index += 1;
      continue;
    }
    if (character === "'") {
      singleQuoted = true;
      continue;
    }
    if (character === '"') {
      doubleQuoted = true;
      continue;
    }
    if (character === "$") {
      const match = sql.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        dollarTag = match[0];
        index += dollarTag.length - 1;
        continue;
      }
    }
    if (character === ";") {
      const statement = sql.slice(start, index).trim();
      if (statement) statements.push(statement);
      start = index + 1;
    }
  }

  const remainder = sql.slice(start).trim();
  if (remainder) statements.push(remainder);
  return statements;
}
