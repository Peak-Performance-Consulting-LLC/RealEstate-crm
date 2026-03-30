alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.roles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invitations enable row level security;
alter table public.sources enable row level security;
alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.tags enable row level security;
alter table public.leads enable row level security;
alter table public.lead_contact_methods enable row level security;
alter table public.lead_notes enable row level security;
alter table public.lead_tasks enable row level security;
alter table public.lead_stage_history enable row level security;
alter table public.lead_tags enable row level security;
alter table public.custom_fields enable row level security;
alter table public.custom_field_options enable row level security;
alter table public.custom_field_values enable row level security;
alter table public.imports enable row level security;
alter table public.import_rows enable row level security;
alter table public.audit_logs enable row level security;
alter table public.activity_timeline_events enable row level security;

create policy "profiles can read themselves or workspace peers"
on public.profiles
for select
using (
  id = auth.uid()
  or exists (
    select 1
    from public.workspace_members my_membership
    join public.workspace_members peer_membership on peer_membership.workspace_id = my_membership.workspace_id
    where my_membership.profile_id = auth.uid()
      and my_membership.status = 'active'
      and peer_membership.profile_id = public.profiles.id
      and peer_membership.status = 'active'
  )
);

create policy "profiles can update themselves"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "roles are visible to authenticated users"
on public.roles
for select
using (auth.role() = 'authenticated');

create policy "workspace members can read workspaces"
on public.workspaces
for select
using (app.can_view_workspace(id) and deleted_at is null);

create policy "workspace managers can update workspaces"
on public.workspaces
for update
using (app.can_manage_workspace(id))
with check (app.can_manage_workspace(id));

create policy "members can read workspace membership"
on public.workspace_members
for select
using (app.can_view_workspace(workspace_id));

create policy "workspace managers can manage membership"
on public.workspace_members
for all
using (app.can_manage_workspace(workspace_id))
with check (app.can_manage_workspace(workspace_id));

create policy "members can read invitations"
on public.invitations
for select
using (app.can_view_workspace(workspace_id) or lower(email::text) = lower(coalesce((auth.jwt() ->> 'email'), '')));

create policy "workspace managers can manage invitations"
on public.invitations
for all
using (app.can_manage_workspace(workspace_id))
with check (app.can_manage_workspace(workspace_id));

create policy "members can read sources"
on public.sources
for select
using (app.can_view_workspace(workspace_id) and deleted_at is null);

create policy "workspace managers can manage sources"
on public.sources
for all
using (app.can_manage_workspace(workspace_id))
with check (app.can_manage_workspace(workspace_id));

create policy "members can read pipelines"
on public.pipelines
for select
using (app.can_view_workspace(workspace_id) and deleted_at is null);

create policy "workspace managers can manage pipelines"
on public.pipelines
for all
using (app.can_manage_workspace(workspace_id))
with check (app.can_manage_workspace(workspace_id));

create policy "members can read pipeline stages"
on public.pipeline_stages
for select
using (app.can_view_workspace(workspace_id) and deleted_at is null);

create policy "workspace managers can manage pipeline stages"
on public.pipeline_stages
for all
using (app.can_manage_workspace(workspace_id))
with check (app.can_manage_workspace(workspace_id));

create policy "members can read tags"
on public.tags
for select
using (app.can_view_workspace(workspace_id) and deleted_at is null);

create policy "workspace contributors can manage tags"
on public.tags
for all
using (app.can_contribute_workspace(workspace_id))
with check (app.can_contribute_workspace(workspace_id));
