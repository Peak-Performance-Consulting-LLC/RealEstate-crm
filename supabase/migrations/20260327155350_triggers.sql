create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure app.handle_new_user();

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure app.set_updated_at();

create trigger set_workspaces_updated_at
before update on public.workspaces
for each row execute procedure app.set_updated_at();

create trigger set_roles_updated_at
before update on public.roles
for each row execute procedure app.set_updated_at();

create trigger set_workspace_members_updated_at
before update on public.workspace_members
for each row execute procedure app.set_updated_at();

create trigger set_invitations_updated_at
before update on public.invitations
for each row execute procedure app.set_updated_at();

create trigger set_sources_updated_at
before update on public.sources
for each row execute procedure app.set_updated_at();

create trigger set_pipelines_updated_at
before update on public.pipelines
for each row execute procedure app.set_updated_at();

create trigger set_pipeline_stages_updated_at
before update on public.pipeline_stages
for each row execute procedure app.set_updated_at();

create trigger set_tags_updated_at
before update on public.tags
for each row execute procedure app.set_updated_at();

create trigger set_leads_updated_at
before update on public.leads
for each row execute procedure app.set_updated_at();

create trigger set_lead_contact_methods_updated_at
before update on public.lead_contact_methods
for each row execute procedure app.set_updated_at();

create trigger set_lead_notes_updated_at
before update on public.lead_notes
for each row execute procedure app.set_updated_at();

create trigger set_lead_tasks_task_completion
before update on public.lead_tasks
for each row execute procedure public.handle_task_completion();

create trigger set_lead_tasks_updated_at
before update on public.lead_tasks
for each row execute procedure app.set_updated_at();

create trigger set_custom_fields_updated_at
before update on public.custom_fields
for each row execute procedure app.set_updated_at();

create trigger set_custom_field_options_updated_at
before update on public.custom_field_options
for each row execute procedure app.set_updated_at();

create trigger set_custom_field_values_updated_at
before update on public.custom_field_values
for each row execute procedure app.set_updated_at();

create trigger set_imports_updated_at
before update on public.imports
for each row execute procedure app.set_updated_at();

create trigger set_import_rows_updated_at
before update on public.import_rows
for each row execute procedure app.set_updated_at();
