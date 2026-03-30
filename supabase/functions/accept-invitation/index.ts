import { actorIdFromUser, writeAuditLog } from "../_shared/audit.ts";
import { requireUser } from "../_shared/auth.ts";
import { errorResponse, getErrorInfo, handleCors, jsonResponse } from "../_shared/http.ts";
import { acceptInvitationSchema } from "../_shared/schemas.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const payload = acceptInvitationSchema.parse(await req.json());
    const userClient = createUserClient(req);
    const serviceClient = createServiceClient();
    const user = await requireUser(userClient);

    const { data: invitation, error: invitationError } = await serviceClient
      .from("invitations")
      .select("id, workspace_id, email, role_id, status, expires_at")
      .eq("token", payload.token)
      .single();

    if (invitationError || !invitation) {
      throw invitationError ?? new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation is no longer active");
    }

    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      throw new Error("Invitation has expired");
    }

    if ((user.email ?? "").toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error("Invitation email mismatch");
    }

    const { error: membershipError } = await serviceClient.from("workspace_members").upsert(
      {
        workspace_id: invitation.workspace_id,
        profile_id: user.id,
        role_id: invitation.role_id,
        status: "active",
        joined_at: new Date().toISOString(),
      },
      {
        onConflict: "workspace_id,profile_id",
      },
    );

    if (membershipError) {
      throw membershipError;
    }

    const { error: invitationUpdateError } = await serviceClient
      .from("invitations")
      .update({
        status: "accepted",
        accepted_by: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (invitationUpdateError) {
      throw invitationUpdateError;
    }

    await writeAuditLog(serviceClient, {
      workspaceId: invitation.workspace_id,
      actorId: actorIdFromUser(user),
      action: "member.accepted_invitation",
      entityType: "invitation",
      entityId: invitation.id,
      after: {
        status: "accepted",
        profileId: user.id,
      },
    });

    return jsonResponse({
      accepted: true,
      workspaceId: invitation.workspace_id,
    });
  } catch (error) {
    const { message, details } = getErrorInfo(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return errorResponse(message, status, details);
  }
});
