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
  Activity,
  ChevronRight,
  Zap,
  Globe,
  Megaphone,
  ShoppingBag,
  CircleDollarSign,
  Layers,
  BarChart2,
} from "lucide-react";
import { motion, useSpring, useTransform, animate, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
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
  Label,
} from "recharts";

const BASE_PATH = import.meta.env.BASE_URL ?? "/";
async function apiFetch(path: string) {
  const base = BASE_PATH.endsWith("/") ? BASE_PATH.slice(0, -1) : BASE_PATH;
  const res = await fetch(`${base}/api${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const PIE_COLORS = ["#00E7FF", "#a855f7", "#10B981", "#F59E0B", "#EC4899", "#3B82F6"];

const TOOLTIP_STYLE = {
  background: "rgba(6,7,28,0.96)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 14,
  fontSize: 12,
  color: "#fff",
  boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
  backdropFilter: "blur(20px)",
  padding: "0",
};

const CURSOR_STYLE = { fill: "rgba(255,255,255,0.03)", rx: 6 };

const monthLabel = (m: string) => {
  const [, mm] = m.split("-");
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(mm) - 1] ?? m;
};

const fmt = (n: number) => {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
};

function ChartTooltip({ active, payload, label, currency = true }: {
  active?: boolean; payload?: any[]; label?: string; currency?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(6,7,28,0.97)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 14,
      boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)",
      backdropFilter: "blur(24px)",
      overflow: "hidden",
      minWidth: 170,
    }}>
      {label && (
        <div style={{
          padding: "8px 14px 6px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          fontSize: 10,
          fontWeight: 700,
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}>{label}</div>
      )}
      <div style={{ padding: "8px 14px 10px" }}>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: i > 0 ? 6 : 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: p.color ?? p.fill, display: "inline-block", flexShrink: 0, boxShadow: `0 0 6px ${p.color ?? p.fill}80` }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "capitalize", fontWeight: 500, flex: 1 }}>
              {p.name}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: p.color ?? p.fill, fontVariantNumeric: "tabular-nums", marginLeft: 8 }}>
              {currency ? formatCurrency(Number(p.value)) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const total = p?.payload?.total ?? 0;
  return (
    <div style={{
      background: "rgba(6,7,28,0.97)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 12,
      boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
      backdropFilter: "blur(24px)",
      padding: "10px 14px",
      minWidth: 150,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 3, background: p.payload?.fill ?? p.color, display: "inline-block", flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 500, textTransform: "capitalize" }}>{p.name}</span>
      </div>
      <div style={{ marginTop: 4, fontSize: 15, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
        {formatCurrency(Number(total))}
      </div>
    </div>
  );
}

function useCountUp(target: number, duration = 1.2) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);
  useEffect(() => {
    const from = prevTarget.current;
    prevTarget.current = target;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

function CountUp({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const count = useCountUp(value);
  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
}

function CurrencyCount({ value }: { value: number }) {
  const count = useCountUp(value);
  return <span>{formatCurrency(count)}</span>;
}

const activityIcon: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  customer: { icon: Users, color: "#00E7FF", bg: "rgba(0,231,255,0.1)" },
  service:  { icon: Briefcase, color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
  income:   { icon: TrendingUp, color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  expense:  { icon: Receipt, color: "#f87171", bg: "rgba(248,113,113,0.1)" },
  transaction: { icon: ArrowUpRight, color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
};

const serviceIcon: Record<string, React.ElementType> = {
  web: Globe,
  digital: Megaphone,
  other: ShoppingBag,
};

function useGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function StatCard({
  title,
  value,
  rawValue,
  icon: Icon,
  color,
  bg,
  glow,
  index,
  sub,
}: {
  title: string;
  value: React.ReactNode;
  rawValue: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  glow: string;
  index: number;
  sub?: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative overflow-hidden rounded-2xl border bg-card cursor-default"
      style={{
        borderColor: hovered ? `${color}30` : "rgba(255,255,255,0.06)",
        transition: "border-color 0.3s ease",
        boxShadow: hovered ? `0 0 40px ${glow}` : "none",
      }}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ background: `radial-gradient(ellipse at 0% 0%, ${bg} 0%, transparent 70%)` }}
      />
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-4">
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.15em] leading-none">
            {title}
          </p>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: bg }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
        </div>
        <div className="text-2xl font-bold tabular-nums tracking-tight leading-none mb-1.5" style={{ color: hovered ? color : undefined, transition: "color 0.3s" }}>
          {value}
        </div>
        {sub && <div className="text-[11px] text-muted-foreground/50">{sub}</div>}
      </div>
    </motion.div>
  );
}

type ServiceTypeRow = {
  serviceType: string;
  label: string;
  revenue: number;
  cost: number;
  profit: number;
  count: number;
};

export default function Dashboard() {
  const greeting = useGreeting();
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });
  const { data: trend } = useGetRevenueTrend({ query: { queryKey: getGetRevenueTrendQueryKey() } });
  const { data: topServices } = useGetTopServices({ query: { queryKey: getGetTopServicesQueryKey() } });
  const { data: topCustomers } = useGetTopCustomers({ query: { queryKey: getGetTopCustomersQueryKey() } });
  const { data: activity } = useGetRecentActivity({ query: { queryKey: getGetRecentActivityQueryKey() } });
  const { data: breakdown } = useGetExpenseBreakdown({ query: { queryKey: getGetExpenseBreakdownQueryKey() } });
  const { data: serviceTypeBreakdown } = useQuery<ServiceTypeRow[]>({
    queryKey: ["dashboard", "service-type-breakdown"],
    queryFn: () => apiFetch("/dashboard/service-type-breakdown"),
  });

  const [activityAllOpen, setActivityAllOpen] = useState(false);

  const growth = summary?.revenueGrowthPercent ?? 0;
  const growthUp = growth >= 0;

  const stats = summary
    ? [
        {
          title: "Total Revenue",
          value: <CurrencyCount value={Number(summary.totalRevenue)} />,
          rawValue: Number(summary.totalRevenue),
          icon: CircleDollarSign,
          color: "#00E7FF",
          bg: "rgba(0,231,255,0.08)",
          glow: "rgba(0,231,255,0.12)",
        },
        {
          title: "Net Profit",
          value: <CurrencyCount value={Number(summary.netProfit)} />,
          rawValue: Number(summary.netProfit),
          icon: TrendingUp,
          color: "#10B981",
          bg: "rgba(16,185,129,0.08)",
          glow: "rgba(16,185,129,0.12)",
        },
        {
          title: "Total Expenses",
          value: <CurrencyCount value={Number(summary.totalExpenses)} />,
          rawValue: Number(summary.totalExpenses),
          icon: Receipt,
          color: "#f87171",
          bg: "rgba(248,113,113,0.08)",
          glow: "rgba(248,113,113,0.12)",
        },
        {
          title: "Pending",
          value: <CurrencyCount value={Number(summary.pendingPayments)} />,
          rawValue: Number(summary.pendingPayments),
          icon: Wallet,
          color: "#F59E0B",
          bg: "rgba(245,158,11,0.08)",
          glow: "rgba(245,158,11,0.12)",
        },
        {
          title: "Clients",
          value: <CountUp value={Number(summary.totalCustomers)} />,
          rawValue: Number(summary.totalCustomers),
          icon: Users,
          color: "#a855f7",
          bg: "rgba(168,85,247,0.08)",
          glow: "rgba(168,85,247,0.12)",
        },
        {
          title: "Services",
          value: <CountUp value={Number(summary.servicesCount)} />,
          rawValue: Number(summary.servicesCount),
          icon: Layers,
          color: "#38bdf8",
          bg: "rgba(56,189,248,0.08)",
          glow: "rgba(56,189,248,0.12)",
        },
      ]
    : [];

  const trendData = (trend ?? []).map((d) => ({ ...d, label: monthLabel(d.month) }));
  const maxCustomerRevenue = Math.max(...(topCustomers?.map((c) => Number(c.totalRevenue)) ?? [1]));

  return (
    <div className="space-y-7 pb-10">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-[0.18em]">Live · Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {greeting},{" "}
            <span className="text-gradient">Pixocraft</span>
          </h1>
          <p className="text-sm text-muted-foreground/50 mt-1 font-medium">
            Here's what's happening with your studio today.
          </p>
        </div>

        {summary && (
          <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-card px-4 py-3 self-start sm:self-auto"
            style={{ boxShadow: growthUp ? "0 0 32px rgba(16,185,129,0.08)" : "0 0 32px rgba(248,113,113,0.08)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: growthUp ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.12)" }}
            >
              {growthUp
                ? <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                : <ArrowDownRight className="w-5 h-5 text-rose-400" />}
            </div>
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">This month</div>
              <div className="text-base font-bold tabular-nums tracking-tight">
                <CurrencyCount value={Number(summary.thisMonthRevenue)} />
                <span className={`ml-2 text-xs font-bold ${growthUp ? "text-emerald-400" : "text-rose-400"}`}>
                  {growthUp ? "+" : ""}{growth.toFixed(1)}%
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {loadingSummary
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.06] bg-card p-5">
                <Skeleton className="h-2.5 w-16 mb-4 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))
          : stats.map((s, i) => (
              <StatCard key={s.title} {...s} index={i} />
            ))}
      </div>

      {/* ── Revenue Chart + Activity ── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-3 rounded-2xl border border-white/[0.07] bg-card overflow-hidden"
        >
          <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-white/[0.05]">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold tracking-tight">Revenue vs Expenses</span>
              </div>
              <p className="text-[11px] text-muted-foreground/45 font-medium">Last 12 months performance</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-medium">
              <span className="flex items-center gap-1.5 text-muted-foreground/50">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#00E7FF" }} />
                Revenue
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground/50">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#a855f7" }} />
                Expenses
              </span>
            </div>
          </div>
          <div className="px-2 pt-4 pb-2" style={{ height: 280 }}>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00E7FF" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#00E7FF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                    <filter id="glow-cyan">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" stroke="transparent" fontSize={11} tick={{ fill: "rgba(255,255,255,0.3)", fontWeight: 500 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="transparent" fontSize={11} tickFormatter={(v) => fmt(Number(v))} tick={{ fill: "rgba(255,255,255,0.3)", fontWeight: 500 }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip content={<ChartTooltip />} cursor={CURSOR_STYLE} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#00E7FF" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: "#00E7FF", stroke: "rgba(0,231,255,0.35)", strokeWidth: 8 }} />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#a855f7" strokeWidth={2} fill="url(#expGrad)" dot={false} activeDot={{ r: 4, fill: "#a855f7", stroke: "rgba(168,85,247,0.35)", strokeWidth: 7 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted-foreground/40">No data yet</div>
            )}
          </div>
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-2 rounded-2xl border border-white/[0.07] bg-card overflow-hidden flex flex-col"
        >
          <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-white/[0.05] shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Activity className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-semibold tracking-tight">Recent Activity</span>
              </div>
              <p className="text-[11px] text-muted-foreground/45 font-medium">Latest across your studio</p>
            </div>
            {activity && activity.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivityAllOpen(true)}
                className="text-[11px] h-7 gap-1 text-muted-foreground/50 hover:text-foreground font-medium"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          <div className="px-3 py-3 space-y-1">
            {!activity && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-3">
                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                <div className="flex-1"><Skeleton className="h-3 w-3/4 mb-2 rounded-full" /><Skeleton className="h-2 w-1/2 rounded-full" /></div>
              </div>
            ))}
            {activity?.length === 0 && (
              <div className="text-sm text-muted-foreground/40 text-center py-10">No activity yet.</div>
            )}
            {activity?.slice(0, 5).map((item, i) => {
              const meta = activityIcon[item.kind] ?? activityIcon.service;
              const IconComp = meta.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 + 0.5, duration: 0.3 }}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/[0.03] transition-colors group cursor-default"
                >
                  <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center" style={{ background: meta.bg }}>
                    <IconComp className="w-3.5 h-3.5" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium leading-tight truncate">{item.title}</div>
                    {item.subtitle && (
                      <div className="text-[11px] text-muted-foreground/45 leading-tight truncate mt-0.5">{item.subtitle}</div>
                    )}
                    <div className="text-[10px] text-muted-foreground/30 uppercase tracking-wide font-medium mt-1">{formatDate(item.date)}</div>
                  </div>
                  {item.amount != null && (
                    <div className="text-[12.5px] font-bold tabular-nums shrink-0" style={{ color: meta.color }}>
                      {formatCurrency(Number(item.amount))}
                    </div>
                  )}
                </motion.div>
              );
            })}
            {activity && activity.length > 5 && (
              <button
                onClick={() => setActivityAllOpen(true)}
                className="w-full mt-1 py-2 rounded-xl text-[11px] font-semibold text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-white/[0.03] transition-all tracking-wide uppercase"
              >
                +{activity.length - 5} more entries
              </button>
            )}
          </div>
        </motion.div>

        {/* Activity All Dialog */}
        <Dialog open={activityAllOpen} onOpenChange={setActivityAllOpen}>
          <DialogContent className="max-w-lg rounded-2xl border border-white/[0.08] bg-[rgba(10,11,30,0.98)] backdrop-blur-2xl shadow-[0_32px_80px_rgba(0,0,0,0.8)] p-0 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/[0.05]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <DialogTitle className="text-sm font-semibold tracking-tight">All Activity</DialogTitle>
              </div>
              <p className="text-[11px] text-muted-foreground/45 font-medium mt-0.5">Complete history across your studio</p>
            </DialogHeader>
            <div className="px-3 py-3 space-y-0.5 max-h-[60vh] overflow-y-auto">
              {activity?.map((item, i) => {
                const meta = activityIcon[item.kind] ?? activityIcon.service;
                const IconComp = meta.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.025, duration: 0.25 }}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.04] transition-colors group cursor-default"
                  >
                    <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center" style={{ background: meta.bg }}>
                      <IconComp className="w-3 h-3" style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium leading-tight truncate">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-[11px] text-muted-foreground/45 leading-tight truncate mt-0.5">{item.subtitle}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground/30 uppercase tracking-wide font-medium mt-0.5">{formatDate(item.date)}</div>
                    </div>
                    {item.amount != null && (
                      <div className="text-[12.5px] font-bold tabular-nums shrink-0" style={{ color: meta.color }}>
                        {formatCurrency(Number(item.amount))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Expense Breakdown + Top Services ── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Donut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-2 rounded-2xl border border-white/[0.07] bg-card overflow-hidden"
        >
          <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
            <div className="flex items-center gap-2 mb-0.5">
              <Receipt className="w-4 h-4 text-rose-400" />
              <span className="text-sm font-semibold tracking-tight">Expense Breakdown</span>
            </div>
            <p className="text-[11px] text-muted-foreground/45 font-medium">By category, all time</p>
          </div>
          <div className="px-4 pt-4 pb-2" style={{ height: 270 }}>
            {breakdown && breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {PIE_COLORS.map((c, i) => (
                      <radialGradient key={i} id={`pGrad${i}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={c} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={c} stopOpacity={0.6} />
                      </radialGradient>
                    ))}
                  </defs>
                  <Pie
                    data={breakdown}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={96}
                    paddingAngle={3}
                    strokeWidth={0}
                    isAnimationActive
                    animationBegin={200}
                    animationDuration={900}
                    animationEasing="ease-out"
                  >
                    {breakdown.map((_, i) => (
                      <Cell key={i} fill={`url(#pGrad${i % PIE_COLORS.length})`} />
                    ))}
                    <Label
                      content={({ viewBox }: any) => {
                        const { cx, cy } = viewBox ?? {};
                        const total = breakdown.reduce((s, d) => s + Number(d.total), 0);
                        return (
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={cx} dy={-8} fontSize={17} fontWeight={700} fill="#fff">
                              {total >= 10000000 ? `₹${(total/10000000).toFixed(1)}Cr` : total >= 100000 ? `₹${(total/100000).toFixed(1)}L` : `₹${(total/1000).toFixed(0)}K`}
                            </tspan>
                            <tspan x={cx} dy={20} fontSize={9} fill="rgba(255,255,255,0.3)" fontWeight={600} letterSpacing="2">SPENT</tspan>
                          </text>
                        );
                      }}
                    />
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted-foreground/40">No expense data</div>
            )}
          </div>
          {breakdown && breakdown.length > 0 && (
            <div className="px-5 pb-5 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {breakdown.slice(0, 6).map((d, i) => (
                <div key={d.category} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-[11px] text-muted-foreground/55 capitalize truncate font-medium">{d.category}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Top Services Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.54, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-3 rounded-2xl border border-white/[0.07] bg-card overflow-hidden"
        >
          <div className="px-6 pt-5 pb-4 border-b border-white/[0.05]">
            <div className="flex items-center gap-2 mb-0.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold tracking-tight">Top Services</span>
            </div>
            <p className="text-[11px] text-muted-foreground/45 font-medium">By revenue contribution</p>
          </div>
          <div className="px-2 pt-4 pb-2" style={{ height: 270 }}>
            {topServices && topServices.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topServices.slice(0, 5)} layout="vertical" margin={{ top: 2, right: 16, left: 8, bottom: 2 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#00E7FF" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0.95} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" fontSize={11} tickFormatter={(v) => fmt(Number(v))} tick={{ fill: "rgba(255,255,255,0.3)", fontWeight: 500 }} tickLine={false} axisLine={false} stroke="transparent" />
                  <YAxis type="category" dataKey="serviceName" fontSize={10.5} width={120} tick={{ fill: "rgba(255,255,255,0.45)", fontWeight: 500 }} tickLine={false} axisLine={false} stroke="transparent" />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)", rx: 6 }} />
                  <Bar dataKey="totalRevenue" name="Revenue" fill="url(#barGrad)" radius={[0, 6, 6, 0]} maxBarSize={24} isAnimationActive animationBegin={300} animationDuration={800} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted-foreground/40">No services yet</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Service Type Profitability ── */}
      {serviceTypeBreakdown && serviceTypeBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-white/[0.07] bg-card overflow-hidden"
        >
          <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-white/[0.05]">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Briefcase className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold tracking-tight">Service Profitability</span>
              </div>
              <p className="text-[11px] text-muted-foreground/45 font-medium">Revenue, cost and margin by service type</p>
            </div>
            <div className="flex items-center gap-5 text-[11px] font-medium">
              {[["Revenue","#00E7FF"],["Cost","#a855f7"],["Profit","#10B981"]].map(([l,c]) => (
                <span key={l} className="flex items-center gap-1.5 text-muted-foreground/50">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />{l}
                </span>
              ))}
            </div>
          </div>
          <div className="px-2 pt-4 pb-3" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceTypeBreakdown} margin={{ top: 4, right: 16, left: -8, bottom: 0 }} barCategoryGap="30%">
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E7FF" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="label" fontSize={11} tick={{ fill: "rgba(255,255,255,0.35)", fontWeight: 500 }} tickLine={false} axisLine={false} stroke="transparent" />
                <YAxis fontSize={11} tickFormatter={(v) => fmt(Number(v))} tick={{ fill: "rgba(255,255,255,0.35)", fontWeight: 500 }} tickLine={false} axisLine={false} stroke="transparent" width={52} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)", rx: 4 }} />
                <Bar dataKey="revenue" name="Revenue" fill="url(#revGrad2)" radius={[5,5,0,0]} maxBarSize={28} isAnimationActive animationDuration={800} />
                <Bar dataKey="cost" name="Cost" fill="url(#costGrad)" radius={[5,5,0,0]} maxBarSize={28} isAnimationActive animationDuration={900} />
                <Bar dataKey="profit" name="Profit" fill="url(#profitGrad)" radius={[5,5,0,0]} maxBarSize={28} isAnimationActive animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* ── Top Customers ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.66, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border border-white/[0.07] bg-card overflow-hidden"
      >
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-white/[0.05]">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Users className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-semibold tracking-tight">Top Clients</span>
            </div>
            <p className="text-[11px] text-muted-foreground/45 font-medium">Ranked by lifetime revenue</p>
          </div>
          <Link href="/customers">
            <Button variant="ghost" size="sm" className="text-[11px] h-7 gap-1 text-muted-foreground/50 hover:text-foreground font-medium">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
        <div className="px-6 py-4">
          {!topCustomers && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1"><Skeleton className="h-3 w-40 mb-2 rounded-full" /><Skeleton className="h-2 w-full rounded-full" /></div>
                  <Skeleton className="h-4 w-20 rounded-full" />
                </div>
              ))}
            </div>
          )}
          {topCustomers?.length === 0 && (
            <div className="text-sm text-muted-foreground/40 text-center py-8">No clients yet.</div>
          )}
          <div className="space-y-1">
            {topCustomers?.map((c, i) => {
              const pct = Math.round((Number(c.totalRevenue) / maxCustomerRevenue) * 100);
              const rankColors = ["#00E7FF", "#a855f7", "#10B981", "#F59E0B", "#EC4899"];
              const rankColor = rankColors[i] ?? "#fff";
              return (
                <Link
                  key={c.customerId}
                  href={`/customers/${c.customerId}`}
                  className="flex items-center gap-4 rounded-xl px-3 py-3 hover:bg-white/[0.03] transition-colors group -mx-1"
                >
                  <div
                    className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold"
                    style={{ background: `${rankColor}18`, color: rankColor }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-semibold truncate group-hover:text-foreground transition-colors">{c.customerName}</span>
                      <span className="text-[12.5px] font-bold tabular-nums ml-3 shrink-0" style={{ color: rankColor }}>
                        {formatCurrency(Number(c.totalRevenue))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: rankColor, opacity: 0.7 }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: i * 0.1 + 0.8, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground/35 font-medium shrink-0">
                        {c.servicesCount} svc{Number(c.servicesCount) !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
