do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'lead_type'
  ) then
    create type public.lead_type as enum ('buyer', 'seller', 'tenant', 'landlord', 'investor');
  end if;
end
$$;

alter table public.leads
add column if not exists lead_type public.lead_type;

create index if not exists leads_workspace_lead_type_idx
on public.leads (workspace_id, lead_type)
where deleted_at is null;
