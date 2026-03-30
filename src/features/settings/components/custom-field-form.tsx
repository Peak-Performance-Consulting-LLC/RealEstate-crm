import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { useWorkspace } from "@/app/workspace-provider";
import { invokeFunction } from "@/services/api";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  fieldType: z.enum(["text", "textarea", "number", "date", "datetime", "boolean", "single_select", "multi_select", "json"]),
});

type FormValues = z.infer<typeof schema>;

export function CustomFieldForm() {
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [fieldType, setFieldType] = useState<FormValues["fieldType"]>("text");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      fieldType: "text",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      return invokeFunction("upsert-custom-field", {
        workspaceId: activeWorkspaceId,
        name: values.name,
        slug: values.slug,
        fieldType,
        isRequired: false,
        isActive: true,
        position: 0,
        options: [],
      });
    },
    onSuccess: async () => {
      toast.success("Custom field saved");
      await queryClient.invalidateQueries({ queryKey: ["custom-fields", activeWorkspaceId] });
      form.reset();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to save custom field"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add custom field</CardTitle>
        <CardDescription>Lead schemas stay flexible without breaking the base lead table or future integrations.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-[1fr_1fr_220px_auto]" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className="space-y-2">
            <Label htmlFor="field-name">Name</Label>
            <Input id="field-name" {...form.register("name")} placeholder="Preferred locality" />
            <p className="text-xs text-destructive">{form.formState.errors.name?.message}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="field-slug">Slug</Label>
            <Input id="field-slug" {...form.register("slug")} placeholder="preferred_locality" />
            <p className="text-xs text-destructive">{form.formState.errors.slug?.message}</p>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <AppSelect
              onValueChange={(value) => {
                setFieldType(value as FormValues["fieldType"]);
                form.setValue("fieldType", value as FormValues["fieldType"]);
              }}
              options={[
                { label: "Text", value: "text" },
                { label: "Textarea", value: "textarea" },
                { label: "Number", value: "number" },
                { label: "Date", value: "date" },
                { label: "Datetime", value: "datetime" },
                { label: "Boolean", value: "boolean" },
                { label: "Single select", value: "single_select" },
                { label: "Multi select", value: "multi_select" },
                { label: "JSON", value: "json" },
              ]}
              value={fieldType}
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full" disabled={mutation.isPending} type="submit">
              Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
