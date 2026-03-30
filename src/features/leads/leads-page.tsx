import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Eye, FilePenLine, Phone, PlusCircle, SearchCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerBody, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { AppSelect } from "@/components/ui/app-select";
import { useWorkspace } from "@/app/workspace-provider";
import { LeadForm, type LeadFormValues } from "@/features/leads/components/lead-form";
import { TaskForm } from "@/features/tasks/components/task-form";
import { listLeads, listPipelines, listSources } from "@/services/leads.service";
import { listTasks } from "@/services/tasks.service";
import { listTeamMembers } from "@/services/workspace.service";
import type { LeadSummary, LeadTask } from "@/types/domain";
import { cn, formatDateTime } from "@/lib/utils";

function leadTypeLabel(value: LeadSummary["lead_type"]) {
  if (!value) return "lead";
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

function leadTypeBadgeClass(leadType: LeadSummary["lead_type"]) {
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

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

function getPropertySummaryItems(lead: LeadSummary) {
  const prefs = lead.property_preferences ?? {};
  const address = lead.address ?? {};

  if (lead.lead_type === "seller" || lead.lead_type === "landlord") {
    return [
      address.fullAddress ? { label: "Location", value: address.fullAddress } : null,
      prefs.propertyTypes?.length ? { label: "Type", value: prefs.propertyTypes.join(", ") } : null,
      lead.lead_type === "seller" && prefs.expectedSalePrice
        ? { label: "Expected sale", value: formatAmount(prefs.expectedSalePrice) }
        : null,
      lead.lead_type === "landlord" && prefs.expectedRent
        ? { label: "Expected rent", value: formatAmount(prefs.expectedRent) }
        : null,
      prefs.timeline ? { label: "Timeline", value: prefs.timeline } : null,
    ].filter(Boolean) as Array<{ label: string; value: string }>;
  }

  const demandRange =
    lead.lead_type === "tenant"
      ? prefs.rentMin || prefs.rentMax
        ? `Rent ${prefs.rentMin ? formatAmount(prefs.rentMin) : "-"} to ${prefs.rentMax ? formatAmount(prefs.rentMax) : "-"}`
        : null
      : prefs.budgetMin || prefs.budgetMax
        ? `Budget ${prefs.budgetMin ? formatAmount(prefs.budgetMin) : "-"} to ${prefs.budgetMax ? formatAmount(prefs.budgetMax) : "-"}`
        : null;

  return [
    prefs.locations?.length ? { label: "Location", value: prefs.locations.join(", ") } : null,
    prefs.propertyTypes?.length ? { label: "Type", value: prefs.propertyTypes.join(", ") } : null,
    demandRange ? { label: "Requirement", value: demandRange } : null,
    prefs.timeline ? { label: "Timeline", value: prefs.timeline } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
}

function getFollowUpState(task?: LeadTask) {
  if (!task) {
    return {
      label: "No follow-up scheduled",
      detail: "Create a task to keep this lead moving.",
      toneClass: "border-slate-200 bg-slate-50 text-slate-700",
    };
  }

  if (!task.due_at) {
    return {
      label: "Follow-up open",
      detail: task.title,
      toneClass: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  const dueDate = new Date(task.due_at);
  const today = new Date();
  const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const diffDays = Math.round((dueDay - todayDay) / 86_400_000);

  if (diffDays < 0) {
    return {
      label: "Overdue",
      detail: `${task.title} - ${formatDateTime(task.due_at)}`,
      toneClass: "border-red-200 bg-red-50 text-red-700",
    };
  }
  if (diffDays === 0) {
    return {
      label: "Due today",
      detail: `${task.title} - ${formatDateTime(task.due_at)}`,
      toneClass: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  if (diffDays === 1) {
    return {
      label: "Due tomorrow",
      detail: `${task.title} - ${formatDateTime(task.due_at)}`,
      toneClass: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  return {
    label: "Upcoming",
    detail: `${task.title} - ${formatDateTime(task.due_at)}`,
    toneClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

function buildEditDefaults(lead: LeadSummary): Partial<LeadFormValues> {
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

export function LeadsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [taskLeadId, setTaskLeadId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  const leadsQuery = useQuery({
    queryKey: ["leads", activeWorkspaceId],
    queryFn: () => listLeads(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });
  const pipelinesQuery = useQuery({
    queryKey: ["pipelines", activeWorkspaceId, "lead-list"],
    queryFn: () => listPipelines(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });
  const tasksQuery = useQuery({
    queryKey: ["tasks", activeWorkspaceId, "lead-list"],
    queryFn: () => listTasks(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });
  const sourcesQuery = useQuery({
    queryKey: ["lead-sources", activeWorkspaceId, "lead-list"],
    queryFn: () => listSources(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });
  const teamQuery = useQuery({
    queryKey: ["team-members", activeWorkspaceId, "lead-list"],
    queryFn: () => listTeamMembers(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });

  const stageMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null }>();
    for (const pipeline of pipelinesQuery.data ?? []) {
      for (const stage of pipeline.stages) {
        map.set(stage.id, { name: stage.name, color: stage.color });
      }
    }
    return map;
  }, [pipelinesQuery.data]);

  const sourceMap = useMemo(() => new Map((sourcesQuery.data ?? []).map((source) => [source.id, source.name])), [sourcesQuery.data]);
  const assigneeMap = useMemo(() => new Map((teamQuery.data ?? []).map((member) => [member.id, member.fullName])), [teamQuery.data]);

  const nextTaskMap = useMemo(() => {
    const map = new Map<string, LeadTask>();
    for (const task of tasksQuery.data ?? []) {
      if (!task.lead_id || !["open", "in_progress"].includes(task.status)) continue;
      const current = map.get(task.lead_id);
      if (!current) {
        map.set(task.lead_id, task);
        continue;
      }
      const currentDue = current.due_at ? new Date(current.due_at).getTime() : Number.POSITIVE_INFINITY;
      const taskDue = task.due_at ? new Date(task.due_at).getTime() : Number.POSITIVE_INFINITY;
      if (taskDue < currentDue) {
        map.set(task.lead_id, task);
      }
    }
    return map;
  }, [tasksQuery.data]);

  const filteredLeads = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    return (leadsQuery.data ?? []).filter((lead) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        lead.full_name.toLowerCase().includes(normalizedSearch) ||
        lead.email?.toLowerCase().includes(normalizedSearch) ||
        lead.phone?.toLowerCase().includes(normalizedSearch);
      const matchesType = typeFilter === "all" || lead.lead_type === typeFilter;
      const matchesStage = stageFilter === "all" || lead.current_stage_id === stageFilter;
      const matchesAssignee = assigneeFilter === "all" || (assigneeFilter === "unassigned" ? !lead.assigned_to : lead.assigned_to === assigneeFilter);
      const matchesSource = sourceFilter === "all" || lead.source_id === sourceFilter;
      const matchesPriority = priorityFilter === "all" || lead.priority === priorityFilter;
      return matchesSearch && matchesType && matchesStage && matchesAssignee && matchesSource && matchesPriority;
    });
  }, [assigneeFilter, deferredSearch, leadsQuery.data, priorityFilter, sourceFilter, stageFilter, typeFilter]);

  const activeEditingLead = useMemo(
    () => (editingLeadId ? filteredLeads.find((lead) => lead.id === editingLeadId) ?? leadsQuery.data?.find((lead) => lead.id === editingLeadId) ?? null : null),
    [editingLeadId, filteredLeads, leadsQuery.data],
  );

  const activeTaskLead = useMemo(
    () => (taskLeadId ? filteredLeads.find((lead) => lead.id === taskLeadId) ?? leadsQuery.data?.find((lead) => lead.id === taskLeadId) ?? null : null),
    [filteredLeads, leadsQuery.data, taskLeadId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button
            onClick={() => {
              setShowCreateDrawer(true);
              setEditingLeadId(null);
              setTaskLeadId(null);
            }}
          >
            New lead
          </Button>
        }
        description="Operate the lead book like a real queue: scan ownership, source, stage, requirements, and next action in one place."
        title="Leads"
      />

      <Card>
        <CardHeader>
          <CardTitle>Lead operations queue</CardTitle>
          <CardDescription>Use filters to narrow the workspace pipeline and act without opening every profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.6fr_repeat(5,minmax(0,1fr))]">
              <Input onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, or phone" value={search} />
              <AppSelect
                onValueChange={setTypeFilter}
                options={[
                  { label: "All lead types", value: "all" },
                  { label: "Buyer", value: "buyer" },
                  { label: "Seller", value: "seller" },
                  { label: "Tenant", value: "tenant" },
                  { label: "Landlord", value: "landlord" },
                  { label: "Investor", value: "investor" },
                ]}
                value={typeFilter}
              />
              <AppSelect
                onValueChange={setStageFilter}
                options={[
                  { label: "All stages", value: "all" },
                  ...Array.from(stageMap.entries()).map(([id, stage]) => ({ label: stage.name, value: id })),
                ]}
                value={stageFilter}
              />
              <AppSelect
                onValueChange={setAssigneeFilter}
                options={[
                  { label: "All assignees", value: "all" },
                  { label: "Unassigned", value: "unassigned" },
                  ...(teamQuery.data ?? []).map((member) => ({ label: member.fullName, value: member.id })),
                ]}
                value={assigneeFilter}
              />
              <AppSelect
                onValueChange={setSourceFilter}
                options={[
                  { label: "All sources", value: "all" },
                  ...(sourcesQuery.data ?? []).map((source) => ({ label: source.name, value: source.id })),
                ]}
                value={sourceFilter}
              />
              <AppSelect
                onValueChange={setPriorityFilter}
                options={[
                  { label: "All priorities", value: "all" },
                  { label: "Urgent", value: "urgent" },
                  { label: "High", value: "high" },
                  { label: "Medium", value: "medium" },
                  { label: "Low", value: "low" },
                ]}
                value={priorityFilter}
              />
            </div>
          </div>

          {filteredLeads.length === 0 ? (
            <EmptyState description="Create a lead or widen your filters to populate the queue." title="No leads match" />
          ) : (
            <div className="space-y-3">
              {filteredLeads.map((lead) => {
                const stage = lead.current_stage_id ? stageMap.get(lead.current_stage_id) : null;
                const nextTask = nextTaskMap.get(lead.id);
                const followUp = getFollowUpState(nextTask);
                const propertyItems = getPropertySummaryItems(lead);
                const assignedLabel = lead.assigned_to ? (assigneeMap.get(lead.assigned_to) ?? lead.assigned_to) : "Unassigned";
                const sourceLabel = lead.source_id ? (sourceMap.get(lead.source_id) ?? "Tracked source") : "No source";
                const propertyFallback = lead.lead_type === "seller" || lead.lead_type === "landlord" ? "Property details not added" : "Requirements not added";

                return (
                  <Card className="overflow-hidden" key={lead.id}>
                    <CardContent className="space-y-4 p-4">
                      <div className="grid gap-4 xl:grid-cols-[1.5fr_0.95fr_0.65fr]">
                        <div className="space-y-3 xl:pr-3">
                          <div className="space-y-2">
                            <Link className="text-lg font-semibold text-slate-900 hover:text-primary" to={`/leads/${lead.id}`}>
                              {lead.full_name}
                            </Link>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={leadTypeBadgeClass(lead.lead_type)}>{leadTypeLabel(lead.lead_type)}</Badge>
                              <Badge className={priorityBadgeClass(lead.priority)}>{lead.priority}</Badge>
                              <Badge>{stage?.name ?? "No stage"}</Badge>
                            </div>
                          </div>

                          <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                            <p className="truncate">{lead.phone || "No phone added"}</p>
                            <p className="truncate">{lead.email || "No email added"}</p>
                            <p className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">Assignee:</span>
                              {lead.assigned_to ? (
                                <span>{assignedLabel}</span>
                              ) : (
                                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                  Unassigned
                                </span>
                              )}
                            </p>
                            <p className="truncate">
                              <span className="font-medium text-slate-900">Source:</span> {sourceLabel}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Property summary</p>
                          {propertyItems.length > 0 ? (
                            <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                              {propertyItems.map((item) => (
                                <p className="flex gap-2" key={`${lead.id}-${item.label}`}>
                                  <span className="shrink-0 font-medium text-slate-900">{item.label}:</span>
                                  <span className="min-w-0">{item.value}</span>
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-slate-500">{propertyFallback}</p>
                          )}
                        </div>

                        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Next follow-up</p>
                            <div className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", followUp.toneClass)}>{followUp.label}</div>
                            <p className="text-sm font-medium text-slate-900">{followUp.detail}</p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Button asChild size="sm">
                                <Link to={`/leads/${lead.id}`}>
                                  <Eye className="h-4 w-4" />
                                  View
                                </Link>
                              </Button>
                              <Button
                                aria-label={`Edit ${lead.full_name}`}
                                onClick={() => {
                                  setEditingLeadId(lead.id);
                                  setTaskLeadId(null);
                                  setShowCreateDrawer(false);
                                }}
                                size="icon"
                                variant="ghost"
                              >
                                <FilePenLine className="h-4 w-4" />
                              </Button>
                              <Button
                                aria-label={`Create task for ${lead.full_name}`}
                                onClick={() => {
                                  setTaskLeadId(lead.id);
                                  setEditingLeadId(null);
                                  setShowCreateDrawer(false);
                                }}
                                size="icon"
                                variant="ghost"
                              >
                                <PlusCircle className="h-4 w-4" />
                              </Button>
                              {lead.phone ? (
                                <Button aria-label={`Call ${lead.full_name}`} asChild size="icon" variant="ghost">
                                  <a href={`tel:${lead.phone}`}>
                                    <Phone className="h-4 w-4" />
                                  </a>
                                </Button>
                              ) : null}
                            </div>
                            <p className="text-xs text-slate-500">
                              Updated {formatDateTime(lead.updated_at)} - {lead.status}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 p-4 text-sm text-slate-500">
          <SearchCheck className="h-4 w-4 text-slate-400" />
          Leads without an assignee or follow-up should be your first operational cleanup target.
        </CardContent>
      </Card>

      <Drawer onOpenChange={setShowCreateDrawer} open={showCreateDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Create lead</DrawerTitle>
            <DrawerDescription>Capture core contact data, real-estate requirements, source attribution, and assignment without losing your queue context.</DrawerDescription>
          </DrawerHeader>
          <DrawerBody>
            <LeadForm
              embedded
              onSuccess={() => {
                setShowCreateDrawer(false);
              }}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Drawer onOpenChange={(open) => setEditingLeadId(open ? editingLeadId : null)} open={Boolean(editingLeadId)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit lead</DrawerTitle>
            <DrawerDescription>Update lead details without breaking the flow of the operations queue.</DrawerDescription>
          </DrawerHeader>
          <DrawerBody>
            {activeEditingLead ? (
              <LeadForm
                defaultValues={buildEditDefaults(activeEditingLead)}
                embedded
                leadId={activeEditingLead.id}
                onSuccess={() => setEditingLeadId(null)}
              />
            ) : null}
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Dialog onOpenChange={(open) => setTaskLeadId(open ? taskLeadId : null)} open={Boolean(taskLeadId)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create task</DialogTitle>
            <DialogDescription>Log the next human follow-up while keeping the lead queue visible in the background.</DialogDescription>
          </DialogHeader>
          {taskLeadId ? (
            <div className="space-y-4">
              {activeTaskLead ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">{activeTaskLead.full_name}</p>
                  <p className="mt-1">
                    {leadTypeLabel(activeTaskLead.lead_type)} lead
                    {activeTaskLead.current_stage_id ? ` - ${stageMap.get(activeTaskLead.current_stage_id)?.name ?? "No stage"}` : ""}
                  </p>
                </div>
              ) : null}
              <TaskForm
                embedded
                leadId={taskLeadId}
                onSuccess={() => {
                  setTaskLeadId(null);
                }}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
