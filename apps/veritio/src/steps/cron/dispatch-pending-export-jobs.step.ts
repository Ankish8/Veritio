import type { StepConfig } from "@/lib/motia/types";
import { getMotiaSupabaseClient } from "../../lib/supabase/motia-client";
import type { EventHandlerContext } from "../../lib/motia/types";

/**
 * Pick up export jobs that were created without going through the engine.
 *
 * `POST /api/v1/studies/{id}/exports` and the MCP `export_create` tool both run
 * inside Next.js, where `enqueue` — an iii-engine primitive — does not exist.
 * They can write the `export_jobs` row but cannot publish `export-job-created`,
 * so without this sweeper their jobs would sit at `pending` forever while the
 * API cheerfully returned a job id.
 *
 * It doubles as a recovery path for the engine's own jobs: anything that lost
 * its queue message gets retried on the next tick rather than being stranded.
 *
 * The delay before adoption is what keeps the two paths from racing — a job the
 * engine just enqueued is left alone until it is old enough that no in-flight
 * delivery is plausible.
 */
export const config = {
  name: "DispatchPendingExportJobs",
  description:
    "Enqueue export jobs created outside the engine (public API, MCP) and recover stranded ones",
  triggers: [{ type: "cron", expression: "0 * * * * * *" }],
  enqueues: ["export-job-created"],
  flows: ["export-lifecycle"],
} satisfies StepConfig;

/** Leave a job alone until it is this old, so the engine's own enqueue wins. */
const ADOPTION_DELAY_MS = 45 * 1000;

/** Never adopt a job this old — something is wrong with it, not with delivery. */
const ABANDON_AFTER_MS = 60 * 60 * 1000;

const BATCH_SIZE = 25;

interface PendingJob {
  id: string;
  user_id: string;
  study_id: string;
  integration: string;
  format: string | null;
}

export const handler = async (
  _input: unknown,
  { logger, enqueue }: EventHandlerContext,
) => {
  const supabase = getMotiaSupabaseClient();
  const now = Date.now();

  const { data, error } = await (supabase as any)
    .from("export_jobs")
    .select("id, user_id, study_id, integration, format")
    .eq("status", "pending")
    .lt("created_at", new Date(now - ADOPTION_DELAY_MS).toISOString())
    .gt("created_at", new Date(now - ABANDON_AFTER_MS).toISOString())
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    logger.error("Could not read pending export jobs", { error: error.message });
    return;
  }

  const jobs = (data ?? []) as PendingJob[];
  if (jobs.length === 0) return;

  logger.info("Adopting export jobs created outside the engine", {
    count: jobs.length,
  });

  for (const job of jobs) {
    // Claim the row before enqueuing. If two instances run this tick, only one
    // update matches `status = 'pending'`, so only one enqueue happens — the
    // difference between a duplicate export and a wasted query.
    const { data: claimed, error: claimError } = await (supabase as any)
      .from("export_jobs")
      .update({ status: "processing" })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (claimError || !claimed) continue;

    try {
      await enqueue({
        topic: "export-job-created",
        data: {
          job_id: job.id,
          user_id: job.user_id,
          study_id: job.study_id,
          integration: job.integration,
          format: job.format ?? "raw",
        },
      });
    } catch (err) {
      logger.error("Failed to enqueue adopted export job", {
        jobId: job.id,
        error: String(err),
      });
      // Release the claim. Without this a failed enqueue strands the job at
      // `processing` forever — invisible to this sweeper, which only looks at
      // pending rows, and to the user, who sees a job that never finishes.
      await (supabase as any)
        .from("export_jobs")
        .update({ status: "pending" })
        .eq("id", job.id)
        .eq("status", "processing");
    }
  }
};
