import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/query-client";
import { SessionProvider } from "@/app/session-provider";
import { WorkspaceProvider } from "@/app/workspace-provider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </SessionProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
