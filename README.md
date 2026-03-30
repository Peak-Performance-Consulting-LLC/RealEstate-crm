# Real Estate CRM Phase 1

Production-oriented MVP foundation for a multi-tenant AI-first real estate CRM SaaS using:

- React + TypeScript + Vite
- Tailwind CSS + shadcn-style UI primitives
- React Router
- TanStack Query
- React Hook Form + Zod
- Supabase Auth, Postgres, Storage, Realtime-ready tables, Edge Functions, and RLS

## What Phase 1 includes

- Authentication and profile bootstrap
- Workspace creation and selection
- Team invitations and role-aware membership
- Lead CRUD foundation
- Lead detail page with timeline, tasks, notes, stage history, tags, and custom fields
- Pipeline kanban view and stage movement
- Tasks and reminders
- Custom fields
- CSV import upload, mapping, preview, and import history skeleton
- Audit logging and activity timeline foundation

## Recommended project layout

```text
src/
  app/                  providers, session/workspace context, router
  components/
    layout/             shell, auth layout, page headers
    ui/                 reusable UI primitives
  features/
    auth/
    dashboard/
    imports/
    leads/
    pipelines/
    settings/
    tasks/
    workspaces/
  lib/                  env, supabase client, utilities, permissions
  services/             Supabase query layer and Edge Function invokers
  types/                domain types
supabase/
  config.toml
  migrations/           SQL-first schema, indexes, helpers, triggers, RLS, storage, seeds
  seed/
  functions/
    _shared/            auth, audit, schemas, Supabase clients, defaults
    create-workspace/
    invite-member/
    accept-invitation/
    create-lead/
    update-lead/
    move-lead-stage/
    merge-leads/
    import-leads-csv/
    create-task/
    update-task/
    upsert-custom-field/
```

## Migration naming convention

Use sortable UTC timestamps and a clear suffix:

```text
YYYYMMDDHHMMSS_<purpose>.sql
```

Examples:

- `20260327155000_extensions_enums.sql`
- `20260327155100_base_schema_core.sql`
- `20260327155450_rls_crm.sql`

## Local development workflow

1. Install dependencies:
   - `npm install`
   - Install Supabase CLI if needed
2. Copy environment files:
   - `.env.example` to `.env`
   - `supabase/functions/.env.example` to your function env source
3. Start Supabase locally:
   - `supabase start`
4. Reset and apply migrations:
   - `supabase db reset`
5. Optional local demo seed after creating `owner@example.com`:
   - `supabase db query < supabase/seed/dev_seed.sql`
6. Run the frontend:
   - `npm run dev`
7. Generate fresh Supabase types when schema changes:
   - `npm run supabase:types`

Recommended day-to-day loop:

- Change SQL first
- Run `supabase db reset`
- Regenerate types if desired
- Update Edge Functions or frontend services
- Run `npm run typecheck`

## Future integration approach

Keep external integrations behind Edge Functions, never directly in the browser:

- Twilio: inbound/outbound SMS and call events create `activity_timeline_events` and `audit_logs`
- Google Calendar: OAuth tokens stored per workspace/user, booking writes create appointment timeline events
- Email provider: Resend/SMTP adapter behind an `email-dispatch` function
- Workflows: trigger table or queue table plus cron-ready worker function
- OpenAI: workspace-safe prompt execution in Edge Functions, AI outputs stored as timeline events and structured insight records

## Example Edge Function payloads

### `create-workspace`

Request:

```json
{
  "name": "Acme Realty",
  "slug": "acme-realty",
  "timezone": "Asia/Kolkata"
}
```

Response:

```json
{
  "workspace": {
    "id": "uuid",
    "name": "Acme Realty",
    "slug": "acme-realty"
  },
  "pipeline": {
    "id": "uuid",
    "name": "Default Pipeline",
    "stages": []
  }
}
```

### `create-lead`

Request:

```json
{
  "workspaceId": "uuid",
  "firstName": "Aarav",
  "lastName": "Mehta",
  "email": "aarav@example.com",
  "phone": "+91 98765 43210",
  "status": "new",
  "priority": "medium"
}
```

Response:

```json
{
  "lead": {
    "id": "uuid",
    "full_name": "Aarav Mehta"
  }
}
```

### `import-leads-csv`

Request:

```json
{
  "workspaceId": "uuid",
  "fileName": "leads.csv",
  "filePath": "workspace-id/import-id/leads.csv",
  "headers": ["First Name", "Last Name", "Email"],
  "fieldMapping": {
    "firstName": "First Name",
    "lastName": "Last Name",
    "email": "Email"
  },
  "previewRows": [
    {
      "First Name": "Aarav",
      "Last Name": "Mehta",
      "Email": "aarav@example.com"
    }
  ],
  "duplicateDetection": {
    "strategy": "flag",
    "fields": ["email", "phone"]
  }
}
```

Response:

```json
{
  "import": {
    "id": "uuid",
    "status": "mapped"
  },
  "nextStep": "Queue a batch processor or cron-ready worker to normalize and insert leads."
}
```

## RLS examples

- Workspace members can read tenant-owned records only when `workspace_id` belongs to an active membership.
- Managers and above can manage pipelines, invitations, workspace settings, and custom fields.
- Agents can create and update leads/tasks through trusted Edge Functions and are limited by membership plus business rules.
- Storage uploads are partitioned by `workspace_id/...` path segments and checked with workspace-aware storage policies.

## Critical test suggestions

- Auth bootstrap creates `profiles` rows from `auth.users`
- Workspace creation seeds default membership, sources, and pipeline stages
- RLS blocks cross-workspace lead reads
- Agent users cannot mutate another workspace
- Lead creation writes `audit_logs` and `activity_timeline_events`
- Stage movement inserts `lead_stage_history`
- CSV import creates `imports` and `import_rows`
- Invitation acceptance requires matching email and valid token

## Deployment

Frontend:

- Vercel or Netlify
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

Supabase:

- Link project with `supabase link`
- Push migrations with `supabase db push`
- Deploy functions with `supabase functions deploy <name>`
- Set secrets for service role, OpenAI, Twilio, Google, and email providers
