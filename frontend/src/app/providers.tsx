"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Without a staleTime every component mount refetches; with all dashboard tabs kept
          // mounted that multiplied requests and made navigation slower over time.
          // Changes made by other people (a new task, an edited event...) show up without a manual
          // reload: visible queries refresh on a slow poll and when the window regains focus.
          queries: { staleTime: 30_000, refetchOnWindowFocus: true, refetchInterval: 30_000 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
