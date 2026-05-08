import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useGetRevenueTrend,
  getGetRevenueTrendQueryKey,
  useGetTopServices,
  getGetTopServicesQueryKey,
  useGetTopCustomers,
  getGetTopCustomersQueryKey,
  useGetRecentActivity,
  getGetRecentActivityQueryKey,
  useGetExpenseBreakdown,
  getGetExpenseBreakdownQueryKey,
} from "@workspace/api-client-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Users,
  CreditCard,
  Receipt,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Award,
  Activity,
  PieChart as PieIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const BASE_PATH = import.meta.env.BASE_URL ?? "/";
async function apiFetch(path: string) {
  const base = BASE_PATH.endsWith("/") ? BASE_PATH.slice(0, -1) : BASE_PATH;
  const res = await fetch(`${base}/api${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(220 10% 50%)",
  "hsl(170 70% 45%)",
];

const monthLabel = (m: string) => {
  // m = YYYY-MM
  const [, mm] = m.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const idx = Number(mm) - 1;
  return months[idx] ?? m;
};

const compactRupee = (n: number) => {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${n}`;
};

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });
  const { data: trend } = useGetRevenueTrend({
    query: { queryKey: getGetRevenueTrendQueryKey() },
  });
  const { data: topServices } = useGetTopServices({
    query: { queryKey: getGetTopServicesQueryKey() },
  });
  const { data: topCustomers } = useGetTopCustomers({
    query: { queryKey: getGetTopCustomersQueryKey() },
  });
  const { data: activity } = useGetRecentActivity({
    query: { queryKey: getGetRecentActivityQueryKey() },
  });
  const { data: breakdown } = useGetExpenseBreakdown({
    query: { queryKey: getGetExpenseBreakdownQueryKey() },
  });

  type ServiceTypeRow = {
    serviceType: string;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    count: number;
  };
  const { data: serviceTypeBreakdown } = useQuery<ServiceTypeRow[]>({
    queryKey: ["dashboard", "service-type-breakdown"],
    queryFn: () => apiFetch("/dashboard/service-type-breakdown"),
  });

  const stats = summary
    ? [
        {
          title: "Total Revenue",
          value: formatCurrency(summary.totalRevenue),
          icon: CreditCard,
          accent: "text-blue-500 bg-blue-500/10",
        },
        {
          title: "Net Profit",
          value: formatCurrency(summary.netProfit),
          icon: TrendingUp,
          accent: "text-emerald-500 bg-emerald-500/10",
        },
        {
          title: "Total Expenses",
          value: formatCurrency(summary.totalExpenses),
          icon: Receipt,
          accent: "text-rose-500 bg-rose-500/10",
        },
        {
          title: "Pending Payments",
          value: formatCurrency(summary.pendingPayments),
          icon: Wallet,
          accent: "text-amber-500 bg-amber-500/10",
        },
        {
          title: "Total Customers",
          value: String(summary.totalCustomers),
          icon: Users,
          accent: "text-violet-500 bg-violet-500/10",
        },
        {
          title: "Services Sold",
          value: String(summary.servicesCount),
          icon: Briefcase,
          accent: "text-cyan-500 bg-cyan-500/10",
        },
      ]
    : [];

  const growth = summary?.revenueGrowthPercent ?? 0;
  const growthUp = growth >= 0;

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Good to see you back.
          </h2>
          <p className="text-muted-foreground text-sm">
            Here's how your studio is performing.
          </p>
        </div>
        {summary && (
          <div className="rounded-lg border bg-card px-4 py-3 flex items-center gap-3 self-start sm:self-auto">
            <div
              className={`w-9 h-9 rounded-md flex items-center justify-center ${
                growthUp
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-rose-500/10 text-rose-500"
              }`}
            >
              {growthUp ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">This month</div>
              <div className="text-sm font-semibold">
                {formatCurrency(summary.thisMonthRevenue)}{" "}
                <span
                  className={`ml-1 text-xs ${
                    growthUp ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {growthUp ? "+" : ""}
                  {growth.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {loadingSummary
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-7 w-28" />
                </CardContent>
              </Card>
            ))
          : stats.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <Card className="hover-elevate transition-shadow h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0 gap-2">
                    <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                      {stat.title}
                    </CardTitle>
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${stat.accent}`}
                    >
                      <stat.icon className="h-3.5 w-3.5" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-base sm:text-xl font-semibold tabular-nums truncate">
                      {stat.value}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Revenue vs Expenses
            </CardTitle>
            <CardDescription>Last 12 months</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {trend && trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trend.map((d) => ({ ...d, label: monthLabel(d.month) }))}
                  margin={{ top: 5, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="revenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--chart-1))"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--chart-1))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="expenseGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--chart-4))"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--chart-4))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
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
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={2}
                    fill="url(#expenseGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">
                No data yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4" /> Recent activity
            </CardTitle>
            <CardDescription>Across customers, services, money</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {!activity && (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </>
            )}
            {activity?.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-10">
                No recent activity.
              </div>
            )}
            {activity?.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/50"
              >
                <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-medium uppercase shrink-0">
                  {item.kind.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-snug truncate">
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div className="text-xs text-muted-foreground leading-snug truncate">
                      {item.subtitle}
                    </div>
                  )}
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80 mt-0.5">
                    {formatDate(item.date)}
                  </div>
                </div>
                {item.amount !== undefined && item.amount !== null && (
                  <div className="text-sm font-semibold tabular-nums shrink-0">
                    {formatCurrency(Number(item.amount))}
                  </div>
                )}
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieIcon className="w-4 h-4" /> Expense breakdown
            </CardTitle>
            <CardDescription>By category</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {breakdown && breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {breakdown.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) => [
                      formatCurrency(Number(value)),
                      name,
                    ]}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">
                No expense data yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Award className="w-4 h-4" /> Top services this period
            </CardTitle>
            <CardDescription>By revenue contribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {topServices && topServices.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topServices.slice(0, 6)}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    type="number"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickFormatter={(v: number) => compactRupee(Number(v))}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="serviceName"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    width={110}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => formatCurrency(Number(value))}
                  />
                  <Bar
                    dataKey="totalRevenue"
                    fill="hsl(var(--chart-1))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">
                No services yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {serviceTypeBreakdown && serviceTypeBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Service type profitability
            </CardTitle>
            <CardDescription>Revenue, cost, and profit by service type</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={serviceTypeBreakdown}
                margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="serviceType"
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
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="totalRevenue" name="revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalCost" name="cost" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalProfit" name="profit" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Top customers
            </CardTitle>
            <CardDescription>Lifetime revenue leaders</CardDescription>
          </div>
          <Link href="/customers">
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {!topCustomers && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}
          {topCustomers?.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              No customers yet.
            </div>
          )}
          <div className="divide-y">
            {topCustomers?.map((c, i) => (
              <Link key={c.customerId} href={`/customers/${c.customerId}`} className="flex items-center justify-between py-3 hover:bg-muted/40 -mx-2 px-2 rounded-md transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{c.customerName}</div>
                    <div className="text-xs text-muted-foreground">
                      Profit {formatCurrency(Number(c.totalProfit))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">
                    {formatCurrency(Number(c.totalRevenue))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.servicesCount} service
                    {c.servicesCount === 1 ? "" : "s"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
