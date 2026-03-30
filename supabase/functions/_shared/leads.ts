import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export async function ensureWorkspaceSource(serviceClient: SupabaseClient, workspaceId: string, sourceId: string) {
  const { data, error } = await serviceClient
    .from("sources")
    .select("id")
    .eq("id", sourceId)
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error("Source not found");
  }

  return data.id as string;
}

export async function ensureWorkspaceAssignee(serviceClient: SupabaseClient, workspaceId: string, profileId: string) {
  const { data, error } = await serviceClient
    .from("workspace_members")
    .select("profile_id")
    .eq("workspace_id", workspaceId)
    .eq("profile_id", profileId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error("Assigned user not found");
  }

  return data.profile_id as string;
}

export async function resolvePipelineId(serviceClient: SupabaseClient, workspaceId: string, pipelineId?: string | null) {
  if (pipelineId) {
    const { data, error } = await serviceClient
      .from("pipelines")
      .select("id")
      .eq("id", pipelineId)
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) {
      throw error ?? new Error("Pipeline not found");
    }

    return data.id as string;
  }

  const { data: defaultPipeline, error: pipelineError } = await serviceClient
    .from("pipelines")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("is_default", true)
    .is("deleted_at", null)
    .single();

  if (pipelineError || !defaultPipeline) {
    throw pipelineError ?? new Error("Default pipeline not found");
  }

  return defaultPipeline.id as string;
}

export async function resolveStageId(serviceClient: SupabaseClient, workspaceId: string, pipelineId: string, stageId?: string | null) {
  if (stageId) {
    const { data, error } = await serviceClient
      .from("pipeline_stages")
      .select("id")
      .eq("id", stageId)
      .eq("workspace_id", workspaceId)
      .eq("pipeline_id", pipelineId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) {
      throw error ?? new Error("Stage not found");
    }

    return data.id as string;
  }

  const { data: defaultStage, error: stageError } = await serviceClient
    .from("pipeline_stages")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("pipeline_id", pipelineId)
    .eq("is_default", true)
    .is("deleted_at", null)
    .single();

  if (stageError || !defaultStage) {
    throw stageError ?? new Error("Default stage not found");
  }

  return defaultStage.id as string;
}
