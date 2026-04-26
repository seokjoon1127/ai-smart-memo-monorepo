import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "@/router/routes";
import { adminApi } from "@/services";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    adminApi.reset().finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
