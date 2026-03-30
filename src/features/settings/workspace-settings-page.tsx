import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/app/workspace-provider";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { getWorkspace, updateWorkspaceSettings } from "@/services/workspace.service";

const schema = z.object({
  timezone: z.string().min(2),
  currency: z.string().min(3),
});

type FormValues = z.infer<typeof schema>;

export function WorkspaceSettingsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceQuery = useQuery({
    queryKey: ["workspace", activeWorkspaceId],
    queryFn: () => getWorkspace(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      timezone: "Asia/Kolkata",
      currency: "USD",
    },
  });

  useEffect(() => {
    const settings = workspaceQuery.data?.settings ?? {};
    form.reset({
      timezone: String(settings.timezone ?? "Asia/Kolkata"),
      currency: String(settings.currency ?? "USD"),
    });
  }, [form, workspaceQuery.data?.settings]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      return updateWorkspaceSettings(activeWorkspaceId, values);
    },
    onSuccess: async () => {
      toast.success("Workspace settings updated");
      await queryClient.invalidateQueries({ queryKey: ["workspace", activeWorkspaceId] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update workspace"),
  });

  return (
    <div className="space-y-6">
      <PageHeader description="Workspace-level defaults for timezone, downstream integrations, and future automation scheduling." title="Workspace settings" />
      <SettingsNav />
      <Card>
        <CardHeader>
          <CardTitle>{workspaceQuery.data?.name ?? "Workspace"}</CardTitle>
          <CardDescription>These values are stored on the workspace and can later feed calendars, reminders, AI summaries, and billing region logic.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <div className="space-y-2">
              <Label htmlFor="workspace-timezone-setting">Timezone</Label>
              <Input id="workspace-timezone-setting" {...form.register("timezone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace-currency">Currency</Label>
              <Input id="workspace-currency" {...form.register("currency")} />
            </div>
            <div className="md:col-span-2">
              <Button disabled={mutation.isPending} type="submit">
                Save workspace settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
