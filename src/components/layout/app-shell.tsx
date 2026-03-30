import { useEffect, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, Columns3, Home, Import, ListTodo, LogOut, Settings, Users } from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";
import { useWorkspace } from "@/app/workspace-provider";
import { useSession } from "@/app/session-provider";
import { signOut } from "@/services/auth.service";
import { AppSelect } from "@/components/ui/app-select";

const navigation = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/pipeline", label: "Pipeline", icon: Columns3 },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/imports", label: "Imports", icon: Import },
  { to: "/settings/team", label: "Settings", icon: Settings },
];

export function AppShell() {
  const location = useLocation();
  const { user } = useSession();
  const { memberships, activeWorkspaceId, setActiveWorkspaceId, activeMembership } = useWorkspace();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("app-shell:sidebar-collapsed");
    if (stored === "true") {
      setIsSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("app-shell:sidebar-collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className={cn("grid min-h-screen", isSidebarCollapsed ? "lg:grid-cols-[88px_1fr]" : "lg:grid-cols-[260px_1fr]")}>
        <aside className="sticky top-0 flex h-screen flex-col border-r border-slate-200 bg-slate-950 px-4 py-6 text-slate-100">
          <div className="flex items-start justify-between gap-2">
            <Link className={cn("flex min-w-0 items-center gap-3", isSidebarCollapsed && "justify-center")} to="/dashboard">
              <div className="rounded-2xl bg-amber-400/20 p-3 text-amber-300">
                <Building2 className="h-6 w-6" />
              </div>
              {!isSidebarCollapsed ? (
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Real Estate CRM</p>
                  <p className="truncate text-base font-semibold">{activeMembership?.workspaceName ?? "Workspace"}</p>
                </div>
              ) : null}
            </Link>

            <Button
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden shrink-0 text-slate-300 hover:bg-white/10 hover:text-white lg:inline-flex"
              onClick={() => setIsSidebarCollapsed((current) => !current)}
              size="icon"
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              variant="ghost"
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <nav className="mt-8 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  className={({ isActive }) =>
                    cn(
                      "flex items-center rounded-xl px-3 py-2 text-sm transition-colors hover:bg-white/5 hover:text-white",
                      isSidebarCollapsed ? "justify-center" : "gap-3",
                      isActive && "bg-white/10 text-white",
                    )
                  }
                  key={item.to}
                  title={item.label}
                  to={item.to}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!isSidebarCollapsed ? item.label : null}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto pt-6">
            <div className={cn("rounded-2xl border border-white/10 bg-white/5", isSidebarCollapsed ? "p-3" : "p-4")}>
              {!isSidebarCollapsed ? <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Signed in</p> : null}
              <div className={cn("flex items-center gap-3", isSidebarCollapsed ? "justify-center" : "mt-3")}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700 font-semibold">
                  {initials(user?.email ?? "U")}
                </div>
                {!isSidebarCollapsed ? (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user?.email}</p>
                    <p className="text-xs capitalize text-slate-400">{activeMembership?.role ?? "member"}</p>
                  </div>
                ) : null}
              </div>
              <Button
                className={cn("mt-4", isSidebarCollapsed ? "w-full justify-center px-0" : "w-full justify-start")}
                onClick={() => void signOut()}
                title="Sign out"
                variant="ghost"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!isSidebarCollapsed ? "Sign out" : null}
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Active route</p>
                <p className="text-lg font-semibold capitalize text-slate-900">{location.pathname.replace("/", "") || "dashboard"}</p>
              </div>
              <div className="w-full max-w-sm">
                <AppSelect
                  onValueChange={setActiveWorkspaceId}
                  options={memberships.map((membership) => ({
                    label: `${membership.workspaceName} (${membership.role})`,
                    value: membership.workspaceId,
                  }))}
                  placeholder="Select workspace"
                  value={activeWorkspaceId ?? undefined}
                />
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
