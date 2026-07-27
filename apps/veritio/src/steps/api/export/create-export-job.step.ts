import type { StepConfig } from "@/lib/motia/types";
import { z } from "zod";
import type { ApiHandlerContext, ApiRequest } from "../../../lib/motia/types";
import { validateRequest } from "../../../lib/api/validate-request";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { requireStudyEditor } from "../../../middlewares/permissions.middleware";
import { errorHandlerMiddleware } from "../../../middlewares/error-handler.middleware";
import { getMotiaSupabaseClient } from "../../../lib/supabase/motia-client";
import { isIntegrationSupported } from "../../../services/export/adapter-factory";
import { getPostHogClient } from "../../../lib/posthog";

const bodySchema = z.object({
  integration: z.enum([
    "googlesheets",
    "googledocs",
    "notion",
    "airtable",
    "csv_download",
    "transcript_zip",
  ]),
  format: z.enum(["raw", "summary", "both"]).default("raw"),
  config: z.record(z.unknown()).optional(),
});

const transcriptZipConfigSchema = z.object({
  formats: z
    .array(z.enum(["txt", "json"]))
    .min(1)
    .max(2)
    .refine((formats) => new Set(formats).size === formats.length, {
      message: "Transcript formats must be unique",
    })
    .default(["txt"]),
  includeTimestamps: z.boolean().default(true),
  includeSpeakers: z.boolean().default(true),
  recordingIds: z.array(z.string().uuid()).max(500).optional(),
});

const responseSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(["pending", "processing", "completed", "failed", "cancelled"]),
  estimatedDuration: z.string(),
});

export const config = {
  name: "CreateExportJob",
  description: "Create a new export job for study data",
  triggers: [
    {
      type: "http",
      method: "POST",
      path: "/api/studies/:studyId/export",
      middleware: [
        authMiddleware,
        requireStudyEditor("studyId"),
        errorHandlerMiddleware,
      ],
      bodySchema: bodySchema as any,
      responseSchema: {
        201: responseSchema as any,
        400: z.object({ error: z.string() }) as any,
        401: z.object({ error: z.string() }) as any,
        403: z.object({ error: z.string() }) as any,
        500: z.object({ error: z.string() }) as any,
      },
    },
  ],
  enqueues: ["export-job-created"],
  flows: ["export-lifecycle"],
} satisfies StepConfig;

export const handler = async (
  req: ApiRequest,
  { logger, enqueue }: ApiHandlerContext,
) => {
  const userId = req.headers["x-user-id"] as string;
  const { studyId } = req.pathParams;

  const validation = validateRequest(bodySchema, req.body, logger);
  if (!validation.success) return validation.response;

  const { integration, format } = validation.data;
  let exportConfig = validation.data.config || {};
  if (integration === "transcript_zip") {
    const parsedConfig = transcriptZipConfigSchema.safeParse(exportConfig);
    if (!parsedConfig.success) {
      return {
        status: 400,
        body: {
          error:
            parsedConfig.error.issues[0]?.message ||
            "Invalid transcript ZIP options",
        },
      };
    }
    exportConfig = parsedConfig.data;
  }

  logger.info("Creating export job", { userId, studyId, integration, format });

  // Validate integration is supported
  if (!isIntegrationSupported(integration)) {
    logger.warn("Unsupported integration requested", { integration });
    return {
      status: 400,
      body: { error: `Integration ${integration} is not yet supported` },
    };
  }

  const supabase = getMotiaSupabaseClient();

  // Check if integration requires connection (not CSV)
  if (integration !== "csv_download" && integration !== "transcript_zip") {
    const { data: connection } = await (supabase as any)
      .from("composio_connections")
      .select("id")
      .eq("user_id", userId)
      .eq("toolkit", integration)
      .single();

    if (!connection) {
      logger.warn("Integration not connected", { userId, integration });
      return {
        status: 400,
        body: {
          error: `${integration} integration not connected. Please connect it first.`,
        },
      };
    }
  }

  let countQuery =
    integration === "transcript_zip"
      ? supabase
          .from("recordings")
          .select("*", { count: "exact", head: true })
          .eq("study_id", studyId)
      : supabase
          .from("participants")
          .select("*", { count: "exact", head: true })
          .eq("study_id", studyId)
          .eq("status", "completed");
  const requestedRecordingIds =
    integration === "transcript_zip"
      ? (exportConfig as { recordingIds?: string[] }).recordingIds
      : undefined;
  if (requestedRecordingIds?.length) {
    countQuery = countQuery.in("id", requestedRecordingIds);
  }
  const { count: itemCount } = await countQuery;
  const totalParticipants = itemCount || 0;

  // Create export job
  const { data: job, error: createError } = await (supabase as any)
    .from("export_jobs")
    .insert({
      user_id: userId,
      study_id: studyId,
      integration,
      format,
      options: exportConfig,
      status: "pending",
      processed_participants: 0,
      total_participants: totalParticipants,
      current_batch: 0,
      total_batches:
        integration === "transcript_zip" ? totalParticipants : null,
    })
    .select()
    .single();

  if (createError || !job) {
    logger.error("Failed to create export job", {
      error: createError?.message,
    });
    return {
      status: 500,
      body: { error: "Failed to create export job" },
    };
  }

  logger.info("Export job created", { jobId: job.id, userId, studyId });

  getPostHogClient()?.capture({
    distinctId: userId,
    event: "export started",
    properties: {
      study_id: studyId,
      integration,
      format,
      participant_count: totalParticipants,
    },
  });

  // Emit event for background worker
  enqueue({
    topic: "export-job-created",
    data: {
      job_id: job.id,
      user_id: userId,
      study_id: studyId,
      integration,
      format,
    },
  }).catch(() => {});

  // Estimate duration (rough: ~2 seconds per 100 participants)
  const estimatedSeconds = Math.max(
    30,
    Math.ceil((totalParticipants / 100) * 2),
  );
  const estimatedDuration =
    estimatedSeconds < 60
      ? `~${estimatedSeconds} seconds`
      : `~${Math.ceil(estimatedSeconds / 60)} minutes`;

  return {
    status: 201,
    body: {
      jobId: job.id,
      status: job.status,
      estimatedDuration,
    },
  };
};
