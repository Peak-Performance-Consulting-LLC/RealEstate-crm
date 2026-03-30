import type { SupabaseClient, User } from "jsr:@supabase/supabase-js@2";

export async function writeAuditLog(
  serviceClient: SupabaseClient,
  input: {
    workspaceId: string;
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await serviceClient.rpc("log_audit", {
    target_workspace_id: input.workspaceId,
    target_actor_profile_id: input.actorId ?? null,
    target_action: input.action,
    target_entity_type: input.entityType,
    target_entity_id: input.entityId ?? null,
    target_payload_before: input.before ?? null,
    target_payload_after: input.after ?? null,
    target_metadata: input.metadata ?? {},
  });

  if (error) {
    throw error;
  }
}

export async function writeTimelineEvent(
  serviceClient: SupabaseClient,
  input: {
    workspaceId: string;
    leadId: string;
    actorId?: string | null;
    eventType:
      | "lead_created"
      | "lead_updated"
      | "note"
      | "task_created"
      | "task_updated"
      | "task_completed"
      | "stage_change"
      | "tag_added"
      | "tag_removed"
      | "import";
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    summary: string;
    body?: Record<string, unknown>;
    occurredAt?: string | null;
  },
) {
  const { error } = await serviceClient.rpc("log_timeline_event", {
    target_workspace_id: input.workspaceId,
    target_lead_id: input.leadId,
    target_event_type: input.eventType,
    target_actor_profile_id: input.actorId ?? null,
    target_related_entity_type: input.relatedEntityType ?? null,
    target_related_entity_id: input.relatedEntityId ?? null,
    target_summary: input.summary,
    target_body: input.body ?? {},
    target_occurred_at: input.occurredAt ?? null,
  });

  if (error) {
    throw error;
  }
}

export function actorIdFromUser(user: User) {
  return user.id;
}
