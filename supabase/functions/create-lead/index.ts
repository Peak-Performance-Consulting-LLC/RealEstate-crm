import { actorIdFromUser, writeAuditLog, writeTimelineEvent } from "../_shared/audit.ts";
import { requireUser, requireWorkspaceMembership } from "../_shared/auth.ts";
import { errorResponse, getErrorInfo, handleCors, jsonResponse } from "../_shared/http.ts";
import { ensureWorkspaceAssignee, ensureWorkspaceSource, resolvePipelineId, resolveStageId } from "../_shared/leads.ts";
import { createLeadSchema } from "../_shared/schemas.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const payload = createLeadSchema.parse(await req.json());
    const userClient = createUserClient(req);
    const serviceClient = createServiceClient();
    const user = await requireUser(userClient);

    await requireWorkspaceMembership(serviceClient, user, payload.workspaceId, ["owner", "admin", "manager", "agent"]);

    await ensureWorkspaceSource(serviceClient, payload.workspaceId, payload.sourceId);

    if (payload.assignedTo) {
      await ensureWorkspaceAssignee(serviceClient, payload.workspaceId, payload.assignedTo);
    }

    const pipelineId = await resolvePipelineId(serviceClient, payload.workspaceId, payload.pipelineId ?? null);
    const currentStageId = await resolveStageId(serviceClient, payload.workspaceId, pipelineId, payload.currentStageId ?? null);

    const { data: lead, error: leadError } = await serviceClient
      .from("leads")
      .insert({
        workspace_id: payload.workspaceId,
        lead_type: payload.leadType,
        pipeline_id: pipelineId,
        current_stage_id: currentStageId,
        source_id: payload.sourceId,
        assigned_to: payload.assignedTo ?? null,
        first_name: payload.firstName,
        last_name: payload.lastName ?? null,
        company_name: payload.companyName ?? null,
        job_title: payload.jobTitle ?? null,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        alternate_phone: payload.alternatePhone ?? null,
        status: payload.status,
        priority: payload.priority,
        property_preferences: payload.propertyPreferences ?? {},
        address: payload.address ?? {},
        metadata: payload.metadata ?? {},
        created_by: user.id,
        updated_by: user.id,
      })
      .select("*")
      .single();

    if (leadError || !lead) {
      throw leadError ?? new Error("Unable to create lead");
    }

    if (payload.contactMethods.length > 0) {
      const { error: contactError } = await serviceClient.from("lead_contact_methods").insert(
        payload.contactMethods.map((method) => ({
          workspace_id: payload.workspaceId,
          lead_id: lead.id,
          type: method.type,
          label: method.label ?? null,
          value: method.value,
          is_primary: method.isPrimary,
        })),
      );

      if (contactError) throw contactError;
    }

    if (payload.tagIds.length > 0) {
      const { error: tagError } = await serviceClient.from("lead_tags").insert(
        payload.tagIds.map((tagId) => ({
          workspace_id: payload.workspaceId,
          lead_id: lead.id,
          tag_id: tagId,
        })),
      );

      if (tagError) throw tagError;
    }

    if (payload.customFieldValues.length > 0) {
      const { error: valueError } = await serviceClient.from("custom_field_values").upsert(
        payload.customFieldValues.map((fieldValue) => ({
          workspace_id: payload.workspaceId,
          custom_field_id: fieldValue.customFieldId,
          entity_type: "lead",
          entity_id: lead.id,
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

      if (valueError) throw valueError;
    }

    if (payload.initialInquirySummary) {
      const { error: noteError } = await serviceClient.from("lead_notes").insert({
        workspace_id: payload.workspaceId,
        lead_id: lead.id,
        body: payload.initialInquirySummary,
        created_by: user.id,
      });

      if (noteError) throw noteError;
    }

    const { error: stageHistoryError } = await serviceClient.from("lead_stage_history").insert({
      workspace_id: payload.workspaceId,
      lead_id: lead.id,
      pipeline_id: pipelineId,
      from_stage_id: null,
      to_stage_id: currentStageId,
      moved_by: user.id,
      reason: "Lead created",
    });

    if (stageHistoryError) throw stageHistoryError;

    await writeAuditLog(serviceClient, {
      workspaceId: payload.workspaceId,
      actorId: actorIdFromUser(user),
      action: "lead.created",
      entityType: "lead",
      entityId: lead.id,
      after: lead,
    });

    await writeTimelineEvent(serviceClient, {
      workspaceId: payload.workspaceId,
      leadId: lead.id,
      actorId: actorIdFromUser(user),
      eventType: "lead_created",
      relatedEntityType: "lead",
      relatedEntityId: lead.id,
      summary: `Lead ${lead.full_name} created`,
      body: {
        leadType: payload.leadType,
        sourceId: payload.sourceId,
        pipelineId,
        currentStageId,
      },
    });

    return jsonResponse({ lead }, { status: 201 });
  } catch (error) {
    const { message, details } = getErrorInfo(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return errorResponse(message, status, details);
  }
});
