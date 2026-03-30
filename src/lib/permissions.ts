export type WorkspaceRole = "owner" | "admin" | "manager" | "agent" | "readonly";

const managerRoles: WorkspaceRole[] = ["owner", "admin", "manager"];
const contributorRoles: WorkspaceRole[] = [...managerRoles, "agent"];

export function canManageWorkspace(role?: WorkspaceRole | null) {
  return role ? managerRoles.includes(role) : false;
}

export function canContribute(role?: WorkspaceRole | null) {
  return role ? contributorRoles.includes(role) : false;
}
