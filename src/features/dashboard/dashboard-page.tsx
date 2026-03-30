import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/app/workspace-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getDashboardMetrics, listRecentLeads } from "@/services/dashboard.service";
import { formatDateTime } from "@/lib/utils";

export function DashboardPage() {
  const { activeWorkspaceId, activeMembership } = useWorkspace();
  const metricsQuery = useQuery({
    queryKey: ["dashboard", activeWorkspaceId, "metrics"],
    queryFn: () => getDashboardMetrics(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });
  const recentLeadsQuery = useQuery({
    queryKey: ["dashboard", activeWorkspaceId, "recent-leads"],
    queryFn: () => listRecentLeads(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });

  const cards = [
    { label: "Total leads", value: metricsQuery.data?.totalLeads ?? 0 },
    { label: "Open tasks", value: metricsQuery.data?.openTasks ?? 0 },
    { label: "Due today", value: metricsQuery.data?.dueToday ?? 0 },
    { label: "New this week", value: metricsQuery.data?.newThisWeek ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader description="Phase 1 operations view focused on lead visibility, team productivity, and pipeline readiness." title="Dashboard" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-3xl">{card.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent leads</CardTitle>
            <CardDescription>Fresh activity in your workspace. Communication and AI events plug into the same timeline later.</CardDescription>
          </CardHeader>
          <CardContent>
            {(recentLeadsQuery.data ?? []).length === 0 ? (
              <EmptyState
                description="Create your first lead from the leads page or import a CSV skeleton to populate the workspace."
                title="No leads yet"
              />
            ) : (
              <div className="space-y-3">
                {recentLeadsQuery.data?.map((lead) => (
                  <Link className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50" key={lead.id} to={`/leads/${lead.id}`}>
                    <div>
                      <p className="font-semibold text-slate-900">{lead.full_name}</p>
                      <p className="text-sm text-slate-500">{lead.email || lead.phone || "No contact method yet"}</p>
                    </div>
                    <div className="text-right">
                      <Badge>{lead.status}</Badge>
                      <p className="mt-2 text-xs text-slate-500">{formatDateTime(lead.created_at)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace posture</CardTitle>
            <CardDescription>Quick read on tenancy, role context, and import readiness.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">Active role</p>
              <p className="text-sm text-slate-500">{activeMembership?.role}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">Isolation model</p>
              <p className="text-sm text-slate-500">Workspace-scoped Postgres RLS on every tenant-owned table.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">Phase 1 focus</p>
              <p className="text-sm text-slate-500">Foundation, CRUD, pipelines, tasks, imports, and activity timeline primitives.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
