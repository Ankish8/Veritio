import type { StepConfig } from "@/lib/motia/types";
import { getMotiaSupabaseClient } from "../../lib/supabase/motia-client";
import type { EventHandlerContext } from "../../lib/motia/types";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Bucket, getR2Client } from "../../services/storage/r2-client";

export const config = {
  name: "CleanupExportJobs",
  description:
    "Clean up old completed/failed export jobs (keep 7 days + last 10 per user)",
  triggers: [{ type: "cron", expression: "0 0 2 * * * *" }],
  enqueues: [],
  flows: ["export-lifecycle"],
} satisfies StepConfig;

const EXPORT_JOB_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_JOBS_TO_KEEP_PER_USER = 10;

interface ExportJob {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  options: { storageKey?: string } | null;
}

export const handler = async (
  _input: unknown,
  { logger }: EventHandlerContext,
) => {
  const supabase = getMotiaSupabaseClient();

  logger.info("Running cleanup export jobs cron job");

  try {
    const cutoffTime = new Date(
      Date.now() - EXPORT_JOB_RETENTION_MS,
    ).toISOString();

    const { data: oldJobs, error: fetchError } = await (supabase as any)
      .from("export_jobs")
      .select("id, user_id, status, created_at, options")
      .in("status", ["completed", "failed", "cancelled"])
      .lt("created_at", cutoffTime)
      .order("created_at", { ascending: false });

    if (fetchError) {
      logger.error("Failed to fetch old export jobs", { error: fetchError });
      return;
    }

    if (!oldJobs || oldJobs.length === 0) {
      logger.info("No old export jobs found to clean up");
      return;
    }

    logger.info(
      `Found ${oldJobs.length} old export jobs to review for cleanup`,
    );

    const jobsByUser: Record<string, ExportJob[]> = (
      oldJobs as ExportJob[]
    ).reduce((acc: Record<string, ExportJob[]>, job: ExportJob) => {
      if (!acc[job.user_id]) {
        acc[job.user_id] = [];
      }
      acc[job.user_id].push(job);
      return acc;
    }, {});

    const jobsToDelete: ExportJob[] = [];

    for (const [userId, userJobs] of Object.entries(jobsByUser)) {
      const sorted = [...userJobs].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      if (sorted.length > MIN_JOBS_TO_KEEP_PER_USER) {
        const toDelete = sorted.slice(MIN_JOBS_TO_KEEP_PER_USER);
        jobsToDelete.push(...toDelete);
        logger.info(
          `User ${userId}: keeping ${MIN_JOBS_TO_KEEP_PER_USER}, deleting ${toDelete.length}`,
        );
      } else {
        logger.info(
          `User ${userId}: keeping all ${sorted.length} jobs (below minimum)`,
        );
      }
    }

    if (jobsToDelete.length === 0) {
      logger.info("No jobs to delete after applying retention rules");
      return;
    }

    logger.info(`Deleting ${jobsToDelete.length} export jobs`);

    const BATCH_SIZE = 100;
    let deletedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < jobsToDelete.length; i += BATCH_SIZE) {
      const batch = jobsToDelete.slice(i, i + BATCH_SIZE);
      const storageKeys = batch.flatMap((job) =>
        job.options?.storageKey ? [job.options.storageKey] : [],
      );

      if (storageKeys.length > 0) {
        try {
          const r2Client = getR2Client();
          const bucket = getR2Bucket();
          const storageDeleteResults = await Promise.allSettled(
            storageKeys.map((storageKey) =>
              r2Client.send(
                new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }),
              ),
            ),
          );
          const failedStorageDeletes = storageDeleteResults.filter(
            (result) => result.status === "rejected",
          ).length;
          if (failedStorageDeletes > 0) {
            logger.warn("Failed to delete some export archives from R2", {
              failed: failedStorageDeletes,
              attempted: storageKeys.length,
            });
          }
        } catch (error) {
          logger.warn(
            "Could not initialize R2 cleanup; continuing with job cleanup",
            {
              error,
              attempted: storageKeys.length,
            },
          );
        }
      }

      const { error: deleteError } = await (supabase as any)
        .from("export_jobs")
        .delete()
        .in(
          "id",
          batch.map((job) => job.id),
        );

      if (deleteError) {
        logger.warn("Failed to delete batch of export jobs", {
          batchSize: batch.length,
          error: deleteError,
        });
        errorCount += batch.length;
      } else {
        deletedCount += batch.length;
      }
    }

    logger.info("Cleanup completed", {
      deleted: deletedCount,
      errors: errorCount,
      total: jobsToDelete.length,
      usersAffected: Object.keys(jobsByUser).length,
    });
  } catch (error) {
    logger.error("Error in cleanup export jobs cron", { error });
  }
};
