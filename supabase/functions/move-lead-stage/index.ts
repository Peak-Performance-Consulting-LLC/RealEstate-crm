import { actorIdFromUser, writeAuditLog, writeTimelineEvent } from "../_shared/audit.ts";
import { requireUser, requireWorkspaceMembership } from "../_shared/auth.ts";
import { errorResponse, getErrorInfo, handleCors, jsonResponse } from "../_shared/http.ts";
import { moveLeadStageSchema } from "../_shared/schemas.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const payload = moveLeadStageSchema.parse(await req.json());
    const userClient = createUserClient(req);
    const serviceClient = createServiceClient();
    const user = await requireUser(userClient);

    await requireWorkspaceMembership(serviceClient, user, payload.workspaceId, ["owner", "admin", "manager", "agent"]);

    const { data: lead, error: leadError } = await serviceClient
      .from("leads")
      .select("id, workspace_id, pipeline_id, current_stage_id, full_name")
      .eq("id", payload.leadId)
      .eq("workspace_id", payload.workspaceId)
      .is("deleted_at", null)
      .single();

    if (leadError || !lead) {
      throw leadError ?? new Error("Lead not found");
    }

    const { data: stage, error: stageError } = await serviceClient
      .from("pipeline_stages")
      .select("id, pipeline_id, name")
      .eq("id", payload.toStageId)
      .eq("workspace_id", payload.workspaceId)
      .eq("pipeline_id", payload.pipelineId)
      .is("deleted_at", null)
      .single();

    if (stageError || !stage) {
      throw stageError ?? new Error("Stage not found");
    }

    const { data: updatedLead, error: updateError } = await serviceClient
      .from("leads")
      .update({
        pipeline_id: payload.pipelineId,
        current_stage_id: payload.toStageId,
        updated_by: user.id,
      })
      .eq("id", payload.leadId)
      .eq("workspace_id", payload.workspaceId)
      .select("id, pipeline_id, current_stage_id, full_name")
      .single();

    if (updateError || !updatedLead) {
      throw updateError ?? new Error("Unable to move lead");
    }

    const { data: history, error: historyError } = await serviceClient
      .from("lead_stage_history")
      .insert({
        workspace_id: payload.workspaceId,
        lead_id: payload.leadId,
        pipeline_id: payload.pipelineId,
        from_stage_id: lead.current_stage_id,
        to_stage_id: payload.toStageId,
        moved_by: user.id,
        reason: payload.reason ?? null,
      })
      .select("id")
      .single();

    if (historyError || !history) {
      throw historyError ?? new Error("Unable to write stage history");
    }

    await writeAuditLog(serviceClient, {
      workspaceId: payload.workspaceId,
      actorId: actorIdFromUser(user),
      action: "lead.stage_moved",
      entityType: "lead_stage_history",
      entityId: history.id,
      before: {
        fromStageId: lead.current_stage_id,
      },
      after: {
        toStageId: payload.toStageId,
      },
    });

    await writeTimelineEvent(serviceClient, {
      workspaceId: payload.workspaceId,
      leadId: payload.leadId,
      actorId: actorIdFromUser(user),
      eventType: "stage_change",
      relatedEntityType: "lead_stage_history",
      relatedEntityId: history.id,
      summary: `Moved ${lead.full_name} to ${stage.name}`,
      body: {
        fromStageId: lead.current_stage_id,
        toStageId: payload.toStageId,
        reason: payload.reason ?? null,
      },
    });

    return jsonResponse({ lead: updatedLead, stageHistoryId: history.id });
  } catch (error) {
    const { message, details } = getErrorInfo(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return errorResponse(message, status, details);
  }
});
