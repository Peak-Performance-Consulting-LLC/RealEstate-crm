import { useMemo, useState } from "react";
import Papa from "papaparse";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { useWorkspace } from "@/app/workspace-provider";
import { createImportJob, listImports, uploadCsv } from "@/services/imports.service";
import { formatDateTime } from "@/lib/utils";

type PreviewRow = Record<string, string | null>;

export function ImportsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState("flag");
  const importsQuery = useQuery({
    queryKey: ["imports", activeWorkspaceId],
    queryFn: () => listImports(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });

  const csvColumns = useMemo(() => headers.map((header) => ({ label: header, value: header })), [headers]);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!activeWorkspaceId || !file) throw new Error("Select a CSV file");
      const filePath = await uploadCsv(activeWorkspaceId, file);
      return createImportJob({
        workspaceId: activeWorkspaceId,
        fileName: file.name,
        filePath,
        headers,
        fieldMapping,
        previewRows,
        duplicateDetection: {
          strategy: duplicateStrategy,
          fields: ["email", "phone"],
        },
      });
    },
    onSuccess: async () => {
      toast.success("Import job created");
      await queryClient.invalidateQueries({ queryKey: ["imports", activeWorkspaceId] });
      setFile(null);
      setHeaders([]);
      setPreviewRows([]);
      setFieldMapping({});
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create import"),
  });

  async function handleFileChange(nextFile: File) {
    setFile(nextFile);

    const text = await nextFile.text();
    const result = Papa.parse<PreviewRow>(text, {
      header: true,
      skipEmptyLines: true,
    });

    const parsedHeaders = result.meta.fields ?? [];
    setHeaders(parsedHeaders);
    setPreviewRows((result.data ?? []).slice(0, 10));
    setFieldMapping({
      firstName: parsedHeaders.find((header) => /first/i.test(header)) ?? "",
      lastName: parsedHeaders.find((header) => /last/i.test(header)) ?? "",
      email: parsedHeaders.find((header) => /email/i.test(header)) ?? "",
      phone: parsedHeaders.find((header) => /phone/i.test(header)) ?? "",
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader description="CSV upload, preview, mapping, and import history foundation with storage-backed payloads and queue-ready processing." title="Imports" />
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Upload leads CSV</CardTitle>
            <CardDescription>Phase 1 validates, previews, stores the file, and creates import rows. Heavy processing stays batch-friendly for later workers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV file</Label>
              <Input
                id="csv-file"
                accept=".csv"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0];
                  if (nextFile) void handleFileChange(nextFile);
                }}
                type="file"
              />
            </div>

            {headers.length > 0 ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {["firstName", "lastName", "email", "phone"].map((field) => (
                    <div className="space-y-2" key={field}>
                      <Label>{field}</Label>
                      <AppSelect
                        onValueChange={(value) => setFieldMapping((current) => ({ ...current, [field]: value }))}
                        options={csvColumns}
                        value={fieldMapping[field]}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>Duplicate detection strategy</Label>
                  <AppSelect
                    onValueChange={setDuplicateStrategy}
                    options={[
                      { label: "Flag potential duplicates", value: "flag" },
                      { label: "Skip duplicates", value: "skip" },
                      { label: "Merge duplicates later", value: "merge" },
                    ]}
                    value={duplicateStrategy}
                  />
                </div>
                <Button disabled={importMutation.isPending} onClick={() => importMutation.mutate()}>
                  {importMutation.isPending ? "Creating import..." : "Create import job"}
                </Button>
              </>
            ) : (
              <EmptyState description="Choose a CSV file to generate the mapping preview." title="No file uploaded" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview and history</CardTitle>
            <CardDescription>Preview rows are stored in the imports foundation so a later worker can process them safely.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewRows.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="grid grid-cols-4 gap-2 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {headers.slice(0, 4).map((header) => (
                    <span key={header}>{header}</span>
                  ))}
                </div>
                <div className="divide-y divide-slate-200">
                  {previewRows.slice(0, 5).map((row, index) => (
                    <div className="grid grid-cols-4 gap-2 px-4 py-3 text-sm text-slate-700" key={index}>
                      {headers.slice(0, 4).map((header) => (
                        <span key={`${index}-${header}`}>{row[header] ?? "-"}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState description="A parsed preview will appear here before you commit the import job." title="No preview yet" />
            )}

            <div className="space-y-3">
              {importsQuery.data?.map((item) => (
                <div className="rounded-2xl border border-slate-200 p-4" key={item.id}>
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-slate-900">{item.file_name}</p>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{item.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Rows: {item.row_count} | Processed: {item.processed_count} | Failed: {item.failed_count}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
