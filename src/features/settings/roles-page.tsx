import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { listRoles } from "@/services/workspace.service";

export function RolesPage() {
  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: listRoles,
  });

  return (
    <div className="space-y-6">
      <PageHeader description="System role definitions and permission payloads used by frontend guards and backend checks." title="Roles" />
      <SettingsNav />
      <Card>
        <CardHeader>
          <CardTitle>Role matrix</CardTitle>
          <CardDescription>Phase 1 ships with seeded system roles. Workspace-scoped custom roles can layer on later without changing tenant boundaries.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rolesQuery.data?.map((role) => (
            <div className="rounded-2xl border border-slate-200 p-4" key={role.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{role.name}</p>
                  <p className="text-sm text-slate-500">{role.description}</p>
                </div>
                <Badge>{role.slug}</Badge>
              </div>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(role.permissions, null, 2)}</pre>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
