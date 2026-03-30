import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { Textarea } from "@/components/ui/textarea";
import { createLead, listSources, updateLead } from "@/services/leads.service";
import { useWorkspace } from "@/app/workspace-provider";
import { toast } from "sonner";
import { listTeamMembers } from "@/services/workspace.service";
import type { LeadAddress, LeadMetadata, LeadPropertyPreferences, LeadType } from "@/types/domain";

const leadTypeOptions: Array<{ label: string; value: LeadType }> = [
  { label: "Buyer", value: "buyer" },
  { label: "Seller", value: "seller" },
  { label: "Tenant", value: "tenant" },
  { label: "Landlord", value: "landlord" },
  { label: "Investor", value: "investor" },
];

const timelineOptions = [
  { label: "Immediately", value: "immediately" },
  { label: "Within 30 days", value: "30_days" },
  { label: "1 to 3 months", value: "1_3_months" },
  { label: "3 to 6 months", value: "3_6_months" },
  { label: "Just researching", value: "researching" },
];

const financingOptions = [
  { label: "Not sure yet", value: "not_sure" },
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

const schema = z
  .object({
    leadType: z.enum(["buyer", "seller", "tenant", "landlord", "investor"]),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().optional(),
    email: z.string().email("Use a valid email").optional().or(z.literal("")),
    phone: z.string().optional(),
    alternatePhone: z.string().optional(),
    sourceId: z.string().min(1, "Source is required"),
    assignedTo: z.string().optional(),
    status: z.enum(["new", "active", "nurturing", "qualified"]),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    locations: z.string().optional(),
    propertyTypes: z.string().optional(),
    budgetMin: z.string().optional(),
    budgetMax: z.string().optional(),
    rentMin: z.string().optional(),
    rentMax: z.string().optional(),
    timeline: z.string().optional(),
    financingNeeded: z.string().optional(),
    expectedSalePrice: z.string().optional(),
    expectedRent: z.string().optional(),
    propertyAddress: z.string().optional(),
    availableFrom: z.string().optional(),
    roiGoal: z.string().optional(),
    sourceDetails: z.string().optional(),
    initialInquirySummary: z.string().optional(),
  })
  .refine((values) => Boolean(values.phone?.trim() || values.email?.trim()), {
    message: "Phone or email is required",
    path: ["phone"],
  });

export type LeadFormValues = z.infer<typeof schema>;

function parseList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumber(value?: string) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function compactRecord<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => {
      if (item === null || item === undefined || item === "") return false;
      if (Array.isArray(item)) return item.length > 0;
      if (typeof item === "object") return Object.keys(item as Record<string, unknown>).length > 0;
      return true;
    }),
  ) as T;
}

function buildPropertyPreferences(values: LeadFormValues): LeadPropertyPreferences {
  const common = {
    timeline: values.timeline?.trim() || null,
  };

  if (values.leadType === "buyer") {
    return compactRecord({
      ...common,
      locations: parseList(values.locations),
      propertyTypes: parseList(values.propertyTypes),
      budgetMin: parseNumber(values.budgetMin),
      budgetMax: parseNumber(values.budgetMax),
      financingNeeded: (values.financingNeeded?.trim() || null) as LeadPropertyPreferences["financingNeeded"],
    });
  }

  if (values.leadType === "seller") {
    return compactRecord({
      ...common,
      propertyTypes: parseList(values.propertyTypes),
      expectedSalePrice: parseNumber(values.expectedSalePrice),
    });
  }

  if (values.leadType === "tenant") {
    return compactRecord({
      ...common,
      locations: parseList(values.locations),
      propertyTypes: parseList(values.propertyTypes),
      rentMin: parseNumber(values.rentMin),
      rentMax: parseNumber(values.rentMax),
    });
  }

  if (values.leadType === "landlord") {
    return compactRecord({
      propertyTypes: parseList(values.propertyTypes),
      expectedRent: parseNumber(values.expectedRent),
      availableFrom: values.availableFrom?.trim() || null,
    });
  }

  return compactRecord({
    ...common,
    locations: parseList(values.locations),
    propertyTypes: parseList(values.propertyTypes),
    budgetMin: parseNumber(values.budgetMin),
    budgetMax: parseNumber(values.budgetMax),
    financingNeeded: (values.financingNeeded?.trim() || null) as LeadPropertyPreferences["financingNeeded"],
    roiGoal: values.roiGoal?.trim() || null,
  });
}

