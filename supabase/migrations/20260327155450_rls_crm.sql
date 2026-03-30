create policy "members can read leads"
on public.leads
for select
using (app.can_view_workspace(workspace_id) and deleted_at is null);

create policy "workspace contributors can create leads"
on public.leads
for insert
with check (
  app.can_contribute_workspace(workspace_id)
  and created_by = auth.uid()
);

create policy "lead editors can update leads"
on public.leads
for update
using (app.can_edit_lead(workspace_id, assigned_to, created_by))
with check (app.can_edit_lead(workspace_id, assigned_to, created_by));

create policy "workspace managers can delete leads"
on public.leads
for delete
using (app.can_manage_workspace(workspace_id));

create policy "members can read lead contact methods"
on public.lead_contact_methods
for select
using (app.can_view_workspace(workspace_id) and deleted_at is null);

create policy "lead editors can manage contact methods"
on public.lead_contact_methods
for all
using (
  exists (
    select 1
    from public.leads l
    where l.id = lead_contact_methods.lead_id
      and l.workspace_id = lead_contact_methods.workspace_id
      and app.can_edit_lead(l.workspace_id, l.assigned_to, l.created_by)
  )
)
with check (
  exists (
    select 1
    from public.leads l
    where l.id = lead_contact_methods.lead_id
      and l.workspace_id = lead_contact_methods.workspace_id
      and app.can_edit_lead(l.workspace_id, l.assigned_to, l.created_by)
  )
);

create policy "members can read lead notes"
on public.lead_notes
for select
using (app.can_view_workspace(workspace_id) and deleted_at is null);

create policy "workspace contributors can create notes"
on public.lead_notes
for insert
with check (
  app.can_contribute_workspace(workspace_id)
  and created_by = auth.uid()
);

create policy "note authors and managers can update notes"
on public.lead_notes
for update
using (
  app.can_manage_workspace(workspace_id)
  or created_by = auth.uid()
)
with check (
  app.can_manage_workspace(workspace_id)
  or created_by = auth.uid()
);

create policy "members can read lead tasks"
on public.lead_tasks
for select
using (app.can_view_workspace(workspace_id) and deleted_at is null);

create policy "workspace contributors can create tasks"
on public.lead_tasks
for insert
with check (
  app.can_contribute_workspace(workspace_id)
  and created_by = auth.uid()
);

create policy "task editors can update tasks"
on public.lead_tasks
for update
using (
  app.can_manage_workspace(workspace_id)
  or assigned_to = auth.uid()
  or created_by = auth.uid()
)
with check (
  app.can_manage_workspace(workspace_id)
  or assigned_to = auth.uid()
  or created_by = auth.uid()
);

create policy "members can read lead stage history"
on public.lead_stage_history
for select
using (app.can_view_workspace(workspace_id));

create policy "workspace contributors can insert lead stage history"
on public.lead_stage_history
for insert
with check (app.can_contribute_workspace(workspace_id));

create policy "members can read lead tags"
on public.lead_tags
for select
using (app.can_view_workspace(workspace_id));

create policy "lead editors can manage lead tags"
on public.lead_tags
for all
using (
  exists (
    select 1
    from public.leads l
    where l.id = lead_tags.lead_id
      and l.workspace_id = lead_tags.workspace_id
      and app.can_edit_lead(l.workspace_id, l.assigned_to, l.created_by)
  )
)
with check (
  exists (
    select 1
    from public.leads l
    where l.id = lead_tags.lead_id
      and l.workspace_id = lead_tags.workspace_id
      and app.can_edit_lead(l.workspace_id, l.assigned_to, l.created_by)
  )
);

create policy "members can read custom fields"
on public.custom_fields
for select
using (app.can_view_workspace(workspace_id) and deleted_at is null);

create policy "workspace managers can manage custom fields"
on public.custom_fields
for all
using (app.can_manage_workspace(workspace_id))
with check (app.can_manage_workspace(workspace_id));

create policy "members can read custom field options"
on public.custom_field_options
for select
using (app.can_view_workspace(workspace_id));

create policy "workspace managers can manage custom field options"
on public.custom_field_options
for all
using (app.can_manage_workspace(workspace_id))
with check (app.can_manage_workspace(workspace_id));

create policy "members can read custom field values"
on public.custom_field_values
for select
using (app.can_view_workspace(workspace_id));

create policy "lead editors can manage custom field values"
on public.custom_field_values
for all
using (
  exists (
    select 1
    from public.leads l
    where l.id = custom_field_values.entity_id
      and custom_field_values.entity_type = 'lead'
      and l.workspace_id = custom_field_values.workspace_id
      and app.can_edit_lead(l.workspace_id, l.assigned_to, l.created_by)
  )
)
with check (
  exists (
    select 1
    from public.leads l
    where l.id = custom_field_values.entity_id
      and custom_field_values.entity_type = 'lead'
      and l.workspace_id = custom_field_values.workspace_id
      and app.can_edit_lead(l.workspace_id, l.assigned_to, l.created_by)
  )
);

create policy "members can read imports"
on public.imports
for select
using (app.can_view_workspace(workspace_id) and deleted_at is null);

create policy "workspace contributors can manage imports"
on public.imports
for all
using (app.can_contribute_workspace(workspace_id))
with check (app.can_contribute_workspace(workspace_id));

create policy "members can read import rows"
on public.import_rows
for select
using (app.can_view_workspace(workspace_id));

create policy "workspace contributors can manage import rows"
on public.import_rows
for all
using (app.can_contribute_workspace(workspace_id))
with check (app.can_contribute_workspace(workspace_id));

create policy "members can read audit logs"
on public.audit_logs
for select
using (app.can_view_workspace(workspace_id));

create policy "members can read timeline events"
on public.activity_timeline_events
for select
using (app.can_view_workspace(workspace_id));

grant usage on schema app to authenticated, service_role;
grant execute on function app.current_profile_id() to authenticated, service_role;
grant execute on function app.workspace_role_slug(uuid) to authenticated, service_role;
grant execute on function app.is_workspace_member(uuid) to authenticated, service_role;
grant execute on function app.has_workspace_role(uuid, text[]) to authenticated, service_role;
grant execute on function app.can_view_workspace(uuid) to authenticated, service_role;
grant execute on function app.can_manage_workspace(uuid) to authenticated, service_role;
grant execute on function app.can_contribute_workspace(uuid) to authenticated, service_role;
grant execute on function app.can_edit_lead(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function app.log_audit(uuid, uuid, text, text, uuid, jsonb, jsonb, jsonb) to service_role;
grant execute on function app.log_timeline_event(uuid, uuid, public.timeline_event_type, uuid, text, uuid, text, jsonb, timestamptz) to service_role;
