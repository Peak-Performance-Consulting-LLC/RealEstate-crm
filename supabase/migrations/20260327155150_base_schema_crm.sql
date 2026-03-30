create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  pipeline_id uuid references public.pipelines (id),
  current_stage_id uuid references public.pipeline_stages (id),
  source_id uuid references public.sources (id),
  assigned_to uuid references public.profiles (id),
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  merged_into_lead_id uuid references public.leads (id),
  first_name text not null,
  last_name text,
  full_name text generated always as (nullif(btrim(first_name || ' ' || coalesce(last_name, '')), '')) stored,
  company_name text,
  job_title text,
  email citext,
  phone text,
  alternate_phone text,
  status public.lead_status not null default 'new',
  priority public.task_priority not null default 'medium',
  property_preferences jsonb not null default '{}'::jsonb,
  address jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ai_summary text,
  last_contacted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.lead_contact_methods (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  type public.contact_method_type not null,
  label text,
  value text not null,
  is_primary boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  body text not null,
  is_pinned boolean not null default false,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.lead_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  title text not null,
  description text,
  status public.task_status not null default 'open',
  priority public.task_priority not null default 'medium',
  due_at timestamptz,
  assigned_to uuid references public.profiles (id),
  completed_at timestamptz,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  pipeline_id uuid not null references public.pipelines (id) on delete cascade,
  from_stage_id uuid references public.pipeline_stages (id),
  to_stage_id uuid not null references public.pipeline_stages (id),
  moved_by uuid not null references public.profiles (id),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.lead_tags (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (lead_id, tag_id)
);

create table public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entity_type public.custom_field_entity_type not null default 'lead',
  name text not null,
  slug text not null,
  field_type public.custom_field_type not null,
  is_required boolean not null default false,
  is_active boolean not null default true,
  position integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique (workspace_id, entity_type, slug)
);

create table public.custom_field_options (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  custom_field_id uuid not null references public.custom_fields (id) on delete cascade,
  label text not null,
  value text not null,
  color text,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (custom_field_id, value)
);

create table public.custom_field_values (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  custom_field_id uuid not null references public.custom_fields (id) on delete cascade,
  entity_type public.custom_field_entity_type not null default 'lead',
  entity_id uuid not null,
  value_text text,
  value_number numeric,
  value_boolean boolean,
  value_date timestamptz,
  value_json jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (custom_field_id, entity_type, entity_id)
);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  storage_bucket text not null default 'imports',
  status public.import_status not null default 'uploaded',
  mapping jsonb not null default '{}'::jsonb,
  duplicate_strategy text,
  row_count integer not null default 0,
  processed_count integer not null default 0,
  failed_count integer not null default 0,
  created_by uuid not null references public.profiles (id),
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  row_number integer not null,
  status public.import_row_status not null default 'pending',
  raw_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb,
  error_message text,
  lead_id uuid references public.leads (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (import_id, row_number)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  actor_profile_id uuid references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload_before jsonb,
  payload_after jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.activity_timeline_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  event_type public.timeline_event_type not null,
  actor_profile_id uuid references public.profiles (id),
  related_entity_type text,
  related_entity_id uuid,
  summary text not null,
  body jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);
