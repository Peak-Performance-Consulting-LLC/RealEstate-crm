import { actorIdFromUser, writeAuditLog } from "../_shared/audit.ts";
import { requireUser, requireWorkspaceMembership } from "../_shared/auth.ts";
import { errorResponse, getErrorInfo, handleCors, jsonResponse } from "../_shared/http.ts";
import { importLeadsCsvSchema } from "../_shared/schemas.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const payload = importLeadsCsvSchema.parse(await req.json());
    const userClient = createUserClient(req);
    const serviceClient = createServiceClient();
    const user = await requireUser(userClient);

    await requireWorkspaceMembership(serviceClient, user, payload.workspaceId, ["owner", "admin", "manager", "agent"]);

    const { data: importJob, error: importError } = await serviceClient
      .from("imports")
      .insert({
        workspace_id: payload.workspaceId,
        file_name: payload.fileName,
        file_path: payload.filePath,
        status: "mapped",
        mapping: payload.fieldMapping,
        duplicate_strategy: payload.duplicateDetection.strategy,
        row_count: payload.previewRows.length,
        created_by: user.id,
        metadata: {
          headers: payload.headers,
          duplicateFields: payload.duplicateDetection.fields,
          processingMode: "phase-1-skeleton",
        },
      })
      .select("*")
      .single();

    if (importError || !importJob) {
      throw importError ?? new Error("Unable to create import job");
    }

    if (payload.previewRows.length > 0) {
      const { error: rowsError } = await serviceClient.from("import_rows").insert(
        payload.previewRows.map((row, index) => ({
          import_id: importJob.id,
          workspace_id: payload.workspaceId,
          row_number: index + 1,
          status: "pending",
          raw_data: row,
          normalized_data: row,
        })),
      );

      if (rowsError) throw rowsError;
    }

    await writeAuditLog(serviceClient, {
      workspaceId: payload.workspaceId,
      actorId: actorIdFromUser(user),
      action: "import.created",
      entityType: "import",
      entityId: importJob.id,
      after: importJob,
    });

    return jsonResponse({
      import: importJob,
      nextStep: "Queue a batch processor or cron-ready worker to normalize and insert leads.",
    });
  } catch (error) {
    const { message, details } = getErrorInfo(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return errorResponse(message, status, details);
  }
});
