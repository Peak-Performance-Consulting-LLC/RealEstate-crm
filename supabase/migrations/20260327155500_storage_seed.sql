insert into storage.buckets (id, name, public)
values ('imports', 'imports', false)
on conflict (id) do nothing;

create policy "workspace members can read import objects"
on storage.objects
for select
using (
  bucket_id = 'imports'
  and app.can_view_workspace(nullif((storage.foldername(name))[1], '')::uuid)
);

create policy "workspace contributors can upload import objects"
on storage.objects
for insert
with check (
  bucket_id = 'imports'
  and app.can_contribute_workspace(nullif((storage.foldername(name))[1], '')::uuid)
);

create policy "workspace contributors can update import objects"
on storage.objects
for update
using (
  bucket_id = 'imports'
  and app.can_contribute_workspace(nullif((storage.foldername(name))[1], '')::uuid)
)
with check (
  bucket_id = 'imports'
  and app.can_contribute_workspace(nullif((storage.foldername(name))[1], '')::uuid)
);

insert into public.roles (slug, name, description, permissions, is_system)
values
  (
    'owner',
    'Owner',
    'Full access to workspace configuration, users, and data.',
    '{"workspace":["manage"],"members":["manage"],"leads":["read","write","delete"],"tasks":["read","write","delete"],"settings":["manage"]}'::jsonb,
    true
  ),
  (
    'admin',
    'Admin',
    'Operational admin with broad workspace control.',
    '{"workspace":["manage"],"members":["manage"],"leads":["read","write","delete"],"tasks":["read","write","delete"],"settings":["manage"]}'::jsonb,
    true
  ),
  (
    'manager',
    'Manager',
    'Can manage pipelines, leads, tasks, and reporting.',
    '{"workspace":["read"],"members":["invite"],"leads":["read","write"],"tasks":["read","write"],"settings":["manage_limited"]}'::jsonb,
    true
  ),
  (
    'agent',
    'Agent',
    'Can work assigned leads and tasks.',
    '{"workspace":["read"],"leads":["read","write_assigned"],"tasks":["read","write_assigned"]}'::jsonb,
    true
  ),
  (
    'readonly',
    'Read Only',
    'Can view CRM data without editing.',
    '{"workspace":["read"],"leads":["read"],"tasks":["read"]}'::jsonb,
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  permissions = excluded.permissions,
  is_system = excluded.is_system,
  updated_at = timezone('utc', now());
