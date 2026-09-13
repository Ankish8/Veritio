import { describe, expect, it } from "vitest";

import {
  containsConcurrentIndex,
  concurrentIndexTarget,
  makeIndexCompatibleWithPartitioning,
  orderMigrationFilenames,
  splitSqlStatements,
} from "../../scripts/migrate-self-host-utils";

describe("self-host migration SQL handling", () => {
  it("detects concurrent indexes with IF NOT EXISTS", () => {
    expect(
      containsConcurrentIndex(
        "CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx ON items(id);",
      ),
    ).toBe(true);
  });

  it("uses a valid index command for partitioned table parents", () => {
    const statement =
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx ON public.recordings(id)";
    expect(concurrentIndexTarget(statement)).toBe("public.recordings");
    expect(makeIndexCompatibleWithPartitioning(statement, true)).toBe(
      "CREATE INDEX IF NOT EXISTS idx ON public.recordings(id)",
    );
    expect(makeIndexCompatibleWithPartitioning(statement, false)).toBe(
      statement,
    );
  });

  it("splits concurrent indexes so PostgreSQL does not create an implicit transaction", () => {
    const statements = splitSqlStatements(`
      -- First index; the semicolon in this comment is not a statement.
      CREATE INDEX CONCURRENTLY IF NOT EXISTS first_idx ON items(id);
      /* Nested comment /* still a comment; */ complete. */
      CREATE INDEX CONCURRENTLY IF NOT EXISTS second_idx ON items(name);
    `);

    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain("first_idx");
    expect(statements[1]).toContain("second_idx");
  });

  it("preserves semicolons inside strings and dollar-quoted bodies", () => {
    const statements = splitSqlStatements(`
      INSERT INTO items(value) VALUES ('one;two');
      CREATE FUNCTION example() RETURNS void AS $$
      BEGIN
        PERFORM 'three;four';
      END;
      $$ LANGUAGE plpgsql;
    `);

    expect(statements).toHaveLength(2);
    expect(statements[1]).toContain("PERFORM 'three;four';");
  });

  it("applies prototype enhancements after their table dependency", () => {
    const ordered = orderMigrationFilenames([
      "20260124000000_builder_improvements.sql",
      "20260110000000_add_prototype_test_tables.sql",
      "20251229120000_add_prototype_starting_frame.sql",
      "20251229110000_add_figma_file_modified.sql",
      "20251228150000_prototype_test_enhancements.sql",
    ]);

    expect(ordered).toEqual([
      "20260110000000_add_prototype_test_tables.sql",
      "20251228150000_prototype_test_enhancements.sql",
      "20251229110000_add_figma_file_modified.sql",
      "20251229120000_add_prototype_starting_frame.sql",
      "20260124000000_builder_improvements.sql",
    ]);
  });

  it("applies widget analytics after the link analytics table exists", () => {
    expect(
      orderMigrationFilenames([
        "20260108000001_add_widget_analytics.sql",
        "20260401000000_later.sql",
        "20260315000000_add_sharing_features.sql",
      ]),
    ).toEqual([
      "20260315000000_add_sharing_features.sql",
      "20260108000001_add_widget_analytics.sql",
      "20260401000000_later.sql",
    ]);
  });

  it("applies organization-aware RLS optimization after collaboration tables", () => {
    expect(
      orderMigrationFilenames([
        "20260121110000_optimize_participants_studies_rls.sql",
        "20260321000000_panel_org_scoping.sql",
        "20260320000000_add_collaboration_features.sql",
        "20260121100000_optimize_study_flow_responses_rls.sql",
      ]),
    ).toEqual([
      "20260320000000_add_collaboration_features.sql",
      "20260121100000_optimize_study_flow_responses_rls.sql",
      "20260121110000_optimize_participants_studies_rls.sql",
      "20260321000000_panel_org_scoping.sql",
    ]);
  });

  it("applies component-state enhancements after the event table exists", () => {
    expect(
      orderMigrationFilenames([
        "20260209120000_fix_component_state_constraint.sql",
        "20260424000000_later.sql",
        "20260124000000_builder_improvements.sql",
        "20260423000000_add_component_state_tracking.sql",
      ]),
    ).toEqual([
      "20260423000000_add_component_state_tracking.sql",
      "20260124000000_builder_improvements.sql",
      "20260209120000_fix_component_state_constraint.sql",
      "20260424000000_later.sql",
    ]);
  });

  it("applies cross-service quick-win indexes after organization and Yjs tables", () => {
    const ordered = orderMigrationFilenames([
      "20260125000000_add_quick_win_indexes.sql",
      "20260320000000_add_collaboration_features.sql",
      "20260319000000_add_yjs_documents.sql",
    ]);

    expect(ordered.indexOf("20260125000000_add_quick_win_indexes.sql")).toBe(2);
  });

  it("applies early organization migrations after collaboration tables", () => {
    const ordered = orderMigrationFilenames([
      "20260222000000_add_live_website_screenshots.sql",
      "20260202000000_add_dashboard_materialized_views.sql",
      "20260201000000_denormalize_organization_id_to_studies.sql",
      "20260320000000_add_collaboration_features.sql",
    ]);

    expect(ordered).toEqual([
      "20260320000000_add_collaboration_features.sql",
      "20260201000000_denormalize_organization_id_to_studies.sql",
      "20260202000000_add_dashboard_materialized_views.sql",
      "20260222000000_add_live_website_screenshots.sql",
    ]);
  });

  it("applies recording storage tracking after recording tables", () => {
    expect(
      orderMigrationFilenames([
        "20260203000000_add_storage_tracking_columns.sql",
        "20260207000000_add_recording_tables.sql",
      ]),
    ).toEqual([
      "20260207000000_add_recording_tables.sql",
      "20260203000000_add_storage_tracking_columns.sql",
    ]);
  });

  it("creates recording feature tables before partition references and archives", () => {
    expect(
      orderMigrationFilenames([
        "20260214000000_archive_old_data.sql",
        "20260211500000_add_linked_recording_created_at_trigger.sql",
        "20260302000000_add_recording_features.sql",
        "20260309000000_add_recording_annotations.sql",
        "20260211000000_partition_recordings_by_month.sql",
        "20260210500000_add_recording_created_at_refs.sql",
      ]),
    ).toEqual([
      "20260302000000_add_recording_features.sql",
      "20260309000000_add_recording_annotations.sql",
      "20260210500000_add_recording_created_at_refs.sql",
      "20260211000000_partition_recordings_by_month.sql",
      "20260211500000_add_linked_recording_created_at_trigger.sql",
      "20260214000000_archive_old_data.sql",
    ]);
  });

  it("adds assistant conversation mode after the assistant tables", () => {
    expect(
      orderMigrationFilenames([
        "20260214160000_add_conversation_mode.sql",
        "20260425000001_add_assistant_tables.sql",
      ]),
    ).toEqual([
      "20260425000001_add_assistant_tables.sql",
      "20260214160000_add_conversation_mode.sql",
    ]);
  });

  it("adds screenshot metadata after the organization-scoped screenshot table", () => {
    expect(
      orderMigrationFilenames([
        "20260223_add_page_dimensions.sql",
        "20260223_add_dom_snapshots.sql",
        "20260222000000_add_live_website_screenshots.sql",
      ]),
    ).toEqual([
      "20260222000000_add_live_website_screenshots.sql",
      "20260223_add_dom_snapshots.sql",
      "20260223_add_page_dimensions.sql",
    ]);
  });

  it("applies participation upgrades after panel tables", () => {
    expect(
      orderMigrationFilenames([
        "20260226120000_add_study_source_to_panel.sql",
        "20260316000000_add_panel_tables.sql",
        "20260226100000_allow_multiple_study_participations.sql",
      ]),
    ).toEqual([
      "20260316000000_add_panel_tables.sql",
      "20260226100000_allow_multiple_study_participations.sql",
      "20260226120000_add_study_source_to_panel.sql",
    ]);
  });
});
