import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import DashboardPage from "@/pages/dashboard";
import ReceiptsPage from "@/pages/receipts";
import InvoicesPage from "@/pages/invoices";
import InvoiceDetailPage from "@/pages/invoice-detail";
import BookingsPage from "@/pages/bookings";
import CustomersPage from "@/pages/customers";
import SettingsPage from "@/pages/settings";

function AppRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/belege" component={ReceiptsPage} />
        <Route path="/rechnungen" component={InvoicesPage} />
        <Route path="/rechnungen/:id">
          {(params) => <InvoiceDetailPage id={params.id} />}
        </Route>
        <Route path="/buchungen" component={BookingsPage} />
        <Route path="/kunden" component={CustomersPage} />
        <Route path="/einstellungen" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
