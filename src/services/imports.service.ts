import type { ImportJob } from "@/types/domain";
import { supabase } from "@/lib/supabase";
import { invokeFunction } from "@/services/api";

export async function uploadCsv(workspaceId: string, file: File) {
  const filePath = `${workspaceId}/${crypto.randomUUID()}/${file.name}`;
  const { error } = await supabase.storage.from("imports").upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;
  return filePath;
}

export async function createImportJob(payload: Record<string, unknown>) {
  return invokeFunction<{ import: ImportJob }>("import-leads-csv", payload);
}

export async function listImports(workspaceId: string): Promise<ImportJob[]> {
  const { data, error } = await supabase
    .from("imports")
    .select("id, file_name, status, row_count, processed_count, failed_count, created_at")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ImportJob[];
}
