import type { LeadTask } from "@/types/domain";
import { supabase } from "@/lib/supabase";
import { invokeFunction } from "@/services/api";

export async function listTasks(workspaceId: string): Promise<LeadTask[]> {
  const { data, error } = await supabase
    .from("lead_tasks")
    .select("id, lead_id, title, description, status, priority, due_at, assigned_to, completed_at, created_at")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("due_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as LeadTask[];
}

export async function createTask(payload: Record<string, unknown>) {
  return invokeFunction<{ task: LeadTask }>("create-task", payload);
}

export async function updateTask(payload: Record<string, unknown>) {
  return invokeFunction<{ task: LeadTask }>("update-task", payload);
}
