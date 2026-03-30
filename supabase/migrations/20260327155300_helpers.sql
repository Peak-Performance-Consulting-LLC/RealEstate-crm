create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, avatar_url, metadata)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  )
  on conflict (id) do update
    set email = excluded.email,
        first_name = coalesce(excluded.first_name, public.profiles.first_name),
        last_name = coalesce(excluded.last_name, public.profiles.last_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        metadata = public.profiles.metadata || excluded.metadata;

  return new;
end;
$$;

create or replace function app.current_profile_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create or replace function app.workspace_role_slug(target_workspace_id uuid)
returns text
language sql
stable
as $$
  select r.slug
  from public.workspace_members wm
  join public.roles r on r.id = wm.role_id
  where wm.workspace_id = target_workspace_id
    and wm.profile_id = auth.uid()
    and wm.status = 'active'
  limit 1;
$$;

create or replace function app.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.profile_id = auth.uid()
      and wm.status = 'active'
  );
$$;

create or replace function app.has_workspace_role(target_workspace_id uuid, allowed_roles text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    join public.roles r on r.id = wm.role_id
    where wm.workspace_id = target_workspace_id
      and wm.profile_id = auth.uid()
      and wm.status = 'active'
      and r.slug = any (allowed_roles)
  );
$$;

create or replace function app.can_view_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select app.is_workspace_member(target_workspace_id);
$$;

create or replace function app.can_manage_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select app.has_workspace_role(target_workspace_id, array['owner', 'admin', 'manager']);
$$;

create or replace function app.can_contribute_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select app.has_workspace_role(target_workspace_id, array['owner', 'admin', 'manager', 'agent']);
$$;

create or replace function app.can_edit_lead(target_workspace_id uuid, lead_assigned_to uuid, lead_created_by uuid)
returns boolean
language sql
stable
as $$
  select
    app.can_manage_workspace(target_workspace_id)
    or (
      app.has_workspace_role(target_workspace_id, array['agent'])
      and (
        lead_assigned_to = auth.uid()
        or lead_created_by = auth.uid()
        or lead_assigned_to is null
      )
    );
$$;

create or replace function app.log_audit(
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
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_id uuid;
begin
  insert into public.audit_logs (
    workspace_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    payload_before,
    payload_after,
    metadata
  )
  values (
    target_workspace_id,
    target_actor_profile_id,
    target_action,
    target_entity_type,
    target_entity_id,
    target_payload_before,
    target_payload_after,
    coalesce(target_metadata, '{}'::jsonb)
  )
  returning id into audit_id;

  return audit_id;
end;
$$;

create or replace function app.log_timeline_event(
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
language plpgsql
security definer
set search_path = public
as $$
declare
  event_id uuid;
begin
  insert into public.activity_timeline_events (
    workspace_id,
    lead_id,
    event_type,
    actor_profile_id,
    related_entity_type,
    related_entity_id,
    summary,
    body,
    occurred_at
  )
  values (
    target_workspace_id,
    target_lead_id,
    target_event_type,
    target_actor_profile_id,
    target_related_entity_type,
    target_related_entity_id,
    target_summary,
    coalesce(target_body, '{}'::jsonb),
    coalesce(target_occurred_at, timezone('utc', now()))
  )
  returning id into event_id;

  return event_id;
end;
$$;

create or replace function public.handle_task_completion()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' and new.completed_at is null then
    new.completed_at = timezone('utc', now());
  elsif new.status <> 'completed' then
    new.completed_at = null;
  end if;

  return new;
end;
$$;
