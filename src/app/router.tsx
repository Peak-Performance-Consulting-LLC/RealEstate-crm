import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { AuthOnlyRoute, ProtectedRoute } from "@/routes/route-guards";
import { AuthPage } from "@/features/auth/auth-page";
import { WorkspaceSelectorPage } from "@/features/workspaces/workspace-selector-page";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { LeadsPage } from "@/features/leads/leads-page";
import { LeadDetailPage } from "@/features/leads/lead-detail-page";
import { PipelineBoardPage } from "@/features/pipelines/pipeline-board-page";
import { TasksPage } from "@/features/tasks/tasks-page";
import { ImportsPage } from "@/features/imports/imports-page";
import { TeamMembersPage } from "@/features/settings/team-members-page";
import { RolesPage } from "@/features/settings/roles-page";
import { PipelinesPage } from "@/features/settings/pipelines-page";
import { CustomFieldsPage } from "@/features/settings/custom-fields-page";
import { WorkspaceSettingsPage } from "@/features/settings/workspace-settings-page";

export const router = createBrowserRouter([
  {
    element: <AuthOnlyRoute />,
    children: [
      {
        path: "/auth",
        element: <AuthPage />,
      },
    ],
  },
  {
    path: "/workspaces/select",
    element: <WorkspaceSelectorPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate replace to="/dashboard" /> },
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/leads", element: <LeadsPage /> },
          { path: "/leads/:leadId", element: <LeadDetailPage /> },
          { path: "/pipeline", element: <PipelineBoardPage /> },
          { path: "/tasks", element: <TasksPage /> },
          { path: "/imports", element: <ImportsPage /> },
          { path: "/settings/team", element: <TeamMembersPage /> },
          { path: "/settings/roles", element: <RolesPage /> },
          { path: "/settings/pipelines", element: <PipelinesPage /> },
          { path: "/settings/custom-fields", element: <CustomFieldsPage /> },
          { path: "/settings/workspace", element: <WorkspaceSettingsPage /> },
        ],
      },
    ],
  },
]);
