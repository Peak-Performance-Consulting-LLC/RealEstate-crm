import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { BellRing, CalendarClock, ClipboardList, FilePenLine, NotebookPen, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AppSelect } from "@/components/ui/app-select";
import { useWorkspace } from "@/app/workspace-provider";
import { LeadForm, type LeadFormValues } from "@/features/leads/components/lead-form";
import { TaskForm } from "@/features/tasks/components/task-form";
import { getLeadDetail, listPipelines, listSources, moveLeadStage } from "@/services/leads.service";
import { listTeamMembers } from "@/services/workspace.service";
import { cn, formatDateTime } from "@/lib/utils";

function leadTypeLabel(value?: string | null) {
  if (!value) return "Lead";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function priorityBadgeClass(priority: string) {
  switch (priority) {
    case "urgent":
      return "border-red-200 bg-red-50 text-red-700";
    case "high":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "medium":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function leadTypeBadgeClass(leadType?: string | null) {
  switch (leadType) {
    case "seller":
    case "landlord":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "investor":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "tenant":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function buildEditDefaults(lead: Awaited<ReturnType<typeof getLeadDetail>>["lead"]): Partial<LeadFormValues> {
  const prefs = lead.property_preferences ?? {};
  const metadata = lead.metadata ?? {};
  return {
    leadType: lead.lead_type ?? "buyer",
    firstName: lead.first_name,
    lastName: lead.last_name ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    alternatePhone: lead.alternate_phone ?? "",
    sourceId: lead.source_id ?? "",
    assignedTo: lead.assigned_to ?? "",
    status: lead.status as LeadFormValues["status"],
    priority: lead.priority as LeadFormValues["priority"],
    locations: prefs.locations?.join(", ") ?? "",
    propertyTypes: prefs.propertyTypes?.join(", ") ?? "",
    budgetMin: prefs.budgetMin?.toString() ?? "",
    budgetMax: prefs.budgetMax?.toString() ?? "",
    rentMin: prefs.rentMin?.toString() ?? "",
    rentMax: prefs.rentMax?.toString() ?? "",
    timeline: prefs.timeline ?? "",
    financingNeeded: prefs.financingNeeded ?? "not_sure",
    expectedSalePrice: prefs.expectedSalePrice?.toString() ?? "",
    expectedRent: prefs.expectedRent?.toString() ?? "",
    propertyAddress: lead.address?.fullAddress ?? "",
    availableFrom: prefs.availableFrom ? String(prefs.availableFrom).slice(0, 10) : "",
    roiGoal: prefs.roiGoal ?? "",
    sourceDetails: typeof metadata.sourceDetails === "string" ? metadata.sourceDetails : "",
  };
}

function requirementSummary(lead: Awaited<ReturnType<typeof getLeadDetail>>["lead"]) {
  const prefs = lead.property_preferences ?? {};
  const address = lead.address ?? {};

  if (lead.lead_type === "seller" || lead.lead_type === "landlord") {
    return [
      { label: "Property address", value: address.fullAddress ?? "Not added" },
      { label: "Property type", value: prefs.propertyTypes?.join(", ") ?? "Not added" },
      { label: lead.lead_type === "seller" ? "Expected sale price" : "Expected rent", value: String(prefs.expectedSalePrice ?? prefs.expectedRent ?? "Not added") },
      { label: lead.lead_type === "landlord" ? "Available from" : "Timeline", value: prefs.availableFrom ?? prefs.timeline ?? "Not added" },
    ];
  }

  return [
    { label: "Locations", value: prefs.locations?.join(", ") ?? "Not added" },
    { label: "Property types", value: prefs.propertyTypes?.join(", ") ?? "Not added" },
    {
      label: lead.lead_type === "tenant" ? "Rent range" : lead.lead_type === "investor" ? "Investment budget" : "Budget range",
      value:
        lead.lead_type === "tenant"
          ? prefs.rentMin || prefs.rentMax
            ? `${prefs.rentMin ?? "-"} to ${prefs.rentMax ?? "-"}`
            : "Not added"
          : prefs.budgetMin || prefs.budgetMax
            ? `${prefs.budgetMin ?? "-"} to ${prefs.budgetMax ?? "-"}`
            : "Not added",
    },
    { label: "Timeline", value: prefs.timeline ?? prefs.availableFrom ?? "Not added" },
    {
      label: lead.lead_type === "investor" ? "ROI goal" : "Financing needed",
      value: lead.lead_type === "investor" ? prefs.roiGoal ?? "Not added" : prefs.financingNeeded ?? "Not added",
    },
  ];
}

export function LeadDetailPage() {
  const { leadId } = useParams();
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const leadQuery = useQuery({
    queryKey: ["lead-detail", activeWorkspaceId, leadId],
    queryFn: () => getLeadDetail(activeWorkspaceId!, leadId!),
    enabled: Boolean(activeWorkspaceId && leadId),
  });
  const pipelinesQuery = useQuery({
    queryKey: ["pipelines", activeWorkspaceId],
    queryFn: () => listPipelines(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });
  const sourcesQuery = useQuery({
    queryKey: ["lead-sources", activeWorkspaceId, "detail"],
    queryFn: () => listSources(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });
  const teamQuery = useQuery({
    queryKey: ["team-members", activeWorkspaceId, "detail"],
    queryFn: () => listTeamMembers(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });

  const leadDetail = leadQuery.data;
  const lead = leadDetail?.lead;
  const stages = useMemo(() => pipelinesQuery.data?.flatMap((pipeline) => pipeline.stages) ?? [], [pipelinesQuery.data]);
  const stageMap = useMemo(() => new Map(stages.map((stage) => [stage.id, stage])), [stages]);
  const sourceMap = useMemo(() => new Map((sourcesQuery.data ?? []).map((source) => [source.id, source.name])), [sourcesQuery.data]);
  const assigneeMap = useMemo(() => new Map((teamQuery.data ?? []).map((member) => [member.id, member.fullName])), [teamQuery.data]);

  const nextFollowUp = useMemo(() => {
    return [...(leadDetail?.tasks ?? [])]
      .filter((task) => ["open", "in_progress"].includes(task.status))
      .sort((a, b) => {
        const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY;
        const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY;
        return aDue - bDue;
      })[0];
  }, [leadDetail?.tasks]);

  const lastActivity = leadDetail?.timeline[0]?.occurred_at ?? lead?.updated_at ?? null;

  const stageChangeMutation = useMutation({
    mutationFn: async (toStageId: string) => {
      if (!activeWorkspaceId || !lead?.pipeline_id || !leadId) throw new Error("Lead context missing");
      return moveLeadStage({
        workspaceId: activeWorkspaceId,
        leadId,
        pipelineId: lead.pipeline_id,
        toStageId,
      });
    },
    onSuccess: async () => {
      toast.success("Stage updated");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lead-detail", activeWorkspaceId, leadId] }),
        queryClient.invalidateQueries({ queryKey: ["leads", activeWorkspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["pipelines-board", activeWorkspaceId] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to move lead"),
  });

  if (!lead) {
    return (
      <div className="space-y-6">
        <PageHeader description="Operational lead workspace for next action, requirements, and timeline context." title="Lead profile" />
        <EmptyState description="Select a lead from the leads list to see full details." title="Lead not found" />
      </div>
    );
  }

  const currentStage = lead.current_stage_id ? stageMap.get(lead.current_stage_id) : null;
  const sourceLabel = lead.source_id ? (sourceMap.get(lead.source_id) ?? lead.source_id) : "No source";
  const assigneeLabel = lead.assigned_to ? (assigneeMap.get(lead.assigned_to) ?? lead.assigned_to) : "Unassigned";
  const editDefaults = buildEditDefaults(lead);
  const propertyRows = requirementSummary(lead);

  return (
    <div className="space-y-6">
      <PageHeader
        description="See the lead context, next action, and real-estate requirement details without hunting across tabs."
        title="Lead detail"
      />

      <div className="sticky top-24 z-20 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-slate-900">{lead.full_name}</h2>
              <Badge className={leadTypeBadgeClass(lead.lead_type)}>{leadTypeLabel(lead.lead_type)}</Badge>
              <Badge>{currentStage?.name ?? "No stage"}</Badge>
              <Badge className={priorityBadgeClass(lead.priority)}>{lead.priority}</Badge>
            </div>
            <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
              <p>
                <span className="font-medium text-slate-900">Source:</span> {sourceLabel}
              </p>
              <p>
                <span className="font-medium text-slate-900">Assigned:</span>{" "}
                <span className={cn(!lead.assigned_to && "font-medium text-red-600")}>{assigneeLabel}</span>
              </p>
              <p>
                <span className="font-medium text-slate-900">Last activity:</span> {formatDateTime(lastActivity)}
              </p>
              <p>
                <span className="font-medium text-slate-900">Next follow-up:</span> {nextFollowUp?.due_at ? formatDateTime(nextFollowUp.due_at) : "Not scheduled"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => toast("Note composer is the next workflow slice.")} size="sm" variant="outline">
              <NotebookPen className="h-4 w-4" />
              Add note
            </Button>
            <Button onClick={() => setShowTaskForm((current) => !current)} size="sm" variant="outline">
              <ClipboardList className="h-4 w-4" />
              Create task
            </Button>
            <Button onClick={() => setShowTaskForm((current) => !current)} size="sm" variant="outline">
              <BellRing className="h-4 w-4" />
              Schedule follow-up
            </Button>
            {lead.phone ? (
              <Button asChild size="sm" variant="outline">
                <a href={`tel:${lead.phone}`}>
                  <PhoneCall className="h-4 w-4" />
                  Call
                </a>
              </Button>
            ) : null}
            <Button onClick={() => setShowEditForm((current) => !current)} size="sm">
              <FilePenLine className="h-4 w-4" />
              Edit lead
            </Button>
          </div>
        </div>
      </div>

      {showEditForm ? <LeadForm defaultValues={editDefaults} leadId={lead.id} onSuccess={() => setShowEditForm(false)} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Lead overview</CardTitle>
            <CardDescription>Core contact and ownership context for the team operating this lead.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Primary phone</p>
              <p className="font-semibold text-slate-900">{lead.phone || "Not added"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Primary email</p>
              <p className="font-semibold text-slate-900">{lead.email || "Not added"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Alternate contact</p>
              <p className="font-semibold text-slate-900">{lead.alternate_phone || "Not added"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Current stage</p>
              <div className="mt-2">
                <AppSelect
                  onValueChange={(value) => stageChangeMutation.mutate(value)}
                  options={stages.map((stage) => ({ label: stage.name, value: stage.id }))}
                  value={lead.current_stage_id ?? undefined}
                />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-500">Source</p>
              <p className="font-semibold text-slate-900">{sourceLabel}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Assigned agent</p>
              <p className={cn("font-semibold text-slate-900", !lead.assigned_to && "text-red-600")}>{assigneeLabel}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next action / follow-up</CardTitle>
            <CardDescription>Keep the next commitment visible so this lead does not stall.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Next follow-up</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{nextFollowUp?.title ?? "No follow-up task yet"}</p>
              <p className="mt-1 text-sm text-slate-500">{nextFollowUp?.due_at ? formatDateTime(nextFollowUp.due_at) : "Create a task to make the next step explicit."}</p>
            </div>
            {showTaskForm ? <TaskForm leadId={lead.id} onSuccess={() => setShowTaskForm(false)} /> : null}
            {!showTaskForm ? (
              <Button onClick={() => setShowTaskForm(true)} variant="outline">
                <CalendarClock className="h-4 w-4" />
                Add the next follow-up
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Property requirement / property details</CardTitle>
            <CardDescription>Real-estate context changes based on lead type so the team can act with the right frame.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {propertyRows.map((row) => (
              <div className="rounded-2xl border border-slate-200 p-4" key={row.label}>
                <p className="text-sm text-slate-500">{row.label}</p>
                <p className="mt-2 font-medium text-slate-900">{row.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Raw deal context and follow-up nuance belong close to the main workflow, not buried below metadata.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {leadDetail?.notes.length === 0 ? (
              <EmptyState description="Create-time inquiry summaries and future note composer entries will appear here." title="No notes yet" />
            ) : (
              leadDetail?.notes.map((note) => (
                <div className="rounded-2xl border border-slate-200 p-4" key={note.id}>
                  <p className="text-sm text-slate-700">{note.body}</p>
                  <p className="mt-3 text-xs text-slate-500">{formatDateTime(note.created_at)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
            <CardDescription>Follow-up and execution items linked to this lead.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {leadDetail?.tasks.length === 0 ? (
              <EmptyState description="No tasks are linked yet. Create one from the next action card." title="No tasks yet" />
            ) : (
              leadDetail?.tasks.map((task) => (
                <div className="rounded-2xl border border-slate-200 p-4" key={task.id}>
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-slate-900">{task.title}</p>
                    <Badge>{task.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{task.description || "No task notes"}</p>
                  <p className="mt-2 text-xs text-slate-500">Due {formatDateTime(task.due_at)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Recent lead activity ordered by event time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {leadDetail?.timeline.length === 0 ? (
              <EmptyState description="Lead creation, stage changes, and future communication events will appear here." title="No timeline yet" />
            ) : (
              leadDetail?.timeline.map((event) => (
                <div className="rounded-2xl border border-slate-200 p-4" key={event.id}>
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-slate-900">{event.summary}</p>
                    <Badge>{event.event_type}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{formatDateTime(event.occurred_at)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>Helpful labels, kept intentionally lower priority than execution context.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {leadDetail?.tags.length === 0 ? <Badge>No tags yet</Badge> : leadDetail?.tags.map((tag) => <Badge key={tag.tag_id}>{tag.name}</Badge>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custom fields</CardTitle>
            <CardDescription>Flexible enrichment beyond the core real-estate requirement blocks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {leadDetail?.customFields.length === 0 ? (
              <EmptyState description="Add workspace custom fields when the core CRM model needs extension." title="No custom fields yet" />
            ) : (
              leadDetail?.customFields.map((field) => {
                const value = leadDetail.customFieldValues.find((fieldValue) => fieldValue.custom_field_id === field.id);
                return (
                  <div className="rounded-2xl border border-slate-200 p-4" key={field.id}>
                    <p className="font-medium text-slate-900">{field.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {value?.value_text ??
                        value?.value_number?.toString() ??
                        value?.value_date ??
                        JSON.stringify(value?.value_json ?? {})}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stage history & metadata</CardTitle>
            <CardDescription>Lower-priority operational trace for auditing the path through the pipeline.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {leadDetail?.stageHistory.length === 0 ? (
                <EmptyState description="Stage movements will appear here as the lead progresses." title="No stage history yet" />
              ) : (
                leadDetail?.stageHistory.map((item) => {
                  const fromStage = item.from_stage_id ? stageMap.get(item.from_stage_id)?.name : "Created";
                  const toStage = stageMap.get(item.to_stage_id)?.name ?? "Updated stage";
                  return (
                    <div className="rounded-2xl border border-slate-200 p-4" key={item.id}>
                      <p className="font-medium text-slate-900">
                        {fromStage} to {toStage}
                      </p>
                      <p className="text-sm text-slate-500">{item.reason || "No reason supplied"}</p>
                      <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                    </div>
                  );
                })
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Metadata</p>
              <p className="mt-2 break-words">{JSON.stringify(lead.metadata ?? {}, null, 2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
