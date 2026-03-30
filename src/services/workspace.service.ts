import type { Invitation, TeamMember, WorkspaceMembership, WorkspaceSummary } from "@/types/domain";
import { supabase } from "@/lib/supabase";
import { invokeFunction } from "@/services/api";

function pickRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function listMyWorkspaces(): Promise<WorkspaceMembership[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces!inner(id, name, slug), roles!inner(slug)")
    .eq("status", "active");

  if (error) throw error;

  return (data ?? []).map((row) => {
    const workspace = pickRelation(row.workspaces) as { name: string; slug: string } | null;
    const role = pickRelation(row.roles) as { slug: WorkspaceMembership["role"] } | null;
    return {
    workspaceId: row.workspace_id as string,
    workspaceName: workspace?.name ?? "Workspace",
    workspaceSlug: workspace?.slug ?? "",
    role: role?.slug ?? "readonly",
  };
  });
}

export async function createWorkspace(payload: { name: string; slug: string; timezone: string }) {
  return invokeFunction<{ workspace: WorkspaceSummary }>("create-workspace", payload);
}

export async function listTeamMembers(workspaceId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("id, status, profiles!inner(id, email, first_name, last_name), roles!inner(slug)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const profile = pickRelation(row.profiles) as { id: string; email: string; first_name: string | null; last_name: string | null } | null;
    const role = pickRelation(row.roles) as { slug: TeamMember["role"] } | null;
    return {
      id: profile?.id ?? row.id,
      email: profile?.email ?? "",
      fullName: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email || "Unknown member",
      role: role?.slug ?? "readonly",
      status: row.status as string,
    };
  });
}

export async function inviteMember(payload: { workspaceId: string; email: string; roleSlug: string }) {
  return invokeFunction<{ invitation: Invitation }>("invite-member", payload);
}

export async function listPendingInvitations(workspaceId: string): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from("invitations")
    .select("id, email, status, expires_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Invitation[];
}

export async function getWorkspace(workspaceId: string): Promise<WorkspaceSummary> {
  const { data, error } = await supabase.from("workspaces").select("id, name, slug, status, settings").eq("id", workspaceId).single();
  if (error) throw error;
  return data as WorkspaceSummary;
}

export async function updateWorkspaceSettings(workspaceId: string, settings: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("workspaces")
    .update({ settings })
    .eq("id", workspaceId)
    .select("id, name, slug, status, settings")
    .single();

  if (error) throw error;
  return data as WorkspaceSummary;
}

export async function listRoles() {
  const { data, error } = await supabase.from("roles").select("id, slug, name, description, permissions").order("name");
  if (error) throw error;
  return data ?? [];
}
