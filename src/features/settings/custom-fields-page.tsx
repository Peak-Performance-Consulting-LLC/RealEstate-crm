import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspace } from "@/app/workspace-provider";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { CustomFieldForm } from "@/features/settings/components/custom-field-form";
import { listCustomFields } from "@/services/leads.service";

export function CustomFieldsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const customFieldsQuery = useQuery({
    queryKey: ["custom-fields", activeWorkspaceId],
    queryFn: () => listCustomFields(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });

  return (
    <div className="space-y-6">
      <PageHeader description="Flexible lead metadata with Zod-validated forms and workspace-safe storage." title="Custom fields" />
      <SettingsNav />
      <CustomFieldForm />
      <Card>
        <CardHeader>
          <CardTitle>Lead field catalog</CardTitle>
          <CardDescription>These fields attach to lead records without widening the base lead table.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {customFieldsQuery.data?.map((field) => (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4" key={field.id}>
              <div>
                <p className="font-semibold text-slate-900">{field.name}</p>
                <p className="text-sm text-slate-500">{field.slug}</p>
              </div>
              <div className="flex gap-2">
                <Badge>{field.field_type}</Badge>
                {field.is_required ? <Badge className="bg-amber-50 text-amber-700">required</Badge> : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
