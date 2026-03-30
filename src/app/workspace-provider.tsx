import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { useQuery } from "@tanstack/react-query";
import { listMyWorkspaces } from "@/services/workspace.service";
import type { WorkspaceMembership } from "@/types/domain";
import { useSession } from "@/app/session-provider";

const storageKey = "crm.activeWorkspaceId";

interface WorkspaceContextValue {
  isLoading: boolean;
  memberships: WorkspaceMembership[];
  activeWorkspaceId: string | null;
  activeMembership: WorkspaceMembership | null;
  setActiveWorkspaceId: (workspaceId: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: PropsWithChildren) {
  const { user } = useSession();
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(() => localStorage.getItem(storageKey));
  const membershipsQuery = useQuery({
    queryKey: ["workspaces", "memberships", user?.id],
    queryFn: listMyWorkspaces,
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!membershipsQuery.data || membershipsQuery.data.length === 0) return;

    const currentStillValid = membershipsQuery.data.some((membership) => membership.workspaceId === activeWorkspaceId);
    if (!currentStillValid) {
      const fallback = membershipsQuery.data[0].workspaceId;
      setActiveWorkspaceIdState(fallback);
      localStorage.setItem(storageKey, fallback);
    }
  }, [activeWorkspaceId, membershipsQuery.data]);

  const value = useMemo(() => {
    const memberships = membershipsQuery.data ?? [];
    const activeMembership = memberships.find((membership) => membership.workspaceId === activeWorkspaceId) ?? null;

    return {
      isLoading: membershipsQuery.isLoading,
      memberships,
      activeWorkspaceId,
      activeMembership,
      setActiveWorkspaceId: (workspaceId: string) => {
        setActiveWorkspaceIdState(workspaceId);
        localStorage.setItem(storageKey, workspaceId);
      },
    };
  }, [activeWorkspaceId, membershipsQuery.data, membershipsQuery.isLoading]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return value;
}
