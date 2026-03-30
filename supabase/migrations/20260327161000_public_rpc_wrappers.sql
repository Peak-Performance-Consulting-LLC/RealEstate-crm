create or replace function public.log_audit(
  target_workspace_id uuid,
  target_actor_profile_id uuid,
  target_action text,
  target_entity_type text,
  target_entity_id uuid,
  target_payload_before jsonb default null,
  target_payload_after jsonb default null,
  target_metadata jsonb default '{}'::jsonb
)
returns uuid
language sql
security definer
set search_path = public, app
as $$
  select app.log_audit(
    target_workspace_id,
    target_actor_profile_id,
    target_action,
    target_entity_type,
    target_entity_id,
    target_payload_before,
    target_payload_after,
    target_metadata
  );
$$;

create or replace function public.log_timeline_event(
  target_workspace_id uuid,
  target_lead_id uuid,
  target_event_type public.timeline_event_type,
  target_actor_profile_id uuid,
  target_related_entity_type text,
  target_related_entity_id uuid,
  target_summary text,
  target_body jsonb default '{}'::jsonb,
  target_occurred_at timestamptz default timezone('utc', now())
)
returns uuid
language sql
security definer
set search_path = public, app
as $$
  select app.log_timeline_event(
    target_workspace_id,
    target_lead_id,
    target_event_type,
    target_actor_profile_id,
    target_related_entity_type,
    target_related_entity_id,
    target_summary,
    target_body,
    target_occurred_at
  );
$$;

grant execute on function public.log_audit(uuid, uuid, text, text, uuid, jsonb, jsonb, jsonb) to authenticated, service_role;
grant execute on function public.log_timeline_event(uuid, uuid, public.timeline_event_type, uuid, text, uuid, text, jsonb, timestamptz) to authenticated, service_role;
