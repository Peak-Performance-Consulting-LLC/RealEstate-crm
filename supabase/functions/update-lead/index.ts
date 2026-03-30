import { actorIdFromUser, writeAuditLog, writeTimelineEvent } from "../_shared/audit.ts";
import { requireUser, requireWorkspaceMembership } from "../_shared/auth.ts";
import { errorResponse, getErrorInfo, handleCors, jsonResponse } from "../_shared/http.ts";
import { ensureWorkspaceAssignee, ensureWorkspaceSource, resolvePipelineId, resolveStageId } from "../_shared/leads.ts";
import { updateLeadSchema } from "../_shared/schemas.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const payload = updateLeadSchema.parse(await req.json());
    const userClient = createUserClient(req);
    const serviceClient = createServiceClient();
    const user = await requireUser(userClient);

    await requireWorkspaceMembership(serviceClient, user, payload.workspaceId, ["owner", "admin", "manager", "agent"]);

    const { data: existingLead, error: existingLeadError } = await serviceClient
      .from("leads")
      .select("*")
      .eq("id", payload.leadId)
      .eq("workspace_id", payload.workspaceId)
      .is("deleted_at", null)
      .single();

    if (existingLeadError || !existingLead) {
      throw existingLeadError ?? new Error("Lead not found");
    }

    const updatePayload: Record<string, unknown> = {
      updated_by: user.id,
    };

    let resolvedPipelineId = existingLead.pipeline_id as string | null;

    if (payload.pipelineId !== undefined) {
      resolvedPipelineId = await resolvePipelineId(serviceClient, payload.workspaceId, payload.pipelineId ?? null);
      updatePayload.pipeline_id = resolvedPipelineId;
    }

    if (payload.currentStageId !== undefined) {
      if (!resolvedPipelineId) throw new Error("Pipeline not found");
      updatePayload.current_stage_id = await resolveStageId(serviceClient, payload.workspaceId, resolvedPipelineId, payload.currentStageId ?? null);
    } else if (payload.pipelineId !== undefined && resolvedPipelineId !== existingLead.pipeline_id) {
      updatePayload.current_stage_id = await resolveStageId(serviceClient, payload.workspaceId, resolvedPipelineId, null);
    }

    if (payload.sourceId !== undefined) {
      if (payload.sourceId === null) {
        updatePayload.source_id = null;
      } else {
        await ensureWorkspaceSource(serviceClient, payload.workspaceId, payload.sourceId);
        updatePayload.source_id = payload.sourceId;
      }
    }

    if (payload.assignedTo !== undefined) {
      if (payload.assignedTo === null) {
        updatePayload.assigned_to = null;
      } else {
        await ensureWorkspaceAssignee(serviceClient, payload.workspaceId, payload.assignedTo);
        updatePayload.assigned_to = payload.assignedTo;
      }
    }

    if (payload.leadType !== undefined) updatePayload.lead_type = payload.leadType;
    if (payload.firstName !== undefined) updatePayload.first_name = payload.firstName;
    if (payload.lastName !== undefined) updatePayload.last_name = payload.lastName;
    if (payload.companyName !== undefined) updatePayload.company_name = payload.companyName;
    if (payload.jobTitle !== undefined) updatePayload.job_title = payload.jobTitle;
    if (payload.email !== undefined) updatePayload.email = payload.email;
    if (payload.phone !== undefined) updatePayload.phone = payload.phone;
    if (payload.alternatePhone !== undefined) updatePayload.alternate_phone = payload.alternatePhone;
    if (payload.status !== undefined) updatePayload.status = payload.status;
    if (payload.priority !== undefined) updatePayload.priority = payload.priority;
    if (payload.propertyPreferences !== undefined) updatePayload.property_preferences = payload.propertyPreferences;
    if (payload.address !== undefined) updatePayload.address = payload.address;
    if (payload.metadata !== undefined) updatePayload.metadata = payload.metadata;

    const { data: updatedLead, error: updatedLeadError } = await serviceClient
      .from("leads")
      .update(updatePayload)
      .eq("id", payload.leadId)
      .eq("workspace_id", payload.workspaceId)
      .select("*")
      .single();

    if (updatedLeadError || !updatedLead) {
      throw updatedLeadError ?? new Error("Unable to update lead");
    }

    if (payload.contactMethods !== undefined) {
      const { error: softDeleteContactsError } = await serviceClient
        .from("lead_contact_methods")
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq("workspace_id", payload.workspaceId)
        .eq("lead_id", payload.leadId)
        .is("deleted_at", null);

      if (softDeleteContactsError) throw softDeleteContactsError;

      if (payload.contactMethods.length > 0) {
        const { error: insertContactsError } = await serviceClient.from("lead_contact_methods").insert(
          payload.contactMethods.map((method) => ({
            workspace_id: payload.workspaceId,
            lead_id: payload.leadId,
            type: method.type,
            label: method.label ?? null,
            value: method.value,
            is_primary: method.isPrimary,
          })),
        );

        if (insertContactsError) throw insertContactsError;
      }
    }

    if (payload.tagIds !== undefined) {
      const { error: deleteTagError } = await serviceClient
        .from("lead_tags")
        .delete()
        .eq("workspace_id", payload.workspaceId)
        .eq("lead_id", payload.leadId);

      if (deleteTagError) throw deleteTagError;

      if (payload.tagIds.length > 0) {
        const { error: insertTagError } = await serviceClient.from("lead_tags").insert(
          payload.tagIds.map((tagId) => ({
            workspace_id: payload.workspaceId,
            lead_id: payload.leadId,
            tag_id: tagId,
          })),
        );

        if (insertTagError) throw insertTagError;
      }
    }

    if (payload.customFieldValues !== undefined) {
      const { error: upsertValueError } = await serviceClient.from("custom_field_values").upsert(
        payload.customFieldValues.map((fieldValue) => ({
          workspace_id: payload.workspaceId,
          custom_field_id: fieldValue.customFieldId,
          entity_type: "lead",
          entity_id: payload.leadId,
          value_text: fieldValue.valueText ?? null,
          value_number: fieldValue.valueNumber ?? null,
          value_boolean: fieldValue.valueBoolean ?? null,
          value_date: fieldValue.valueDate ?? null,
          value_json: fieldValue.valueJson ?? null,
        })),
        {
          onConflict: "custom_field_id,entity_type,entity_id",
        },
      );

      if (upsertValueError) throw upsertValueError;
    }

    await writeAuditLog(serviceClient, {
      workspaceId: payload.workspaceId,
      actorId: actorIdFromUser(user),
      action: "lead.updated",
      entityType: "lead",
      entityId: payload.leadId,
      before: existingLead,
      after: updatedLead,
    });

    await writeTimelineEvent(serviceClient, {
      workspaceId: payload.workspaceId,
      leadId: payload.leadId,
      actorId: actorIdFromUser(user),
      eventType: "lead_updated",
      relatedEntityType: "lead",
      relatedEntityId: payload.leadId,
      summary: `Lead ${updatedLead.full_name} updated`,
      body: {
        changedKeys: Object.keys(updatePayload),
      },
    });

    return jsonResponse({ lead: updatedLead });
  } catch (error) {
    const { message, details } = getErrorInfo(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return errorResponse(message, status, details);
  }
});
