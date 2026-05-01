import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Customers from "@/pages/customers";
import CustomerDetail from "@/pages/customer-detail";
import Services from "@/pages/services";
import Expenses from "@/pages/expenses";
import Transactions from "@/pages/transactions";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";

function AppRoutes() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Login />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/login" component={Dashboard} />
        <Route path="/customers" component={Customers} />
        <Route path="/customers/:id" component={CustomerDetail} />
        <Route path="/services" component={Services} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/transactions" component={Transactions} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="pixocraft-theme-v2">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter>
              <AppRoutes />
            </WouterRouter>
          </AuthProvider>
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
