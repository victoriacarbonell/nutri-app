import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "./pages/Home";
import Foods from "./pages/Foods";
import Recipes from "./pages/Recipes";
import Calendar from "./pages/Calendar";
import Profile from "./pages/Profile";
import Scan from "./pages/Scan";
import Progress from "./pages/Progress";
import Stats from "./pages/Stats";
import AISummaries from "./pages/AISummaries";
import AppLayout from "./components/layout/AppLayout";

const queryClient = new QueryClient();

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
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
