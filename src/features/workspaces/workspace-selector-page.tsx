import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSession } from "@/app/session-provider";
import { useWorkspace } from "@/app/workspace-provider";
import { CreateWorkspaceForm } from "@/features/workspaces/components/create-workspace-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";

export function WorkspaceSelectorPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useSession();
  const { setActiveWorkspaceId, memberships, activeWorkspaceId, isLoading: workspaceLoading } = useWorkspace();

  useEffect(() => {
    if (workspaceLoading || memberships.length === 0) return;

    const targetWorkspaceId = activeWorkspaceId ?? memberships[0].workspaceId;
    if (!activeWorkspaceId) {
      setActiveWorkspaceId(targetWorkspaceId);
    }

    navigate("/dashboard", { replace: true });
  }, [activeWorkspaceId, memberships, navigate, setActiveWorkspaceId, workspaceLoading]);

  if (isLoading || workspaceLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate replace to="/auth" />;
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Select a workspace</CardTitle>
            <CardDescription>Users can belong to multiple workspaces. Pick the one you want to operate in for this session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {memberships.length === 0 ? (
              <EmptyState description="Create your first workspace to start onboarding leads, tasks, pipelines, and team members." title="No workspace yet" />
            ) : (
              memberships.map((membership) => (
                <button
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-primary/30 hover:bg-slate-50"
                  key={membership.workspaceId}
                  onClick={() => {
                    setActiveWorkspaceId(membership.workspaceId);
                    navigate("/dashboard");
                  }}
                  type="button"
                >
                  <div>
                    <p className="text-base font-semibold text-slate-900">{membership.workspaceName}</p>
                    <p className="text-sm text-slate-500">{membership.workspaceSlug}</p>
                  </div>
                  <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm font-medium capitalize text-amber-700">
                    {membership.role}
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>
        <CreateWorkspaceForm />
      </div>
    </div>
  );
}
