"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { PendingInviteApplier } from "@/components/pending-invite";
import { SyncPlantReturns } from "@/components/sync-earnings";
import { ThemeProvider } from "@/components/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <PendingInviteApplier />
        <SyncPlantReturns />
        {children}
        <Toaster richColors position="top-center" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
