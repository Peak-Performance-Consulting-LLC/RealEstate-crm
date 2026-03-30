import { actorIdFromUser, writeAuditLog } from "../_shared/audit.ts";
import { requireUser, requireWorkspaceMembership } from "../_shared/auth.ts";
import { errorResponse, getErrorInfo, handleCors, jsonResponse } from "../_shared/http.ts";
import { inviteMemberSchema } from "../_shared/schemas.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const payload = inviteMemberSchema.parse(await req.json());
    const userClient = createUserClient(req);
    const serviceClient = createServiceClient();
    const user = await requireUser(userClient);

    await requireWorkspaceMembership(serviceClient, user, payload.workspaceId, ["owner", "admin", "manager"]);

    const { data: role, error: roleError } = await serviceClient
      .from("roles")
      .select("id, slug, name")
      .eq("slug", payload.roleSlug)
      .single();

    if (roleError || !role) {
      throw roleError ?? new Error("Role not found");
    }

    const { data: invitation, error: invitationError } = await serviceClient
      .from("invitations")
      .insert({
        workspace_id: payload.workspaceId,
        email: payload.email,
        role_id: role.id,
        invited_by: user.id,
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        metadata: {
          delivery: "pending-email-provider",
        },
      })
      .select("id, email, token, status, expires_at")
      .single();

    if (invitationError || !invitation) {
      throw invitationError ?? new Error("Unable to create invitation");
    }

    await writeAuditLog(serviceClient, {
      workspaceId: payload.workspaceId,
      actorId: actorIdFromUser(user),
      action: "member.invited",
      entityType: "invitation",
      entityId: invitation.id,
      after: invitation,
      metadata: {
        role: role.slug,
      },
    });

    return jsonResponse({
      invitation,
      delivery: {
        provider: "placeholder",
        message: "Email delivery is intentionally abstracted for Phase 1.",
      },
    });
  } catch (error) {
    const { message, details } = getErrorInfo(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return errorResponse(message, status, details);
  }
});
