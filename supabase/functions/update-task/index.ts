import { actorIdFromUser, writeAuditLog, writeTimelineEvent } from "../_shared/audit.ts";
import { requireUser, requireWorkspaceMembership } from "../_shared/auth.ts";
import { errorResponse, getErrorInfo, handleCors, jsonResponse } from "../_shared/http.ts";
import { updateTaskSchema } from "../_shared/schemas.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const payload = updateTaskSchema.parse(await req.json());
    const userClient = createUserClient(req);
    const serviceClient = createServiceClient();
    const user = await requireUser(userClient);

    await requireWorkspaceMembership(serviceClient, user, payload.workspaceId, ["owner", "admin", "manager", "agent"]);

    const { data: existingTask, error: existingTaskError } = await serviceClient
      .from("lead_tasks")
      .select("*")
      .eq("id", payload.taskId)
      .eq("workspace_id", payload.workspaceId)
      .is("deleted_at", null)
      .single();

    if (existingTaskError || !existingTask) {
      throw existingTaskError ?? new Error("Task not found");
    }

    const updatePayload: Record<string, unknown> = {
      updated_by: user.id,
    };

    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.description !== undefined) updatePayload.description = payload.description;
    if (payload.status !== undefined) updatePayload.status = payload.status;
    if (payload.priority !== undefined) updatePayload.priority = payload.priority;
    if (payload.dueAt !== undefined) updatePayload.due_at = payload.dueAt;
    if (payload.assignedTo !== undefined) updatePayload.assigned_to = payload.assignedTo;
    if (payload.leadId !== undefined) updatePayload.lead_id = payload.leadId;
    if (payload.metadata !== undefined) updatePayload.metadata = payload.metadata;

    const { data: updatedTask, error: updateTaskError } = await serviceClient
      .from("lead_tasks")
      .update(updatePayload)
      .eq("id", payload.taskId)
      .eq("workspace_id", payload.workspaceId)
      .select("*")
      .single();

    if (updateTaskError || !updatedTask) {
      throw updateTaskError ?? new Error("Unable to update task");
    }

    await writeAuditLog(serviceClient, {
      workspaceId: payload.workspaceId,
      actorId: actorIdFromUser(user),
      action: "task.updated",
      entityType: "lead_task",
      entityId: payload.taskId,
      before: existingTask,
      after: updatedTask,
    });

    if (updatedTask.lead_id) {
      await writeTimelineEvent(serviceClient, {
        workspaceId: payload.workspaceId,
        leadId: updatedTask.lead_id,
        actorId: actorIdFromUser(user),
        eventType: updatedTask.status === "completed" ? "task_completed" : "task_updated",
        relatedEntityType: "lead_task",
        relatedEntityId: updatedTask.id,
        summary: `Task updated: ${updatedTask.title}`,
        body: {
          status: updatedTask.status,
          priority: updatedTask.priority,
        },
      });
    }

    return jsonResponse({ task: updatedTask });
  } catch (error) {
    const { message, details } = getErrorInfo(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return errorResponse(message, status, details);
  }
});