function buildAddress(values: LeadFormValues): LeadAddress {
  if (values.leadType !== "seller" && values.leadType !== "landlord") {
    return {};
  }

  return compactRecord({
    fullAddress: values.propertyAddress?.trim() || null,
  });
}

function buildMetadata(values: LeadFormValues): LeadMetadata {
  return compactRecord({
    sourceDetails: values.sourceDetails?.trim() || null,
  });
}

function sectionTitle(title: string, description: string) {
  return (
    <div className="md:col-span-2">
      <div className="rounded-2xl bg-slate-50 px-4 py-3">
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function LeadForm({
  leadId,
  defaultValues,
  onSuccess,
  embedded = false,
}: {
  leadId?: string;
  defaultValues?: Partial<LeadFormValues>;
  onSuccess?: () => void;
  embedded?: boolean;
}) {
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      leadType: defaultValues?.leadType ?? "buyer",
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      alternatePhone: defaultValues?.alternatePhone ?? "",
      sourceId: defaultValues?.sourceId ?? "",
      assignedTo: defaultValues?.assignedTo ?? "",
      status: defaultValues?.status ?? "new",
      priority: defaultValues?.priority ?? "medium",
      locations: defaultValues?.locations ?? "",
      propertyTypes: defaultValues?.propertyTypes ?? "",
      budgetMin: defaultValues?.budgetMin ?? "",
      budgetMax: defaultValues?.budgetMax ?? "",
      rentMin: defaultValues?.rentMin ?? "",
      rentMax: defaultValues?.rentMax ?? "",
      timeline: defaultValues?.timeline ?? "",
      financingNeeded: defaultValues?.financingNeeded ?? "not_sure",
      expectedSalePrice: defaultValues?.expectedSalePrice ?? "",
      expectedRent: defaultValues?.expectedRent ?? "",
      propertyAddress: defaultValues?.propertyAddress ?? "",
      availableFrom: defaultValues?.availableFrom ?? "",
      roiGoal: defaultValues?.roiGoal ?? "",
      sourceDetails: defaultValues?.sourceDetails ?? "",
      initialInquirySummary: defaultValues?.initialInquirySummary ?? "",
    },
  });

  const leadType = form.watch("leadType");
  const priority = form.watch("priority");
  const sourceId = form.watch("sourceId");
  const assignedTo = form.watch("assignedTo");
  const status = form.watch("status");

  const sourcesQuery = useQuery({
    queryKey: ["lead-sources", activeWorkspaceId],
    queryFn: () => listSources(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });

  const teamQuery = useQuery({
    queryKey: ["team-members", activeWorkspaceId, "lead-form"],
    queryFn: () => listTeamMembers(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });

  useEffect(() => {
    if (!sourcesQuery.data?.length) return;
    if (form.getValues("sourceId")) return;
    form.setValue("sourceId", defaultValues?.sourceId || sourcesQuery.data[0].id, { shouldValidate: true });
  }, [defaultValues?.sourceId, form, sourcesQuery.data]);

  const mutation = useMutation({
    mutationFn: async (values: LeadFormValues) => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");

      const propertyPreferences = buildPropertyPreferences(values);
      const address = buildAddress(values);
      const metadata = buildMetadata(values);

      const payload = {
        workspaceId: activeWorkspaceId,
        leadType: values.leadType,
        firstName: values.firstName,
        lastName: values.lastName || null,
        email: values.email || null,
        phone: values.phone || null,
        alternatePhone: values.alternatePhone || null,
        sourceId: values.sourceId,
        assignedTo: values.assignedTo || null,
        status: values.status,
        priority: values.priority,
        propertyPreferences,
        address,
        metadata,
        initialInquirySummary: values.initialInquirySummary || null,
      };

      return leadId ? updateLead({ ...payload, leadId }) : createLead(payload);
    },
    onSuccess: async () => {
      toast.success(leadId ? "Lead updated" : "Lead created");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leads", activeWorkspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", activeWorkspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["lead-detail", activeWorkspaceId, leadId] }),
      ]);
      onSuccess?.();
      if (!leadId) {
        form.reset({
          leadType: "buyer",
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          alternatePhone: "",
          sourceId: sourcesQuery.data?.[0]?.id ?? "",
          assignedTo: "",
          status: "new",
          priority: "medium",
          locations: "",
          propertyTypes: "",
          budgetMin: "",
          budgetMax: "",
          rentMin: "",
          rentMax: "",
          timeline: "",
          financingNeeded: "not_sure",
          expectedSalePrice: "",
          expectedRent: "",
          propertyAddress: "",
          availableFrom: "",
          roiGoal: "",
          sourceDetails: "",
          initialInquirySummary: "",
        });
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to save lead"),
  });

  const sourceOptions = (sourcesQuery.data ?? []).map((source) => ({
    label: `${source.name} (${source.type})`,
    value: source.id,
  }));

  const assigneeOptions = [
    { label: "Unassigned", value: "unassigned" },
    ...(teamQuery.data ?? [])
      .filter((member) => member.status === "active" && member.role !== "readonly")
      .map((member) => ({
        label: `${member.fullName} (${member.role})`,
        value: member.id,
      })),
  ];

  const formBody = (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          {sectionTitle("Contact Information", "Capture the person and the best way to reach them.")}
          <div className="space-y-2">
            <Label htmlFor="lead-first-name">First name</Label>
            <Input id="lead-first-name" {...form.register("firstName")} placeholder="Aarav" />
            <p className="text-xs text-destructive">{form.formState.errors.firstName?.message}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-last-name">Last name</Label>
            <Input id="lead-last-name" {...form.register("lastName")} placeholder="Mehta" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-phone">Phone</Label>
            <Input id="lead-phone" {...form.register("phone")} placeholder="+91 98765 43210" />
            <p className="text-xs text-destructive">{form.formState.errors.phone?.message}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-email">Email</Label>
            <Input id="lead-email" {...form.register("email")} placeholder="lead@example.com" />
            <p className="text-xs text-destructive">{form.formState.errors.email?.message}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-alt-phone">Alternate phone / WhatsApp</Label>
            <Input id="lead-alt-phone" {...form.register("alternatePhone")} placeholder="+91 99887 77665" />
          </div>

          {sectionTitle("Lead Classification", "Use lead type, status, and priority to shape the right workflow from day one.")}
          <div className="space-y-2">
            <Label>Lead type</Label>
            <AppSelect
              onValueChange={(value) => form.setValue("leadType", value as LeadType, { shouldValidate: true })}
              options={leadTypeOptions}
              value={leadType}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <AppSelect
              onValueChange={(value) => form.setValue("status", value as LeadFormValues["status"], { shouldValidate: true })}
              options={[
                { label: "New", value: "new" },
                { label: "Active", value: "active" },
                { label: "Nurturing", value: "nurturing" },
                { label: "Qualified", value: "qualified" },
              ]}
              value={status}
            />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <AppSelect
              onValueChange={(value) => form.setValue("priority", value as LeadFormValues["priority"], { shouldValidate: true })}
              options={[
                { label: "Low", value: "low" },
                { label: "Medium", value: "medium" },
                { label: "High", value: "high" },
                { label: "Urgent", value: "urgent" },
              ]}
              value={priority}
            />
          </div>

          {sectionTitle("Property Requirement / Real Estate Details", "Only the fields relevant to the selected lead type are shown.")}
          {(leadType === "buyer" || leadType === "tenant" || leadType === "investor") && (
            <>
              <div className="space-y-2">
                <Label htmlFor="lead-locations">Preferred / target locations</Label>
                <Input id="lead-locations" {...form.register("locations")} placeholder="South Delhi, Noida, Gurgaon" />
                <p className="text-xs text-slate-500">Use comma-separated values.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-property-types">Property types</Label>
                <Input id="lead-property-types" {...form.register("propertyTypes")} placeholder="Apartment, Villa, Plot" />
                <p className="text-xs text-slate-500">Use comma-separated values.</p>
              </div>
            </>
          )}

          {leadType === "buyer" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="buyer-budget-min">Budget range</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input id="buyer-budget-min" {...form.register("budgetMin")} placeholder="Min" type="number" />
                  <Input {...form.register("budgetMax")} placeholder="Max" type="number" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Timeline</Label>
                <AppSelect onValueChange={(value) => form.setValue("timeline", value)} options={timelineOptions} value={form.watch("timeline") || undefined} />
              </div>
              <div className="space-y-2">
                <Label>Financing needed</Label>
                <AppSelect
                  onValueChange={(value) => form.setValue("financingNeeded", value)}
                  options={financingOptions}
                  value={form.watch("financingNeeded") || undefined}
                />
              </div>
            </>
          )}

          {leadType === "seller" && (
            <>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="seller-address">Property address</Label>
                <Textarea id="seller-address" {...form.register("propertyAddress")} placeholder="Full property address" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seller-types">Property type</Label>
                <Input id="seller-types" {...form.register("propertyTypes")} placeholder="Apartment, Villa, Plot" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seller-price">Expected sale price</Label>
                <Input id="seller-price" {...form.register("expectedSalePrice")} placeholder="4500000" type="number" />
              </div>
              <div className="space-y-2">
                <Label>Timeline</Label>
                <AppSelect onValueChange={(value) => form.setValue("timeline", value)} options={timelineOptions} value={form.watch("timeline") || undefined} />
              </div>
            </>
          )}

          {leadType === "tenant" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tenant-rent-min">Rent range</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input id="tenant-rent-min" {...form.register("rentMin")} placeholder="Min" type="number" />
                  <Input {...form.register("rentMax")} placeholder="Max" type="number" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Move-in timeline</Label>
                <AppSelect onValueChange={(value) => form.setValue("timeline", value)} options={timelineOptions} value={form.watch("timeline") || undefined} />
              </div>
            </>
          )}

          {leadType === "landlord" && (
            <>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="landlord-address">Property address</Label>
                <Textarea id="landlord-address" {...form.register("propertyAddress")} placeholder="Full property address" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landlord-rent">Expected rent</Label>
                <Input id="landlord-rent" {...form.register("expectedRent")} placeholder="75000" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landlord-available">Available from</Label>
                <Input id="landlord-available" {...form.register("availableFrom")} type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landlord-types">Property type</Label>
                <Input id="landlord-types" {...form.register("propertyTypes")} placeholder="Apartment, Villa, Office" />
              </div>
            </>
          )}

          {leadType === "investor" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="investor-budget-min">Investment budget</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input id="investor-budget-min" {...form.register("budgetMin")} placeholder="Min" type="number" />
                  <Input {...form.register("budgetMax")} placeholder="Max" type="number" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Timeline</Label>
                <AppSelect onValueChange={(value) => form.setValue("timeline", value)} options={timelineOptions} value={form.watch("timeline") || undefined} />
              </div>
              <div className="space-y-2">
                <Label>Financing needed</Label>
                <AppSelect
                  onValueChange={(value) => form.setValue("financingNeeded", value)}
                  options={financingOptions}
                  value={form.watch("financingNeeded") || undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investor-roi">ROI goal</Label>
                <Input id="investor-roi" {...form.register("roiGoal")} placeholder="12% rental yield" />
              </div>
            </>
          )}

          {sectionTitle("Source & Assignment", "Track attribution now so routing and reporting stay clean later.")}
          <div className="space-y-2">
            <Label>Source</Label>
            <AppSelect onValueChange={(value) => form.setValue("sourceId", value, { shouldValidate: true })} options={sourceOptions} value={sourceId || undefined} />
            <p className="text-xs text-destructive">{form.formState.errors.sourceId?.message}</p>
          </div>
          <div className="space-y-2">
            <Label>Assigned to</Label>
            <AppSelect
              onValueChange={(value) => form.setValue("assignedTo", value === "unassigned" ? "" : value)}
              options={assigneeOptions}
              value={assignedTo || "unassigned"}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="lead-source-details">Source details</Label>
            <Textarea
              id="lead-source-details"
              {...form.register("sourceDetails")}
              placeholder="Portal name, referral name, campaign details, ad set, or any acquisition context."
            />
          </div>

          {sectionTitle("Follow-up & Notes", "Capture the raw inquiry context now and let richer workflow actions happen later in the profile.")}
          {!leadId ? (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="lead-inquiry-summary">Initial inquiry summary</Label>
              <Textarea
                id="lead-inquiry-summary"
                {...form.register("initialInquirySummary")}
                placeholder="What did the lead ask for? What is urgent? Any immediate next step?"
              />
            </div>
          ) : (
            <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              Add fresh notes from the lead profile timeline after saving changes. Create-time inquiry summary is only captured on new leads.
            </div>
          )}

          <div className="md:col-span-2">
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "Saving..." : leadId ? "Save changes" : "Create lead"}
            </Button>
          </div>
        </form>
  );

  if (embedded) {
    return formBody;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{leadId ? "Edit lead" : "Create lead"}</CardTitle>
        <CardDescription>Capture core contact data, real-estate requirements, attribution, and assignment without leaving the existing single-step workflow.</CardDescription>
      </CardHeader>
      <CardContent>{formBody}</CardContent>
    </Card>
  );
}
