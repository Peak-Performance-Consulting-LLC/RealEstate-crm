import type { SupabaseClient, User } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod@3.24.3";

export const workspaceRoleSchema = z.enum(["owner", "admin", "manager", "agent", "readonly"]);

export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;

export async function requireUser(userClient: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function requireWorkspaceMembership(
  serviceClient: SupabaseClient,
  user: User,
  workspaceId: string,
  allowedRoles?: WorkspaceRole[],
) {
  const { data, error } = await serviceClient
    .from("workspace_members")
    .select("id, profile_id, workspace_id, status, roles!inner(slug, name)")
    .eq("workspace_id", workspaceId)
    .eq("profile_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Forbidden");
  }

  const roleRecord = Array.isArray(data.roles) ? data.roles[0] : data.roles;
  const roleSlug = z.string().parse(roleRecord.slug);

  if (allowedRoles && !allowedRoles.includes(workspaceRoleSchema.parse(roleSlug))) {
    throw new Error("Forbidden");
  }

  return {
    membershipId: data.id,
    role: workspaceRoleSchema.parse(roleSlug),
  };
}
