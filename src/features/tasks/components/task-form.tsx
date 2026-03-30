import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { Textarea } from "@/components/ui/textarea";
import { createTask, updateTask } from "@/services/tasks.service";
import { useWorkspace } from "@/app/workspace-provider";
import { toast } from "sonner";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueAt: z.string().optional(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

type FormValues = z.infer<typeof schema>;

export function TaskForm({
  taskId,
  leadId,
  defaultValues,
  onSuccess,
  embedded = false,
}: {
  taskId?: string;
  leadId?: string | null;
  defaultValues?: Partial<FormValues>;
  onSuccess?: () => void;
  embedded?: boolean;
}) {
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<FormValues["status"]>(defaultValues?.status ?? "open");
  const [priority, setPriority] = useState<FormValues["priority"]>(defaultValues?.priority ?? "medium");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      dueAt: defaultValues?.dueAt ?? "",
      status: defaultValues?.status ?? "open",
      priority: defaultValues?.priority ?? "medium",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");

      const payload = {
        workspaceId: activeWorkspaceId,
        leadId: leadId ?? null,
        title: values.title,
        description: values.description || null,
        dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : null,
        status,
        priority,
      };

      return taskId ? updateTask({ ...payload, taskId }) : createTask(payload);
    },
    onSuccess: async () => {
      toast.success(taskId ? "Task updated" : "Task created");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks", activeWorkspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["lead-detail", activeWorkspaceId, leadId] }),
      ]);
      onSuccess?.();
      if (!taskId) form.reset();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to save task"),
  });

  const formBody = (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <div className="space-y-2">
        <Label htmlFor="task-title">Title</Label>
        <Input id="task-title" {...form.register("title")} placeholder="Call back after property visit" />
        <p className="text-xs text-destructive">{form.formState.errors.title?.message}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="task-description">Description</Label>
        <Textarea id="task-description" {...form.register("description")} placeholder="Capture the next action and any context." />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="task-due-at">Due date</Label>
          <Input id="task-due-at" type="datetime-local" {...form.register("dueAt")} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <AppSelect
            onValueChange={(value) => {
              setStatus(value as FormValues["status"]);
              form.setValue("status", value as FormValues["status"]);
            }}
            options={[
              { label: "Open", value: "open" },
              { label: "In progress", value: "in_progress" },
              { label: "Completed", value: "completed" },
              { label: "Cancelled", value: "cancelled" },
            ]}
            value={status}
          />
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <AppSelect
            onValueChange={(value) => {
              setPriority(value as FormValues["priority"]);
              form.setValue("priority", value as FormValues["priority"]);
            }}
            options={[
              { label: "Low", value: "low" },
              { label: "Medium", value: "medium" },
              { label: "High", value: "high" },
              { label: "Urgent", value: "urgent" },
            ]}
            value={priority}
          />
        </div>
      </div>
      <Button disabled={mutation.isPending} type="submit">
        {mutation.isPending ? "Saving..." : taskId ? "Save task" : "Create task"}
      </Button>
    </form>
  );

  if (embedded) {
    return formBody;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{taskId ? "Edit task" : "Create task"}</CardTitle>
        <CardDescription>Tasks and reminders live on the same lead timeline so human follow-up stays visible.</CardDescription>
      </CardHeader>
      <CardContent>{formBody}</CardContent>
    </Card>
  );
}
