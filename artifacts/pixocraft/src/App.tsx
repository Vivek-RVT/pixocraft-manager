import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ClientAuthProvider } from "@/hooks/use-client-auth";
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
import MonthlyServices from "@/pages/monthly-services";
import PortalLogin from "@/pages/portal-login";
import PortalDashboard from "@/pages/portal-dashboard";

function AdminRoutes() {
  const { isLoggedIn, isChecking } = useAuth();

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.webp" alt="Pixocraft" className="w-14 h-14 rounded-xl animate-pulse" />
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

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
        <Route path="/monthly-services" component={MonthlyServices} />
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
          <WouterRouter>
            <Switch>
              <Route path="/portal">
                <ClientAuthProvider>
                  <PortalLogin />
                </ClientAuthProvider>
              </Route>
              <Route path="/portal/dashboard">
                <ClientAuthProvider>
                  <PortalDashboard />
                </ClientAuthProvider>
              </Route>
              <Route>
                <AuthProvider>
                  <AdminRoutes />
                </AuthProvider>
              </Route>
            </Switch>
          </WouterRouter>
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
