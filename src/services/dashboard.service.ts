import type { DashboardMetrics, LeadSummary } from "@/types/domain";
import { supabase } from "@/lib/supabase";

export async function getDashboardMetrics(workspaceId: string): Promise<DashboardMetrics> {
  const today = new Date();
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - 7);

  const [leadsResult, tasksResult, dueTodayResult, weeklyResult] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).is("deleted_at", null),
    supabase
      .from("lead_tasks")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("status", ["open", "in_progress"])
      .is("deleted_at", null),
    supabase
      .from("lead_tasks")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .lte("due_at", endOfDay.toISOString())
      .in("status", ["open", "in_progress"])
      .is("deleted_at", null),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", startOfWeek.toISOString())
      .is("deleted_at", null),
  ]);

  if (leadsResult.error) throw leadsResult.error;
  if (tasksResult.error) throw tasksResult.error;
  if (dueTodayResult.error) throw dueTodayResult.error;
  if (weeklyResult.error) throw weeklyResult.error;

  return {
    totalLeads: leadsResult.count ?? 0,
    openTasks: tasksResult.count ?? 0,
    dueToday: dueTodayResult.count ?? 0,
    newThisWeek: weeklyResult.count ?? 0,
  };
}

export async function listRecentLeads(workspaceId: string): Promise<LeadSummary[]> {
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, workspace_id, lead_type, first_name, last_name, full_name, email, phone, alternate_phone, status, priority, assigned_to, source_id, pipeline_id, current_stage_id, property_preferences, address, metadata, created_at, updated_at",
    )
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;
  return (data ?? []) as LeadSummary[];
}
