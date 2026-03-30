create extension if not exists "pgcrypto";
create extension if not exists "citext";

create schema if not exists app;

create type public.workspace_status as enum ('active', 'suspended', 'archived');
create type public.membership_status as enum ('invited', 'active', 'inactive');
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
create type public.lead_status as enum ('new', 'active', 'nurturing', 'qualified', 'won', 'lost', 'archived');
create type public.task_status as enum ('open', 'in_progress', 'completed', 'cancelled');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.contact_method_type as enum ('email', 'phone', 'sms', 'whatsapp', 'other');
create type public.custom_field_type as enum ('text', 'textarea', 'number', 'date', 'datetime', 'boolean', 'single_select', 'multi_select', 'json');
create type public.custom_field_entity_type as enum ('lead');
create type public.import_status as enum ('uploaded', 'mapped', 'processing', 'completed', 'failed');
create type public.import_row_status as enum ('pending', 'imported', 'skipped', 'failed');
create type public.timeline_event_type as enum (
  'lead_created',
  'lead_updated',
  'note',
  'task_created',
  'task_updated',
  'task_completed',
  'stage_change',
  'tag_added',
  'tag_removed',
  'import',
  'sms',
  'email',
  'call',
  'appointment',
  'ai_summary',
  'workflow_run'
);
create type public.source_type as enum ('manual', 'website', 'referral', 'import', 'portal', 'advertising', 'other');
