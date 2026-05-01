import { useMemo, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useGetRevenueTrend,
  getGetRevenueTrendQueryKey,
  useListCustomers,
  getListCustomersQueryKey,
  useListServices,
  getListServicesQueryKey,
  useListExpenses,
  getListExpensesQueryKey,
  useListTransactions,
  getListTransactionsQueryKey,
} from "@workspace/api-client-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  DateRangeFilter,
  getDefaultDateFilter,
  isInDateRange,
  type DateFilter,
} from "@/components/date-range-filter";

const monthLabel = (m: string) => {
  const [, mm] = m.split("-");
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec",
  ];
  return months[Number(mm) - 1] ?? m;
};

const compactRupee = (n: number) => {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${n}`;
};

const escapeCsv = (val: unknown): string => {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const downloadCsv = (filename: string, rows: Record<string, unknown>[]) => {
  if (!rows.length) {
    toast.error("Nothing to export yet");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success(`Exported ${filename}`);
};

export default function Reports() {
  const [dateFilter, setDateFilter] = useState<DateFilter>(getDefaultDateFilter());

  const { data: summary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });
  const { data: trend } = useGetRevenueTrend({
    query: { queryKey: getGetRevenueTrendQueryKey() },
  });
  const { data: customers } = useListCustomers(undefined, {
    query: { queryKey: getListCustomersQueryKey() },
  });
  const { data: services } = useListServices(undefined, {
    query: { queryKey: getListServicesQueryKey() },
  });
  const { data: expenses } = useListExpenses(undefined, {
    query: { queryKey: getListExpensesQueryKey() },
  });
  const { data: transactions } = useListTransactions(undefined, {
    query: { queryKey: getListTransactionsQueryKey() },
  });

  const filteredServices = useMemo(
    () => (services ?? []).filter((s) => isInDateRange(s.date, dateFilter)),
    [services, dateFilter],
  );
  const filteredExpenses = useMemo(
    () => (expenses ?? []).filter((e) => isInDateRange(e.date, dateFilter)),
    [expenses, dateFilter],
  );
  const filteredTransactions = useMemo(
    () => (transactions ?? []).filter((t) => isInDateRange(t.date, dateFilter)),
    [transactions, dateFilter],
  );

  const periodStats = useMemo(() => {
    const revenue = filteredServices.reduce((a, s) => a + Number(s.priceSold), 0);
    const profit = filteredServices.reduce((a, s) => a + Number(s.profit ?? 0), 0);
    const expTotal = filteredExpenses.reduce((a, e) => a + Number(e.amount), 0);
    return { revenue, profit, expenses: expTotal };
  }, [filteredServices, filteredExpenses]);

  const yearTotals = (trend ?? []).reduce(
    (acc, t) => {
      acc.revenue += t.revenue;
      acc.expenses += t.expenses;
      acc.profit += t.profit;
      return acc;
    },
    { revenue: 0, expenses: 0, profit: 0 },
  );

  const exports = [
    {
      title: "Services (period)",
      description: `${filteredServices.length} service entries in selected period`,
      onClick: () =>
        downloadCsv(
          "pixocraft-services.csv",
          filteredServices.map((s) => ({
            id: s.id,
            customer: s.customerName,
            service: s.serviceName,
            priceSold: s.priceSold,
            costPrice: s.costPrice,
            profit: s.profit,
            paymentStatus: s.paymentStatus,
            amountPaid: s.amountPaid,
            deliveryStatus: s.deliveryStatus,
            date: s.date,
            notes: s.notes ?? "",
          })),
        ),
    },
    {
      title: "Expenses (period)",
      description: `${filteredExpenses.length} expense entries in selected period`,
      onClick: () =>
        downloadCsv(
          "pixocraft-expenses.csv",
          filteredExpenses.map((e) => ({
            id: e.id,
            category: e.category,
            amount: e.amount,
            date: e.date,
            notes: e.notes ?? "",
          })),
        ),
    },
    {
      title: "Transactions (period)",
      description: `${filteredTransactions.length} ledger entries in selected period`,
      onClick: () =>
        downloadCsv(
          "pixocraft-transactions.csv",
          filteredTransactions.map((t) => ({
            id: t.id,
            type: t.type,
            amount: t.amount,
            source: t.source,
            account: t.accountName,
            method: t.method,
            date: t.date,
            notes: t.notes ?? "",
          })),
        ),
    },
    {
      title: "All customers",
      description: `${customers?.length ?? 0} customer records`,
      onClick: () =>
        downloadCsv(
          "pixocraft-customers.csv",
          (customers ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            business: c.businessName ?? "",
            email: c.email ?? "",
            phone: c.phone ?? "",
            address: c.address ?? "",
            createdAt: c.createdAt,
          })),
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Snapshots of your business and exportable records.
      </p>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {summary && (
          <>
            <SummaryStat label="Lifetime revenue" value={summary.totalRevenue} />
            <SummaryStat label="Lifetime expenses" value={summary.totalExpenses} />
            <SummaryStat label="Lifetime profit" value={summary.netProfit} positive />
            <SummaryStat
              label="This month profit"
              value={summary.thisMonthProfit}
              positive
            />
          </>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">Period breakdown</h3>
          <p className="text-sm text-muted-foreground">
            Filter by date to see revenue, profit, and expenses for any time range.
          </p>
        </div>
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
        <div className="grid gap-3 sm:gap-4 grid-cols-3">
          <SummaryStat label="Period revenue" value={periodStats.revenue} />
          <SummaryStat label="Period expenses" value={periodStats.expenses} />
          <SummaryStat label="Period profit" value={periodStats.profit} positive />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            12-month performance
          </CardTitle>
          <CardDescription>
            Revenue, expenses, and profit by month
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[340px]">
          {trend && trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={trend.map((d) => ({ ...d, label: monthLabel(d.month) }))}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => compactRupee(Number(v))}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(Number(value)),
                    name.charAt(0).toUpperCase() + name.slice(1),
                  ]}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
                <Bar
                  dataKey="revenue"
                  fill="hsl(var(--chart-1))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  fill="hsl(var(--chart-4))"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">
              No trend data yet.
            </div>
          )}
        </CardContent>
        {trend && trend.length > 0 && (
          <CardContent className="pt-0 grid grid-cols-3 gap-3 sm:gap-4 text-sm border-t">
            <div className="pt-4 min-w-0">
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide truncate">
                Year revenue
              </div>
              <div className="font-semibold tabular-nums truncate">
                {formatCurrency(yearTotals.revenue)}
              </div>
            </div>
            <div className="pt-4 min-w-0">
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide truncate">
                Year expenses
              </div>
              <div className="font-semibold tabular-nums truncate">
                {formatCurrency(yearTotals.expenses)}
              </div>
            </div>
            <div className="pt-4 min-w-0">
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide truncate">
                Year profit
              </div>
              <div className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 truncate">
                {formatCurrency(yearTotals.profit)}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">Export records</h3>
          <p className="text-sm text-muted-foreground">
            Downloads reflect the selected date range above. Open in Excel, Google Sheets, or share with your CA.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {exports.map((ex) => (
            <Card key={ex.title}>
              <CardContent className="pt-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{ex.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {ex.description}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={ex.onClick} className="shrink-0">
                  <Download className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">CSV</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  positive,
}: {
  label: string;
  value: number;
  positive?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </div>
        <div
          className={`text-xl font-semibold tabular-nums mt-1 ${
            positive ? "text-emerald-600 dark:text-emerald-400" : ""
          }`}
        >
          {formatCurrency(value)}
        </div>
      </CardContent>
    </Card>
  );
}
