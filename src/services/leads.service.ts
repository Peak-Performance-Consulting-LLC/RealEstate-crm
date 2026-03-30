import type {
  CustomField,
  CreateLeadPayload,
  CustomFieldValue,
  LeadContactMethod,
  LeadDetail,
  LeadSource,
  LeadNote,
  LeadSummary,
  LeadTag,
  Pipeline,
  PipelineStage,
  StageHistoryItem,
  TimelineEvent,
  UpdateLeadPayload,
} from "@/types/domain";
import { supabase } from "@/lib/supabase";
import { invokeFunction } from "@/services/api";

function pickRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function listLeads(workspaceId: string): Promise<LeadSummary[]> {
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, workspace_id, lead_type, first_name, last_name, full_name, email, phone, alternate_phone, status, priority, assigned_to, source_id, pipeline_id, current_stage_id, property_preferences, address, metadata, created_at, updated_at",
    )
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as LeadSummary[];
}

export async function getLeadDetail(workspaceId: string, leadId: string): Promise<LeadDetail> {
  const [leadResult, tagsResult, contactsResult, tasksResult, notesResult, stageHistoryResult, timelineResult, customFieldsResult, customFieldValuesResult] =
    await Promise.all([
      supabase
        .from("leads")
        .select(
          "id, workspace_id, lead_type, first_name, last_name, full_name, email, phone, alternate_phone, status, priority, assigned_to, source_id, pipeline_id, current_stage_id, property_preferences, address, metadata, created_at, updated_at",
        )
        .eq("workspace_id", workspaceId)
        .eq("id", leadId)
        .single(),
      supabase
        .from("lead_tags")
        .select("tag_id, tags!inner(name, color)")
        .eq("workspace_id", workspaceId)
        .eq("lead_id", leadId),
      supabase
        .from("lead_contact_methods")
        .select("id, type, label, value, is_primary")
        .eq("workspace_id", workspaceId)
        .eq("lead_id", leadId)
        .is("deleted_at", null),
      supabase
        .from("lead_tasks")
        .select("id, lead_id, title, description, status, priority, due_at, assigned_to, completed_at, created_at")
        .eq("workspace_id", workspaceId)
        .eq("lead_id", leadId)
        .is("deleted_at", null)
        .order("due_at", { ascending: true }),
      supabase
        .from("lead_notes")
        .select("id, body, created_at, created_by")
        .eq("workspace_id", workspaceId)
        .eq("lead_id", leadId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("lead_stage_history")
        .select("id, from_stage_id, to_stage_id, reason, created_at")
        .eq("workspace_id", workspaceId)
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false }),
      supabase
        .from("activity_timeline_events")
        .select("id, event_type, summary, occurred_at, body")
        .eq("workspace_id", workspaceId)
        .eq("lead_id", leadId)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("custom_fields")
        .select("id, name, slug, field_type, is_required, is_active, position, config")
        .eq("workspace_id", workspaceId)
        .eq("entity_type", "lead")
        .is("deleted_at", null)
        .order("position", { ascending: true }),
      supabase
        .from("custom_field_values")
        .select("id, custom_field_id, entity_id, value_text, value_number, value_boolean, value_date, value_json")
        .eq("workspace_id", workspaceId)
        .eq("entity_type", "lead")
        .eq("entity_id", leadId),
    ]);

  if (leadResult.error) throw leadResult.error;
  if (tagsResult.error) throw tagsResult.error;
  if (contactsResult.error) throw contactsResult.error;
  if (tasksResult.error) throw tasksResult.error;
  if (notesResult.error) throw notesResult.error;
  if (stageHistoryResult.error) throw stageHistoryResult.error;
  if (timelineResult.error) throw timelineResult.error;
  if (customFieldsResult.error) throw customFieldsResult.error;
  if (customFieldValuesResult.error) throw customFieldValuesResult.error;

  return {
    lead: leadResult.data as LeadSummary,
    tags: (tagsResult.data ?? []).map((row) => ({
      tag_id: row.tag_id as string,
      name: (pickRelation(row.tags) as { name: string } | null)?.name ?? "",
      color: (pickRelation(row.tags) as { color: string | null } | null)?.color ?? null,
    })) as LeadTag[],
    contactMethods: (contactsResult.data ?? []) as LeadContactMethod[],
    tasks: (tasksResult.data ?? []) as LeadDetail["tasks"],
    notes: (notesResult.data ?? []) as LeadNote[],
    stageHistory: (stageHistoryResult.data ?? []) as StageHistoryItem[],
    timeline: (timelineResult.data ?? []) as TimelineEvent[],
    customFields: (customFieldsResult.data ?? []) as CustomField[],
    customFieldValues: (customFieldValuesResult.data ?? []) as CustomFieldValue[],
  };
}

export async function createLead(payload: CreateLeadPayload) {
  return invokeFunction<{ lead: LeadSummary }>("create-lead", payload);
}

export async function updateLead(payload: UpdateLeadPayload) {
  return invokeFunction<{ lead: LeadSummary }>("update-lead", payload);
}

export async function moveLeadStage(payload: { workspaceId: string; leadId: string; pipelineId: string; toStageId: string; reason?: string }) {
  return invokeFunction<{ lead: LeadSummary }>("move-lead-stage", payload);
}

export async function listPipelines(workspaceId: string): Promise<Pipeline[]> {
  const [pipelineResult, stageResult] = await Promise.all([
    supabase
      .from("pipelines")
      .select("id, name, position, is_default")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("position", { ascending: true }),
    supabase
      .from("pipeline_stages")
      .select("id, pipeline_id, name, slug, color, position, is_default")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("position", { ascending: true }),
  ]);

  if (pipelineResult.error) throw pipelineResult.error;
  if (stageResult.error) throw stageResult.error;

  const stageMap = new Map<string, PipelineStage[]>();
  for (const stage of (stageResult.data ?? []) as PipelineStage[]) {
    stageMap.set(stage.pipeline_id, [...(stageMap.get(stage.pipeline_id) ?? []), stage]);
  }

  return ((pipelineResult.data ?? []) as Omit<Pipeline, "stages">[]).map((pipeline) => ({
    ...pipeline,
    stages: stageMap.get(pipeline.id) ?? [],
  }));
}

export async function listTags(workspaceId: string) {
  const { data, error } = await supabase.from("tags").select("id, name, color").eq("workspace_id", workspaceId).is("deleted_at", null).order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listSources(workspaceId: string): Promise<LeadSource[]> {
  const { data, error } = await supabase
    .from("sources")
    .select("id, name, type")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name");

  if (error) throw error;
  return (data ?? []) as LeadSource[];
}

export async function listCustomFields(workspaceId: string) {
  const { data, error } = await supabase
    .from("custom_fields")
    .select("id, name, slug, field_type, is_required, is_active, position, config")
    .eq("workspace_id", workspaceId)
    .eq("entity_type", "lead")
    .is("deleted_at", null)
    .order("position");
  if (error) throw error;
  return (data ?? []) as CustomField[];
}
