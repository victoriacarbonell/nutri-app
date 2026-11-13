import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey, ApiError } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { isApiStatus } from "@/lib/api-errors";

import Home from "./pages/Home";
import Foods from "./pages/Foods";
import Recipes from "./pages/Recipes";
import Calendar from "./pages/Calendar";
import Profile from "./pages/Profile";
import Scan from "./pages/Scan";
import Progress from "./pages/Progress";
import Stats from "./pages/Stats";
import AISummaries from "./pages/AISummaries";
import Login from "./pages/Login";
import AppLayout from "./components/layout/AppLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // No tiene sentido reintentar errores del cliente (401, 404, 429...).
      retry: (count, error) =>
        count < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
  queryCache: new QueryCache({
    // Si cualquier consulta responde 401 (sesión caducada), se vuelve a
    // comprobar /auth/me y la puerta de abajo enseña el login.
    onError: (error) => {
      if (isApiStatus(error, 401)) {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      }
    },
  }),
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false, staleTime: 5 * 60 * 1000 },
  });

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user) {
    const notice = error && !isApiStatus(error, 401)
      ? "No se pudo conectar con el servidor. Comprueba que el API está en marcha."
      : null;
    return <Login notice={notice} />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/alimentos" component={Foods} />
        <Route path="/recetas" component={Recipes} />
        <Route path="/calendario" component={Calendar} />
        <Route path="/perfil" component={Profile} />
        <Route path="/escanear" component={Scan} />
        <Route path="/progreso" component={Progress} />
        <Route path="/estadisticas" component={Stats} />
        <Route path="/ia" component={AISummaries} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthGate>
            <Router />
          </AuthGate>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
