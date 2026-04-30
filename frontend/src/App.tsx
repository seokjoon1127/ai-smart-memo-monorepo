import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "@/router/routes";
import { adminApi, authApi } from "@/services";
import { LoginPage } from "@/pages/LoginPage";
import { AuthProvider } from "@/contexts/AuthContext";
import type { AuthUser } from "@/types/api";

const GUEST_MODE_KEY = "ai-smart-memo-guest-mode";

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(GUEST_MODE_KEY) === "true") {
      adminApi.reset().finally(() => {
        queryClient.clear();
        setUser(null);
        setIsGuest(true);
        setReady(true);
      });
      return;
    }

    authApi
      .me()
      .then((response) => {
        setUser(response.user);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setReady(true);
      });
  }, []);

  const handleLogout = async () => {
    if (user) {
      await authApi.logout();
    }

    sessionStorage.removeItem(GUEST_MODE_KEY);
    queryClient.clear();
    setUser(null);
    setIsGuest(false);
  };

  if (!ready) return null;

  if (!user && !isGuest) {
    return (
      <LoginPage
        onLogin={(loggedInUser) => {
          setUser(loggedInUser);
          setIsGuest(false);
        }}
        onGuest={() => {
          sessionStorage.setItem(GUEST_MODE_KEY, "true");

          void adminApi.reset().finally(() => {
            queryClient.clear();
            setUser(null);
            setIsGuest(true);
          });
        }}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider value={{ user, isGuest, logout: handleLogout }}>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
