import { Navigate, Outlet } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "@/app/session-provider";
import { useWorkspace } from "@/app/workspace-provider";

function FullscreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <Spinner />
    </div>
  );
}

export function AuthOnlyRoute() {
  const { user, isLoading } = useSession();

  if (isLoading) return <FullscreenLoader />;
  if (user) return <Navigate replace to="/workspaces/select" />;
  return <Outlet />;
}

export function ProtectedRoute() {
  const { user, isLoading } = useSession();
  const workspace = useWorkspace();

  if (isLoading || workspace.isLoading) return <FullscreenLoader />;
  if (!user) return <Navigate replace to="/auth" />;
  if (workspace.memberships.length === 0) return <Navigate replace to="/workspaces/select" />;
  if (!workspace.activeWorkspaceId) return <Navigate replace to="/workspaces/select" />;

  return <Outlet />;
}
