import { actorIdFromUser, writeAuditLog } from "../_shared/audit.ts";
import { requireUser, requireWorkspaceMembership } from "../_shared/auth.ts";
import { errorResponse, getErrorInfo, handleCors, jsonResponse } from "../_shared/http.ts";
import { upsertCustomFieldSchema } from "../_shared/schemas.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const payload = upsertCustomFieldSchema.parse(await req.json());
    const userClient = createUserClient(req);
    const serviceClient = createServiceClient();
    const user = await requireUser(userClient);

    await requireWorkspaceMembership(serviceClient, user, payload.workspaceId, ["owner", "admin", "manager"]);

    const isUpdate = Boolean(payload.customFieldId);

    let previousField: Record<string, unknown> | null = null;
    if (payload.customFieldId) {
      const { data, error } = await serviceClient
        .from("custom_fields")
        .select("*")
        .eq("id", payload.customFieldId)
        .eq("workspace_id", payload.workspaceId)
        .single();

      if (error || !data) {
        throw error ?? new Error("Custom field not found");
      }

      previousField = data;
    }

    const upsertPayload = {
      id: payload.customFieldId,
      workspace_id: payload.workspaceId,
      entity_type: "lead",
      name: payload.name,
      slug: payload.slug,
      field_type: payload.fieldType,
      is_required: payload.isRequired,
      is_active: payload.isActive,
      position: payload.position,
      config: payload.config ?? {},
      created_by: user.id,
      updated_by: user.id,
    };

    const { data: customField, error: customFieldError } = await serviceClient
      .from("custom_fields")
      .upsert(upsertPayload)
      .select("*")
      .single();

    if (customFieldError || !customField) {
      throw customFieldError ?? new Error("Unable to save custom field");
    }

    const { error: deleteOptionsError } = await serviceClient
      .from("custom_field_options")
      .delete()
      .eq("workspace_id", payload.workspaceId)
      .eq("custom_field_id", customField.id);

    if (deleteOptionsError) throw deleteOptionsError;

    if (payload.options.length > 0) {
      const { error: insertOptionsError } = await serviceClient.from("custom_field_options").insert(
        payload.options.map((option) => ({
          workspace_id: payload.workspaceId,
          custom_field_id: customField.id,
          label: option.label,
          value: option.value,
          color: option.color ?? null,
          position: option.position,
        })),
      );

      if (insertOptionsError) throw insertOptionsError;
    }

    await writeAuditLog(serviceClient, {
      workspaceId: payload.workspaceId,
      actorId: actorIdFromUser(user),
      action: isUpdate ? "custom_field.updated" : "custom_field.created",
      entityType: "custom_field",
      entityId: customField.id,
      before: previousField,
      after: customField,
    });

    return jsonResponse({ customField });
  } catch (error) {
    const { message, details } = getErrorInfo(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return errorResponse(message, status, details);
  }
});
