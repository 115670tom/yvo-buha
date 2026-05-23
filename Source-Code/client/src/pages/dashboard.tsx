import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, FileWarning } from "lucide-react";
import { formatCurrency, formatDate, MONTH_NAMES } from "@/lib/utils";
import type { Booking, Invoice } from "@shared/schema";

interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  profit: number;
  openInvoicesCount: number;
  openInvoicesAmount: number;
  monthlyBreakdown: { month: string; einnahmen: number; ausgaben: number }[];
  recentBookings: Booking[];
  openInvoices: Invoice[];
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold" data-testid="page-title">Übersicht</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  const chartData = (data?.monthlyBreakdown ?? []).map((m, idx) => ({
    name: MONTH_NAMES[idx],
    Einnahmen: m.einnahmen,
    Ausgaben: m.ausgaben,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold" data-testid="page-title">Übersicht</h1>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="kpi-income">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Einnahmen</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600">
              {formatCurrency(data?.totalIncome ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="kpi-expenses">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ausgaben</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-500">
              {formatCurrency(data?.totalExpenses ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="kpi-profit">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gewinn</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatCurrency(data?.profit ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="kpi-open-invoices">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Offene Rechnungen</CardTitle>
            <FileWarning className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-600">
              {data?.openInvoicesCount ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(data?.openInvoicesAmount ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card data-testid="monthly-chart">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Monatliche Einnahmen & Ausgaben</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="Einnahmen" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Ausgaben" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bottom section */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card data-testid="recent-bookings">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Letzte Buchungen</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.recentBookings?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Noch keine Buchungen vorhanden.
              </p>
            ) : (
              <div className="space-y-2">
                {data?.recentBookings?.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                    data-testid={`recent-booking-${b.id}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{b.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(b.bookingDate)}</p>
                    </div>
                    <span
                      className={`text-sm font-medium whitespace-nowrap ml-4 ${
                        b.type === "einnahme" ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {b.type === "einnahme" ? "+" : "−"}{formatCurrency(b.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open Invoices */}
        <Card data-testid="open-invoices-list">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Offene Rechnungen</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.openInvoices?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Keine offenen Rechnungen.
              </p>
            ) : (
              <div className="space-y-2">
                {data?.openInvoices?.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                    data-testid={`open-invoice-${inv.id}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        Fällig: {formatDate(inv.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                        {inv.status === "gesendet" ? "Offen" : "Teilw. bezahlt"}
                      </Badge>
                      <span className="text-sm font-medium whitespace-nowrap">
                        {formatCurrency(inv.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
