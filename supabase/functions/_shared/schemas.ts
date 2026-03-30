import { z } from "npm:zod@3.24.3";

const uuid = z.string().uuid();
const leadTypeSchema = z.enum(["buyer", "seller", "tenant", "landlord", "investor"]);

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  timezone: z.string().min(2).max(80).default("UTC"),
});

export const inviteMemberSchema = z.object({
  workspaceId: uuid,
  email: z.string().email(),
  roleSlug: z.enum(["admin", "manager", "agent", "readonly"]),
});

export const acceptInvitationSchema = z.object({
  token: uuid,
});

export const leadContactMethodInputSchema = z.object({
  type: z.enum(["email", "phone", "sms", "whatsapp", "other"]),
  label: z.string().max(60).optional(),
  value: z.string().min(1).max(160),
  isPrimary: z.boolean().default(false),
});

export const customFieldValueInputSchema = z.object({
  customFieldId: uuid,
  valueText: z.string().optional().nullable(),
  valueNumber: z.number().optional().nullable(),
  valueBoolean: z.boolean().optional().nullable(),
  valueDate: z.string().datetime().optional().nullable(),
  valueJson: z.record(z.any()).optional().nullable(),
});

const createLeadBaseSchema = z.object({
  workspaceId: uuid,
  leadType: leadTypeSchema,
  pipelineId: uuid.optional(),
  currentStageId: uuid.optional(),
  sourceId: uuid,
  assignedTo: uuid.optional().nullable(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional().nullable(),
  companyName: z.string().max(120).optional().nullable(),
  jobTitle: z.string().max(120).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  alternatePhone: z.string().max(40).optional().nullable(),
  status: z.enum(["new", "active", "nurturing", "qualified"]).default("new"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  propertyPreferences: z.record(z.any()).optional(),
  address: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  contactMethods: z.array(leadContactMethodInputSchema).default([]),
  tagIds: z.array(uuid).default([]),
  customFieldValues: z.array(customFieldValueInputSchema).default([]),
  initialInquirySummary: z.string().max(2000).optional().nullable(),
});

export const createLeadSchema = createLeadBaseSchema.refine((value) => Boolean(value.phone || value.email), {
  message: "Phone or email is required",
  path: ["phone"],
});

export const updateLeadSchema = createLeadBaseSchema
  .omit({ workspaceId: true, firstName: true, sourceId: true, leadType: true, initialInquirySummary: true })
  .partial()
  .extend({
    workspaceId: uuid,
    leadId: uuid,
    leadType: leadTypeSchema.optional(),
    firstName: z.string().min(1).max(80).optional(),
    sourceId: uuid.optional().nullable(),
  })
  .refine((value) => Boolean(value.phone || value.email || value.firstName || value.lastName || value.assignedTo || value.sourceId || value.priority || value.status || value.pipelineId || value.currentStageId || value.propertyPreferences || value.address || value.metadata || value.alternatePhone || value.companyName || value.jobTitle || value.contactMethods || value.tagIds || value.customFieldValues || value.leadType), {
    message: "At least one lead field must be provided",
    path: ["leadId"],
  });

export const moveLeadStageSchema = z.object({
  workspaceId: uuid,
  leadId: uuid,
  pipelineId: uuid,
  toStageId: uuid,
  reason: z.string().max(280).optional().nullable(),
});

export const mergeLeadsSchema = z.object({
  workspaceId: uuid,
  primaryLeadId: uuid,
  secondaryLeadId: uuid,
});

export const taskSchema = z.object({
  workspaceId: uuid,
  leadId: uuid.optional().nullable(),
  title: z.string().min(1).max(160),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).default("open"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueAt: z.string().datetime().optional().nullable(),
  assignedTo: uuid.optional().nullable(),
  metadata: z.record(z.any()).optional(),
});

export const createTaskSchema = taskSchema;

export const updateTaskSchema = taskSchema.partial().extend({
  workspaceId: uuid,
  taskId: uuid,
});

export const customFieldOptionInputSchema = z.object({
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(80),
  color: z.string().max(20).optional().nullable(),
  position: z.number().int().min(0).default(0),
});

export const upsertCustomFieldSchema = z.object({
  workspaceId: uuid,
  customFieldId: uuid.optional(),
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120),
  fieldType: z.enum(["text", "textarea", "number", "date", "datetime", "boolean", "single_select", "multi_select", "json"]),
  isRequired: z.boolean().default(false),
  isActive: z.boolean().default(true),
  position: z.number().int().min(0).default(0),
  config: z.record(z.any()).optional(),
  options: z.array(customFieldOptionInputSchema).default([]),
});

export const importLeadsCsvSchema = z.object({
  workspaceId: uuid,
  fileName: z.string().min(1),
  filePath: z.string().min(1),
  headers: z.array(z.string()).default([]),
  fieldMapping: z.record(z.string()).default({}),
  previewRows: z.array(z.record(z.string(), z.string().nullable())).max(50).default([]),
  duplicateDetection: z.object({
    strategy: z.enum(["skip", "merge", "flag"]).default("flag"),
    fields: z.array(z.enum(["email", "phone", "full_name"])).default(["email", "phone"]),
  }),
});
