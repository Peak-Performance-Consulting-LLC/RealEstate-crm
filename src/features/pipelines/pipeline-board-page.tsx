import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AppSelect } from "@/components/ui/app-select";
import { useWorkspace } from "@/app/workspace-provider";
import { listLeads, listPipelines, moveLeadStage } from "@/services/leads.service";

export function PipelineBoardPage() {
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const pipelinesQuery = useQuery({
    queryKey: ["pipelines-board", activeWorkspaceId],
    queryFn: () => listPipelines(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });
  const leadsQuery = useQuery({
    queryKey: ["leads", activeWorkspaceId, "board"],
    queryFn: () => listLeads(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });
  const mutation = useMutation({
    mutationFn: (input: { leadId: string; pipelineId: string; toStageId: string }) =>
      moveLeadStage({ workspaceId: activeWorkspaceId!, leadId: input.leadId, pipelineId: input.pipelineId, toStageId: input.toStageId }),
    onSuccess: async () => {
      toast.success("Lead moved");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leads", activeWorkspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["leads", activeWorkspaceId, "board"] }),
        queryClient.invalidateQueries({ queryKey: ["lead-detail", activeWorkspaceId] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to move lead"),
  });

  const pipeline = pipelinesQuery.data?.find((item) => item.is_default) ?? pipelinesQuery.data?.[0];

  return (
    <div className="space-y-6">
      <PageHeader description="Kanban view backed by workspace pipelines and immutable stage history records." title="Pipeline" />
      {!pipeline ? (
        <EmptyState description="Create a workspace first so the default pipeline and stages can be provisioned." title="No pipeline configured" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-6">
          {pipeline.stages.map((stage) => {
            const stageLeads = (leadsQuery.data ?? []).filter((lead) => lead.current_stage_id === stage.id);
            return (
              <Card className="min-h-[420px]" key={stage.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{stage.name}</CardTitle>
                    <Badge>{stageLeads.length}</Badge>
                  </div>
                  <CardDescription>Stage #{stage.position + 1}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stageLeads.length === 0 ? (
                    <EmptyState description="No leads in this stage yet." title="Empty stage" />
                  ) : (
                    stageLeads.map((lead) => (
                      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4" key={lead.id}>
                        <div>
                          <p className="font-semibold text-slate-900">{lead.full_name}</p>
                          <p className="text-sm text-slate-500">{lead.email || lead.phone || "No contact yet"}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge>{lead.status}</Badge>
                          <Badge className="bg-amber-50 text-amber-700">{lead.priority}</Badge>
                        </div>
                        <AppSelect
                          onValueChange={(value) => mutation.mutate({ leadId: lead.id, pipelineId: pipeline.id, toStageId: value })}
                          options={pipeline.stages.map((option) => ({ label: option.name, value: option.id }))}
                          value={lead.current_stage_id ?? undefined}
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
