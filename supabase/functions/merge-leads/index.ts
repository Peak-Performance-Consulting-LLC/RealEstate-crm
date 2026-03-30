import { actorIdFromUser, writeAuditLog, writeTimelineEvent } from "../_shared/audit.ts";
import { requireUser, requireWorkspaceMembership } from "../_shared/auth.ts";
import { errorResponse, getErrorInfo, handleCors, jsonResponse } from "../_shared/http.ts";
import { mergeLeadsSchema } from "../_shared/schemas.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const payload = mergeLeadsSchema.parse(await req.json());
    const userClient = createUserClient(req);
    const serviceClient = createServiceClient();
    const user = await requireUser(userClient);

    await requireWorkspaceMembership(serviceClient, user, payload.workspaceId, ["owner", "admin", "manager"]);

    const { data: leads, error: leadError } = await serviceClient
      .from("leads")
      .select("*")
      .in("id", [payload.primaryLeadId, payload.secondaryLeadId])
      .eq("workspace_id", payload.workspaceId)
      .is("deleted_at", null);

    if (leadError || !leads || leads.length !== 2) {
      throw leadError ?? new Error("Both leads must exist");
    }

    const primaryLead = leads.find((lead) => lead.id === payload.primaryLeadId);
    const secondaryLead = leads.find((lead) => lead.id === payload.secondaryLeadId);

    if (!primaryLead || !secondaryLead) {
      throw new Error("Invalid merge request");
    }

    const mergedLeadUpdate = {
      first_name: primaryLead.first_name || secondaryLead.first_name,
      last_name: primaryLead.last_name || secondaryLead.last_name,
      company_name: primaryLead.company_name || secondaryLead.company_name,
      job_title: primaryLead.job_title || secondaryLead.job_title,
      email: primaryLead.email || secondaryLead.email,
      phone: primaryLead.phone || secondaryLead.phone,
      alternate_phone: primaryLead.alternate_phone || secondaryLead.alternate_phone,
      assigned_to: primaryLead.assigned_to || secondaryLead.assigned_to,
      source_id: primaryLead.source_id || secondaryLead.source_id,
      metadata: {
        ...(secondaryLead.metadata ?? {}),
        ...(primaryLead.metadata ?? {}),
      },
      updated_by: user.id,
    };

    const { data: updatedPrimaryLead, error: updatePrimaryError } = await serviceClient
      .from("leads")
      .update(mergedLeadUpdate)
      .eq("id", payload.primaryLeadId)
      .select("*")
      .single();

    if (updatePrimaryError || !updatedPrimaryLead) {
      throw updatePrimaryError ?? new Error("Failed to update primary lead");
    }

    const reassignTables: Array<{ table: string; column: string }> = [
      { table: "lead_contact_methods", column: "lead_id" },
      { table: "lead_notes", column: "lead_id" },
      { table: "lead_tasks", column: "lead_id" },
      { table: "lead_stage_history", column: "lead_id" },
      { table: "activity_timeline_events", column: "lead_id" },
    ];

    for (const { table, column } of reassignTables) {
      const { error } = await serviceClient
        .from(table)
        .update({ [column]: payload.primaryLeadId })
        .eq(column, payload.secondaryLeadId);

      if (error) throw error;
    }

    const { data: secondaryTags, error: tagsError } = await serviceClient
      .from("lead_tags")
      .select("tag_id")
      .eq("workspace_id", payload.workspaceId)
      .eq("lead_id", payload.secondaryLeadId);

    if (tagsError) throw tagsError;

    if ((secondaryTags ?? []).length > 0) {
      const { error: upsertTagsError } = await serviceClient.from("lead_tags").upsert(
        secondaryTags.map((tag) => ({
          workspace_id: payload.workspaceId,
          lead_id: payload.primaryLeadId,
          tag_id: tag.tag_id,
        })),
        { onConflict: "lead_id,tag_id" },
      );

      if (upsertTagsError) throw upsertTagsError;
    }

    const { error: deleteSecondaryTagsError } = await serviceClient
      .from("lead_tags")
      .delete()
      .eq("workspace_id", payload.workspaceId)
      .eq("lead_id", payload.secondaryLeadId);

    if (deleteSecondaryTagsError) throw deleteSecondaryTagsError;

    const { error: reassignCustomFieldsError } = await serviceClient
      .from("custom_field_values")
      .update({
        entity_id: payload.primaryLeadId,
      })
      .eq("workspace_id", payload.workspaceId)
      .eq("entity_type", "lead")
      .eq("entity_id", payload.secondaryLeadId);

    if (reassignCustomFieldsError) throw reassignCustomFieldsError;

    const { error: softDeleteError } = await serviceClient
      .from("leads")
      .update({
        merged_into_lead_id: payload.primaryLeadId,
        deleted_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", payload.secondaryLeadId);

    if (softDeleteError) throw softDeleteError;

    await writeAuditLog(serviceClient, {
      workspaceId: payload.workspaceId,
      actorId: actorIdFromUser(user),
      action: "lead.merged",
      entityType: "lead",
      entityId: payload.primaryLeadId,
      before: primaryLead,
      after: updatedPrimaryLead,
      metadata: {
        secondaryLeadId: payload.secondaryLeadId,
      },
    });

    await writeTimelineEvent(serviceClient, {
      workspaceId: payload.workspaceId,
      leadId: payload.primaryLeadId,
      actorId: actorIdFromUser(user),
      eventType: "lead_updated",
      relatedEntityType: "lead",
      relatedEntityId: payload.primaryLeadId,
      summary: `Merged duplicate lead ${secondaryLead.full_name} into ${updatedPrimaryLead.full_name}`,
      body: {
        secondaryLeadId: payload.secondaryLeadId,
      },
    });

    return jsonResponse({
      lead: updatedPrimaryLead,
      mergedLeadId: payload.secondaryLeadId,
    });
  } catch (error) {
    const { message, details } = getErrorInfo(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return errorResponse(message, status, details);
  }
});
