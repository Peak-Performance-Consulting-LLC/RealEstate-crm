-- Run after creating a local auth user with email owner@example.com.
-- Use: supabase db query < supabase/seed/dev_seed.sql

do $$
declare
  target_profile_id uuid;
  owner_role_id uuid;
  demo_workspace_id uuid := '11111111-1111-1111-1111-111111111111';
  default_pipeline_id uuid := '22222222-2222-2222-2222-222222222222';
begin
  select id into target_profile_id
  from public.profiles
  where email = 'owner@example.com';

  if target_profile_id is null then
    raise notice 'Create auth user owner@example.com first, then rerun dev_seed.sql';
    return;
  end if;

  select id into owner_role_id
  from public.roles
  where slug = 'owner';

  insert into public.workspaces (id, name, slug, owner_profile_id, settings)
  values (
    demo_workspace_id,
    'Acme Realty',
    'acme-realty',
    target_profile_id,
    '{"timezone":"Asia/Kolkata","currency":"USD"}'::jsonb
  )
  on conflict (id) do nothing;

  insert into public.workspace_members (workspace_id, profile_id, role_id, status, joined_at)
  values (demo_workspace_id, target_profile_id, owner_role_id, 'active', timezone('utc', now()))
  on conflict (workspace_id, profile_id) do nothing;

  insert into public.sources (workspace_id, name, type, is_system, created_by)
  values
    (demo_workspace_id, 'Manual', 'manual', true, target_profile_id),
    (demo_workspace_id, 'Website Form', 'website', true, target_profile_id),
    (demo_workspace_id, 'Referral', 'referral', true, target_profile_id)
  on conflict do nothing;

  insert into public.pipelines (id, workspace_id, name, position, is_default, created_by)
  values (default_pipeline_id, demo_workspace_id, 'Residential Buyers', 0, true, target_profile_id)
  on conflict (id) do nothing;

  insert into public.pipeline_stages (workspace_id, pipeline_id, name, slug, position, color, is_default)
  values
    (demo_workspace_id, default_pipeline_id, 'New', 'new', 0, '#2563eb', true),
    (demo_workspace_id, default_pipeline_id, 'Contacted', 'contacted', 1, '#0f766e', false),
    (demo_workspace_id, default_pipeline_id, 'Qualified', 'qualified', 2, '#ea580c', false),
    (demo_workspace_id, default_pipeline_id, 'Appointment', 'appointment', 3, '#7c3aed', false),
    (demo_workspace_id, default_pipeline_id, 'Won', 'won', 4, '#16a34a', false),
    (demo_workspace_id, default_pipeline_id, 'Lost', 'lost', 5, '#dc2626', false)
  on conflict do nothing;

  insert into public.tags (workspace_id, name, color, created_by)
  values
    (demo_workspace_id, 'Buyer', '#2563eb', target_profile_id),
    (demo_workspace_id, 'Hot', '#dc2626', target_profile_id)
  on conflict do nothing;
end $$;
