import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { useWorkspace } from "@/app/workspace-provider";
import { listPipelines } from "@/services/leads.service";

export function PipelinesPage() {
  const { activeWorkspaceId } = useWorkspace();
  const pipelinesQuery = useQuery({
    queryKey: ["pipelines", activeWorkspaceId, "settings"],
    queryFn: () => listPipelines(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });

  return (
    <div className="space-y-6">
      <PageHeader description="Pipelines and stages are separate entities so the CRM can later support automation, AI scoring, and cross-pipeline reporting." title="Pipelines" />
      <SettingsNav />
      <Card>
        <CardHeader>
          <CardTitle>Configured pipelines</CardTitle>
          <CardDescription>Stage editing UI can expand later without requiring schema changes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pipelinesQuery.data?.map((pipeline) => (
            <div className="rounded-2xl border border-slate-200 p-4" key={pipeline.id}>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-slate-900">{pipeline.name}</p>
                {pipeline.is_default ? <Badge>default</Badge> : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {pipeline.stages.map((stage) => (
                  <div className="rounded-full border border-slate-200 px-3 py-1 text-sm" key={stage.id}>
                    <span className="font-medium">{stage.name}</span>
                    <span className="ml-2 text-slate-500">#{stage.position + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
