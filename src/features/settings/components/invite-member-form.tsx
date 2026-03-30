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
import { useWorkspace } from "@/app/workspace-provider";
import { inviteMember } from "@/services/workspace.service";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Valid email required"),
  roleSlug: z.enum(["admin", "manager", "agent", "readonly"]),
});

type FormValues = z.infer<typeof schema>;

export function InviteMemberForm() {
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [role, setRole] = useState<FormValues["roleSlug"]>("agent");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      roleSlug: "agent",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      return inviteMember({
        workspaceId: activeWorkspaceId,
        email: values.email,
        roleSlug: role,
      });
    },
    onSuccess: async () => {
      toast.success("Invitation created");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["team-members", activeWorkspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["pending-invitations", activeWorkspaceId] }),
      ]);
      form.reset();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to invite member"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite team member</CardTitle>
        <CardDescription>Membership and roles are workspace-scoped, so a user can belong to multiple companies safely.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-[1fr_220px_auto]" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" {...form.register("email")} placeholder="agent@example.com" />
            <p className="text-xs text-destructive">{form.formState.errors.email?.message}</p>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <AppSelect
              onValueChange={(value) => {
                setRole(value as FormValues["roleSlug"]);
                form.setValue("roleSlug", value as FormValues["roleSlug"]);
              }}
              options={[
                { label: "Admin", value: "admin" },
                { label: "Manager", value: "manager" },
                { label: "Agent", value: "agent" },
                { label: "Read only", value: "readonly" },
              ]}
              value={role}
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full" disabled={mutation.isPending} type="submit">
              Invite
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
