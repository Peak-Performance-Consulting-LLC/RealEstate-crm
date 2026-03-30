import { createServiceClient, createUserClient } from "../_shared/supabase.ts";
import { createWorkspaceSchema } from "../_shared/schemas.ts";
import { actorIdFromUser, writeAuditLog } from "../_shared/audit.ts";
import { defaultPipelineStages, defaultSources } from "../_shared/defaults.ts";
import { errorResponse, getErrorInfo, handleCors, jsonResponse } from "../_shared/http.ts";
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const payload = createWorkspaceSchema.parse(await req.json());
    const userClient = createUserClient(req);
    const serviceClient = createServiceClient();
    const user = await requireUser(userClient);

    const { data: ownerRole, error: ownerRoleError } = await serviceClient
      .from("roles")
      .select("id")
      .eq("slug", "owner")
      .single();

    if (ownerRoleError || !ownerRole) {
      throw ownerRoleError ?? new Error("Owner role missing");
    }

    const { data: workspace, error: workspaceError } = await serviceClient
      .from("workspaces")
      .insert({
        name: payload.name,
        slug: payload.slug,
        owner_profile_id: user.id,
        settings: {
          timezone: payload.timezone,
        },
      })
      .select("id, name, slug, settings")
      .single();

    if (workspaceError || !workspace) {
      throw workspaceError ?? new Error("Unable to create workspace");
    }

    const { error: memberError } = await serviceClient.from("workspace_members").insert({
      workspace_id: workspace.id,
      profile_id: user.id,
      role_id: ownerRole.id,
      status: "active",
      joined_at: new Date().toISOString(),
    });

    if (memberError) {
      throw memberError;
    }

    const { data: pipeline, error: pipelineError } = await serviceClient
      .from("pipelines")
      .insert({
        workspace_id: workspace.id,
        name: "Default Pipeline",
        position: 0,
        is_default: true,
        created_by: user.id,
      })
      .select("id, name")
      .single();

    if (pipelineError || !pipeline) {
      throw pipelineError ?? new Error("Unable to create default pipeline");
    }

    const { data: stages, error: stagesError } = await serviceClient
      .from("pipeline_stages")
      .insert(
        defaultPipelineStages.map((stage) => ({
          workspace_id: workspace.id,
          pipeline_id: pipeline.id,
          name: stage.name,
          slug: stage.slug,
          position: stage.position,
          color: stage.color,
          is_default: stage.isDefault,
          win_probability: stage.winProbability,
        })),
      )
      .select("id, name, slug, position, is_default");

    if (stagesError) {
      throw stagesError;
    }

    const { error: sourcesError } = await serviceClient.from("sources").insert(
      defaultSources.map((source) => ({
        workspace_id: workspace.id,
        name: source.name,
        type: source.type,
        is_system: true,
        created_by: user.id,
      })),
    );

    if (sourcesError) {
      throw sourcesError;
    }

    await writeAuditLog(serviceClient, {
      workspaceId: workspace.id,
      actorId: actorIdFromUser(user),
      action: "workspace.created",
      entityType: "workspace",
      entityId: workspace.id,
      after: workspace,
      metadata: {
        pipelineId: pipeline.id,
      },
    });

    return jsonResponse({
      workspace,
      pipeline: {
        ...pipeline,
        stages,
      },
    });
  } catch (error) {
    const { message, details } = getErrorInfo(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return errorResponse(message, status, details);
  }
});
