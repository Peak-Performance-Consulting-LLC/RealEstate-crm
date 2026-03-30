import type { WorkspaceRole } from "@/lib/permissions";

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export interface WorkspaceMembership {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  role: WorkspaceRole;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  settings: Record<string, unknown>;
}

export type LeadType = "buyer" | "seller" | "tenant" | "landlord" | "investor";

export interface LeadPropertyPreferences {
  locations?: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  rentMin?: number | null;
  rentMax?: number | null;
  propertyTypes?: string[];
  timeline?: string | null;
  financingNeeded?: "yes" | "no" | "not_sure" | null;
  roiGoal?: string | null;
  expectedSalePrice?: number | null;
  expectedRent?: number | null;
  availableFrom?: string | null;
}

export interface LeadAddress {
  fullAddress?: string | null;
}

export interface LeadMetadata {
  sourceDetails?: string | null;
  [key: string]: unknown;
}

export interface LeadSummary {
  id: string;
  workspace_id: string;
  lead_type: LeadType | null;
  first_name: string;
  last_name: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  alternate_phone: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  source_id: string | null;
  pipeline_id: string | null;
  current_stage_id: string | null;
  property_preferences: LeadPropertyPreferences;
  address: LeadAddress;
  metadata: LeadMetadata;
  created_at: string;
  updated_at: string;
}

export interface LeadTag {
  tag_id: string;
  name: string;
  color: string | null;
}

export interface LeadContactMethod {
  id: string;
  type: string;
  label: string | null;
  value: string;
  is_primary: boolean;
}

export interface LeadTask {
  id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_at: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface LeadNote {
  id: string;
  body: string;
  created_at: string;
  created_by: string;
}

export interface StageHistoryItem {
  id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  reason: string | null;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  event_type: string;
  summary: string;
  occurred_at: string;
  body: Record<string, unknown>;
}

export interface CustomField {
  id: string;
  name: string;
  slug: string;
  field_type: string;
  is_required: boolean;
  is_active: boolean;
  position: number;
  config: Record<string, unknown>;
}

export interface CustomFieldValue {
  id: string;
  custom_field_id: string;
  entity_id: string;
  value_text: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
  value_date: string | null;
  value_json: Record<string, unknown> | null;
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  slug: string;
  color: string | null;
  position: number;
  is_default: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  position: number;
  is_default: boolean;
  stages: PipelineStage[];
}

export interface LeadSource {
  id: string;
  name: string;
  type: string;
}

export interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  role: WorkspaceRole;
  status: string;
}

export interface Invitation {
  id: string;
  email: string;
  status: string;
  expires_at: string;
}

export interface ImportJob {
  id: string;
  file_name: string;
  status: string;
  row_count: number;
  processed_count: number;
  failed_count: number;
  created_at: string;
}

export interface LeadDetail {
  lead: LeadSummary;
  tags: LeadTag[];
  contactMethods: LeadContactMethod[];
  tasks: LeadTask[];
  notes: LeadNote[];
  stageHistory: StageHistoryItem[];
  timeline: TimelineEvent[];
  customFields: CustomField[];
  customFieldValues: CustomFieldValue[];
}

export interface DashboardMetrics {
  totalLeads: number;
  openTasks: number;
  dueToday: number;
  newThisWeek: number;
}

export interface CreateLeadPayload {
  workspaceId: string;
  leadType: LeadType;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  sourceId: string;
  assignedTo?: string | null;
  status?: "new" | "active" | "nurturing" | "qualified";
  priority: "low" | "medium" | "high" | "urgent";
  pipelineId?: string;
  currentStageId?: string;
  propertyPreferences?: LeadPropertyPreferences;
  address?: LeadAddress;
  metadata?: LeadMetadata;
  initialInquirySummary?: string | null;
}

export interface UpdateLeadPayload {
  workspaceId: string;
  leadId: string;
  leadType: LeadType;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  sourceId?: string | null;
  assignedTo?: string | null;
  status?: "new" | "active" | "nurturing" | "qualified";
  priority: "low" | "medium" | "high" | "urgent";
  pipelineId?: string;
  currentStageId?: string;
  propertyPreferences?: LeadPropertyPreferences;
  address?: LeadAddress;
  metadata?: LeadMetadata;
}
