import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useWorkspace } from "@/app/workspace-provider";
import { TaskForm } from "@/features/tasks/components/task-form";
import { listTasks, updateTask } from "@/services/tasks.service";
import { formatDateTime } from "@/lib/utils";

export function TasksPage() {
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const tasksQuery = useQuery({
    queryKey: ["tasks", activeWorkspaceId],
    queryFn: () => listTasks(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => updateTask({ workspaceId: activeWorkspaceId!, taskId, status: "completed" }),
    onSuccess: async () => {
      toast.success("Task completed");
      await queryClient.invalidateQueries({ queryKey: ["tasks", activeWorkspaceId] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update task"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        actions={<Button onClick={() => setShowCreateForm((current) => !current)}>{showCreateForm ? "Hide form" : "New task"}</Button>}
        description="Task and reminder hub for the workspace, with lead-linked actions showing up on the unified timeline."
        title="Tasks"
      />
      {showCreateForm ? <TaskForm onSuccess={() => setShowCreateForm(false)} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming tasks</CardTitle>
          <CardDescription>Human follow-up stays visible and overrides automation by default.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(tasksQuery.data ?? []).length === 0 ? (
            <EmptyState description="Create a follow-up task for yourself or your team." title="No tasks yet" />
          ) : (
            tasksQuery.data?.map((task) => (
              <div className="grid gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1.2fr_auto_auto]" key={task.id}>
                <div>
                  <p className="font-semibold text-slate-900">{task.title}</p>
                  <p className="text-sm text-slate-500">{task.description || "No description"}</p>
                  <p className="mt-2 text-xs text-slate-500">Due {formatDateTime(task.due_at)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{task.status}</Badge>
                  <Badge className="bg-amber-50 text-amber-700">{task.priority}</Badge>
                </div>
                <div className="flex items-center">
                  {task.status !== "completed" ? (
                    <Button onClick={() => completeMutation.mutate(task.id)} size="sm" variant="outline">
                      Mark done
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
