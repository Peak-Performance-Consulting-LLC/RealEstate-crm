import { actorIdFromUser, writeAuditLog, writeTimelineEvent } from "../_shared/audit.ts";
import { requireUser, requireWorkspaceMembership } from "../_shared/auth.ts";
import { createTaskSchema } from "../_shared/schemas.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";
import { errorResponse, getErrorInfo, handleCors, jsonResponse } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const payload = createTaskSchema.parse(await req.json());
    const userClient = createUserClient(req);
    const serviceClient = createServiceClient();
    const user = await requireUser(userClient);

    await requireWorkspaceMembership(serviceClient, user, payload.workspaceId, ["owner", "admin", "manager", "agent"]);

    const { data: task, error: taskError } = await serviceClient
      .from("lead_tasks")
      .insert({
        workspace_id: payload.workspaceId,
        lead_id: payload.leadId ?? null,
        title: payload.title,
        description: payload.description ?? null,
        status: payload.status,
        priority: payload.priority,
        due_at: payload.dueAt ?? null,
        assigned_to: payload.assignedTo ?? null,
        metadata: payload.metadata ?? {},
        created_by: user.id,
        updated_by: user.id,
      })
      .select("*")
      .single();

    if (taskError || !task) {
      throw taskError ?? new Error("Unable to create task");
    }

    await writeAuditLog(serviceClient, {
      workspaceId: payload.workspaceId,
      actorId: actorIdFromUser(user),
      action: "task.created",
      entityType: "lead_task",
      entityId: task.id,
      after: task,
    });

    if (task.lead_id) {
      await writeTimelineEvent(serviceClient, {
        workspaceId: payload.workspaceId,
        leadId: task.lead_id,
        actorId: actorIdFromUser(user),
        eventType: "task_created",
        relatedEntityType: "lead_task",
        relatedEntityId: task.id,
        summary: `Task created: ${task.title}`,
        body: {
          status: task.status,
          priority: task.priority,
          dueAt: task.due_at,
        },
      });
    }

    return jsonResponse({ task }, { status: 201 });
  } catch (error) {
    const { message, details } = getErrorInfo(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return errorResponse(message, status, details);
  }
});
