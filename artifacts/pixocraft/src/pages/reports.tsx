import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, BarChart2, TrendingUp, Receipt, Wallet } from "lucide-react";
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
} from "recharts";
import {
  DateRangeFilter,
  getDefaultDateFilter,
  isInDateRange,
  type DateFilter,
} from "@/components/date-range-filter";
import { motion } from "framer-motion";

const monthLabel = (m: string) => {
  const [, mm] = m.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[Number(mm) - 1] ?? m;
};

const compactRupee = (n: number) => {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
};

const escapeCsv = (val: unknown): string => {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const downloadCsv = (filename: string, rows: Record<string, unknown>[]) => {
  if (!rows.length) { toast.error("Nothing to export yet"); return; }
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click();
  document.body.removeChild(link); URL.revokeObjectURL(url);
  toast.success(`Exported ${filename}`);
};

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const series = [
    { key: "revenue", color: "#00E7FF", label: "Revenue" },
    { key: "expenses", color: "#a855f7", label: "Expenses" },
    { key: "profit", color: "#10B981", label: "Profit" },
  ];
  return (
    <div style={{
      background: "rgba(6,7,28,0.97)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 14,
      boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
      backdropFilter: "blur(24px)",
      overflow: "hidden",
      minWidth: 185,
    }}>
      {label && (
        <div style={{ padding: "8px 14px 6px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          {label}
        </div>
      )}
      <div style={{ padding: "8px 14px 10px" }}>
        {payload.map((p: any, i: number) => {
          const meta = series.find(s => s.key === p.dataKey) ?? { color: p.color ?? p.fill, label: p.name };
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: i > 0 ? 6 : 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: meta.color, display: "inline-block", flexShrink: 0, boxShadow: `0 0 6px ${meta.color}80` }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 500, flex: 1 }}>{meta.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: meta.color, fontVariantNumeric: "tabular-nums", marginLeft: 8 }}>
                {formatCurrency(Number(p.value))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Reports() {
  const [dateFilter, setDateFilter] = useState<DateFilter>(getDefaultDateFilter());

  const { data: summary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: trend } = useGetRevenueTrend({ query: { queryKey: getGetRevenueTrendQueryKey() } });
  const { data: customers } = useListCustomers(undefined, { query: { queryKey: getListCustomersQueryKey() } });
  const { data: services } = useListServices(undefined, { query: { queryKey: getListServicesQueryKey() } });
  const { data: expenses } = useListExpenses(undefined, { query: { queryKey: getListExpensesQueryKey() } });
  const { data: transactions } = useListTransactions(undefined, { query: { queryKey: getListTransactionsQueryKey() } });

  const filteredServices = useMemo(() => (services ?? []).filter((s) => isInDateRange(s.date, dateFilter)), [services, dateFilter]);
  const filteredExpenses = useMemo(() => (expenses ?? []).filter((e) => isInDateRange(e.date, dateFilter)), [expenses, dateFilter]);
  const filteredTransactions = useMemo(() => (transactions ?? []).filter((t) => isInDateRange(t.date, dateFilter)), [transactions, dateFilter]);

  const periodStats = useMemo(() => {
    const revenue = filteredServices.reduce((a, s) => a + Number(s.priceSold), 0);
    const profit = filteredServices.reduce((a, s) => a + Number(s.profit ?? 0), 0);
    const expTotal = filteredExpenses.reduce((a, e) => a + Number(e.amount), 0);
    return { revenue, profit, expenses: expTotal };
  }, [filteredServices, filteredExpenses]);

  const yearTotals = (trend ?? []).reduce(
    (acc, t) => { acc.revenue += t.revenue; acc.expenses += t.expenses; acc.profit += t.profit; return acc; },
    { revenue: 0, expenses: 0, profit: 0 },
  );

  const exports = [
    {
      title: "Services (period)",
      description: `${filteredServices.length} service entries in selected period`,
      onClick: () => downloadCsv("pixocraft-services.csv", filteredServices.map((s) => ({
        id: s.id, customer: s.customerName, service: s.serviceName, priceSold: s.priceSold,
        costPrice: s.costPrice, profit: s.profit, paymentStatus: s.paymentStatus,
        amountPaid: s.amountPaid, deliveryStatus: s.deliveryStatus, date: s.date, notes: s.notes ?? "",
      }))),
    },
    {
      title: "Expenses (period)",
      description: `${filteredExpenses.length} expense entries in selected period`,
      onClick: () => downloadCsv("pixocraft-expenses.csv", filteredExpenses.map((e) => ({
        id: e.id, category: e.category, amount: e.amount, date: e.date, notes: e.notes ?? "",
      }))),
    },
    {
      title: "Transactions (period)",
      description: `${filteredTransactions.length} ledger entries in selected period`,
      onClick: () => downloadCsv("pixocraft-transactions.csv", filteredTransactions.map((t) => ({
        id: t.id, type: t.type, amount: t.amount, source: t.source,
        account: t.accountName, method: t.method, date: t.date, notes: t.notes ?? "",
      }))),
    },
    {
      title: "All customers",
      description: `${customers?.length ?? 0} customer records`,
      onClick: () => downloadCsv("pixocraft-customers.csv", (customers ?? []).map((c) => ({
        id: c.id, name: c.name, business: c.businessName ?? "", email: c.email ?? "",
        phone: c.phone ?? "", address: c.address ?? "", createdAt: c.createdAt,
      }))),
    },
  ];

  const trendChartData = (trend ?? []).map((d) => ({ ...d, label: monthLabel(d.month) }));

  const LEGEND_ITEMS = [
    { key: "revenue", color: "#00E7FF", label: "Revenue" },
    { key: "expenses", color: "#a855f7", label: "Expenses" },
    { key: "profit", color: "#10B981", label: "Profit" },
  ];

  return (
    <div className="space-y-7 pb-10">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse" />
          <span className="text-[10px] font-semibold text-violet-400/80 uppercase tracking-[0.18em]">Analytics</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Reports & <span className="text-gradient">Insights</span>
        </h1>
        <p className="text-sm text-muted-foreground/50 mt-1 font-medium">Business snapshots, trend analysis, and data exports.</p>
      </motion.div>

      {/* Lifetime Stats */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4"
        >
          {[
            { label: "Lifetime Revenue", value: summary.totalRevenue, icon: BarChart2, color: "#00E7FF", bg: "rgba(0,231,255,0.08)", glow: "rgba(0,231,255,0.1)" },
            { label: "Lifetime Expenses", value: summary.totalExpenses, icon: Receipt, color: "#a855f7", bg: "rgba(168,85,247,0.08)", glow: "rgba(168,85,247,0.1)" },
            { label: "Lifetime Profit", value: summary.netProfit, icon: TrendingUp, color: "#10B981", bg: "rgba(16,185,129,0.08)", glow: "rgba(16,185,129,0.1)" },
            { label: "This Month Profit", value: summary.thisMonthProfit, icon: Wallet, color: "#F59E0B", bg: "rgba(245,158,11,0.08)", glow: "rgba(245,158,11,0.1)" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.06 + 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="relative rounded-2xl border border-white/[0.06] bg-card overflow-hidden p-5"
                style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03)` }}
              >
                <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${s.color}50, transparent)` }} />
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                    <Icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                </div>
                <div className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.15em] mb-1.5">{s.label}</div>
                <div className="text-xl font-bold tabular-nums tracking-tight" style={{ color: s.color }}>
                  {formatCurrency(Number(s.value))}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Period Filter + Period Stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border border-white/[0.07] bg-card overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        <div className="px-6 pt-5 pb-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-2 mb-0.5">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold tracking-tight">Period Breakdown</span>
          </div>
          <p className="text-[11px] text-muted-foreground/45 font-medium">Filter by date to analyze any time range</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
          <div className="grid gap-3 grid-cols-3">
            {[
              { label: "Period Revenue", value: periodStats.revenue, color: "#00E7FF" },
              { label: "Period Expenses", value: periodStats.expenses, color: "#a855f7" },
              { label: "Period Profit", value: periodStats.profit, color: "#10B981" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                <div className="text-[10px] font-semibold text-muted-foreground/45 uppercase tracking-[0.15em] mb-1.5">{s.label}</div>
                <div className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{formatCurrency(s.value)}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 12-Month Performance Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border border-white/[0.07] bg-card overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-white/[0.05]">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold tracking-tight">12-Month Performance</span>
            </div>
            <p className="text-[11px] text-muted-foreground/45 font-medium">Revenue, expenses, and profit by month</p>
          </div>
          <div className="flex items-center gap-4">
            {LEGEND_ITEMS.map((l) => (
              <span key={l.key} className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/50">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
        <div className="px-2 pt-5 pb-3" style={{ height: 340 }}>
          {trendChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendChartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }} barCategoryGap="30%">
                <defs>
                  <linearGradient id="rptRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E7FF" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="rptExpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.7} />
                  </linearGradient>
                  <filter id="rptLineGlow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="transparent"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgba(255,255,255,0.35)", fontWeight: 500 }}
                />
                <YAxis
                  stroke="transparent"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => compactRupee(Number(v))}
                  tick={{ fill: "rgba(255,255,255,0.35)", fontWeight: 500 }}
                  width={60}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.025)", rx: 6 }} />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="url(#rptRevGrad)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive
                  animationDuration={800}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="url(#rptExpGrad)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive
                  animationDuration={900}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Profit"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "#10B981", stroke: "rgba(16,185,129,0.4)", strokeWidth: 5 }}
                  activeDot={{ r: 5, fill: "#10B981", stroke: "rgba(16,185,129,0.4)", strokeWidth: 8 }}
                  isAnimationActive
                  animationDuration={1000}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full grid place-items-center text-sm text-muted-foreground/40">No trend data yet.</div>
          )}
        </div>
        {trendChartData.length > 0 && (
          <div className="px-6 pb-5 pt-4 border-t border-white/[0.05] grid grid-cols-3 gap-4">
            {[
              { label: "Year Revenue", value: yearTotals.revenue, color: "#00E7FF" },
              { label: "Year Expenses", value: yearTotals.expenses, color: "#a855f7" },
              { label: "Year Profit", value: yearTotals.profit, color: "#10B981" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-[0.15em] mb-1">{s.label}</div>
                <div className="text-base font-bold tabular-nums" style={{ color: s.color }}>{formatCurrency(s.value)}</div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Export Records */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-3"
      >
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Export Records</h3>
          <p className="text-[11px] text-muted-foreground/45 font-medium mt-0.5">Downloads reflect the selected date range. Open in Excel, Google Sheets, or share with your CA.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {exports.map((ex, i) => (
            <motion.div
              key={ex.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 + 0.42, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-2xl border border-white/[0.06] bg-card overflow-hidden"
            >
              <div className="px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/15">
                    <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[13px] truncate">{ex.title}</div>
                    <div className="text-[11px] text-muted-foreground/45 truncate">{ex.description}</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={ex.onClick}
                  className="shrink-0 border-white/[0.08] hover:border-cyan-400/40 hover:text-cyan-400 rounded-xl text-xs font-semibold gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">CSV</span>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
