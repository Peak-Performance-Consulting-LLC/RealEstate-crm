create or replace function app.workspace_role_slug(target_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = public, app
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
security definer
set search_path = public, app
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
security definer
set search_path = public, app
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
security definer
set search_path = public, app
as $$
  select app.is_workspace_member(target_workspace_id);
$$;

create or replace function app.can_manage_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select app.has_workspace_role(target_workspace_id, array['owner', 'admin', 'manager']);
$$;

create or replace function app.can_contribute_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select app.has_workspace_role(target_workspace_id, array['owner', 'admin', 'manager', 'agent']);
$$;

create or replace function app.can_edit_lead(target_workspace_id uuid, lead_assigned_to uuid, lead_created_by uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
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
