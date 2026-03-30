import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useWorkspace } from "@/app/workspace-provider";
import { InviteMemberForm } from "@/features/settings/components/invite-member-form";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { listPendingInvitations, listTeamMembers } from "@/services/workspace.service";
import { formatDate } from "@/lib/utils";

export function TeamMembersPage() {
  const { activeWorkspaceId } = useWorkspace();
  const teamQuery = useQuery({
    queryKey: ["team-members", activeWorkspaceId],
    queryFn: () => listTeamMembers(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });
  const invitationsQuery = useQuery({
    queryKey: ["pending-invitations", activeWorkspaceId],
    queryFn: () => listPendingInvitations(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });

  return (
    <div className="space-y-6">
      <PageHeader description="Manage workspace membership and invitation flow for the Phase 1 CRM foundation." title="Team members" />
      <SettingsNav />
      <InviteMemberForm />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active members</CardTitle>
            <CardDescription>Users who can currently access this workspace under RLS.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(teamQuery.data ?? []).length === 0 ? (
              <EmptyState description="Invited or joined users will appear here." title="No members yet" />
            ) : (
              teamQuery.data?.map((member) => (
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4" key={member.id}>
                  <div>
                    <p className="font-semibold text-slate-900">{member.fullName}</p>
                    <p className="text-sm text-slate-500">{member.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge>{member.role}</Badge>
                    <Badge className="bg-emerald-50 text-emerald-700">{member.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>Invitation records support future email provider, workflow, and approval hooks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(invitationsQuery.data ?? []).length === 0 ? (
              <EmptyState description="New invitations will show status and expiry here." title="No invitations pending" />
            ) : (
              invitationsQuery.data?.map((invitation) => (
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4" key={invitation.id}>
                  <div>
                    <p className="font-semibold text-slate-900">{invitation.email}</p>
                    <p className="text-sm text-slate-500">Expires {formatDate(invitation.expires_at)}</p>
                  </div>
                  <Badge>{invitation.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
