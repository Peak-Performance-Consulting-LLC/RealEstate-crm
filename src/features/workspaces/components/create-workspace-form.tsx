import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspace } from "@/services/workspace.service";
import { useWorkspace } from "@/app/workspace-provider";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const schema = z.object({
  name: z.string().min(2, "Workspace name is required"),
  slug: z
    .string()
    .min(2, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
  timezone: z.string().min(2),
});

type FormValues = z.infer<typeof schema>;

export function CreateWorkspaceForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setActiveWorkspaceId } = useWorkspace();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      timezone: "Asia/Kolkata",
    },
  });

  const mutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: async (response) => {
      toast.success("Workspace created");
      await queryClient.invalidateQueries({ queryKey: ["workspaces", "memberships"] });
      setActiveWorkspaceId(response.workspace.id);
      navigate("/dashboard");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create workspace");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a workspace</CardTitle>
        <CardDescription>Set up the company boundary that all leads, tasks, pipelines, and settings will live inside.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            mutation.mutate(values);
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input id="workspace-name" {...form.register("name")} placeholder="Acme Realty" />
            <p className="text-xs text-destructive">{form.formState.errors.name?.message}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspace-slug">Workspace slug</Label>
            <Input id="workspace-slug" {...form.register("slug")} placeholder="acme-realty" />
            <p className="text-xs text-destructive">{form.formState.errors.slug?.message}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspace-timezone">Timezone</Label>
            <Input id="workspace-timezone" {...form.register("timezone")} placeholder="Asia/Kolkata" />
          </div>
          <Button className="w-full" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? "Creating..." : "Create workspace"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
