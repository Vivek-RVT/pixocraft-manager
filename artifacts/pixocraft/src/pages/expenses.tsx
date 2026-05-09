import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, MoreHorizontal, Pencil, Trash2, Download,
  Receipt, TrendingDown, BarChart3, Wallet, Megaphone,
  Users, Globe, Zap, Plane, Building2, Package, ShoppingBag,
  ArrowUpRight, CalendarDays, Filter,
} from "lucide-react";
import {
  useListExpenses,
  getListExpensesQueryKey,
  useDeleteExpense,
  useGetExpenseBreakdown,
  getGetExpenseBreakdownQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetRevenueTrendQueryKey,
  getGetRecentActivityQueryKey,
  type Expense,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ExpenseFormDialog } from "@/components/expense-form-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  DateRangeFilter, getDefaultDateFilter, isInDateRange, type DateFilter,
} from "@/components/date-range-filter";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";

// ─── Category config ──────────────────────────────────────────────────────────
const CAT_CFG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  ads:     { label: "Ads & Marketing", icon: Megaphone,    color: "#a855f7", bg: "rgba(168,85,247,0.12)",  border: "rgba(168,85,247,0.22)" },
  salary:  { label: "Salary & Payroll",icon: Users,        color: "#10B981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.22)" },
  hosting: { label: "Hosting & Domains",icon: Globe,       color: "#00E7FF", bg: "rgba(0,231,255,0.12)",   border: "rgba(0,231,255,0.22)"  },
  tools:   { label: "Tools & Software", icon: Zap,         color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.22)" },
  travel:  { label: "Travel",           icon: Plane,       color: "#38bdf8", bg: "rgba(56,189,248,0.12)",  border: "rgba(56,189,248,0.22)" },
  office:  { label: "Office",           icon: Building2,   color: "#fb923c", bg: "rgba(251,146,60,0.12)",  border: "rgba(251,146,60,0.22)" },
  misc:    { label: "Miscellaneous",    icon: Package,     color: "#94a3b8", bg: "rgba(148,163,184,0.1)",  border: "rgba(148,163,184,0.2)" },
};

function getCatCfg(cat: string) {
  return CAT_CFG[cat] ?? { label: cat, icon: ShoppingBag, color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)" };
}

const CATEGORIES = Object.entries(CAT_CFG).map(([value, { label }]) => ({ value, label }));

// ─── CSV export ────────────────────────────────────────────────────────────────
function exportCsv(expenses: Expense[]) {
  if (!expenses.length) { toast.error("Nothing to export"); return; }
  const rows = [
    ["ID", "Category", "Amount", "Date", "Notes"],
    ...expenses.map((e) => [
      e.id,
      getCatCfg(e.category).label,
      Number(e.amount).toFixed(2),
      e.date ?? "",
      (e.notes ?? "").replace(/"/g, '""'),
    ]),
  ];
  const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Expenses exported");
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, index }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl border border-white/[0.06] bg-card overflow-hidden p-5"
      style={{ boxShadow: `0 0 28px ${color}0c` }}
    >
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}55, transparent)` }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: `${color}80` }}>{label}</div>
          <div className="text-2xl font-bold tabular-nums tracking-tight" style={{ color }}>{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground/50 mt-1">{sub}</div>}
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}22` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.08] px-3 py-2.5 text-sm"
      style={{ background: "rgba(5,5,22,0.96)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", backdropFilter: "blur(16px)" }}>
      <p className="font-semibold text-white mb-0.5">{label}</p>
      <p className="tabular-nums" style={{ color: "#a855f7" }}>{formatCurrency(Number(payload[0].value))}</p>
    </div>
  );
}

// ─── Category badge ───────────────────────────────────────────────────────────
function CategoryBadge({ category }: { category: string }) {
  const cfg = getCatCfg(category);
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ─── Expense row ──────────────────────────────────────────────────────────────
function ExpenseRow({ expense, index, onEdit, onDelete }: {
  expense: Expense; index: number; onEdit: () => void; onDelete: () => void;
}) {
  const cfg = getCatCfg(expense.category);
  const Icon = cfg.icon;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ delay: index * 0.03, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="group relative flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04] last:border-b-0 transition-colors duration-150"
      style={{ background: hovered ? "rgba(255,255,255,0.018)" : "transparent" }}
    >
      {/* Left accent */}
      <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full transition-all duration-200"
        style={{ background: cfg.color, opacity: hovered ? 0.7 : 0 }} />

      {/* Icon badge */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
        style={{
          background: hovered ? `${cfg.color}18` : cfg.bg,
          border: `1px solid ${cfg.border}`,
          boxShadow: hovered ? `0 0 14px ${cfg.color}25` : "none",
        }}>
        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground/90">{cfg.label}</span>
        </div>
        {expense.notes && (
          <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{expense.notes}</p>
        )}
      </div>

      {/* Date */}
      <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground/50 shrink-0">
        <CalendarDays className="w-3 h-3" />
        {formatDate(expense.date ?? "")}
      </div>

      {/* Amount */}
      <div className="text-sm font-bold tabular-nums shrink-0" style={{ color: "#f43f5e" }}>
        {formatCurrency(Number(expense.amount))}
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon"
            className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-white/[0.06]">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Expenses() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>(getDefaultDateFilter());

  const { data: allExpenses, isLoading } = useListExpenses(undefined, {
    query: { queryKey: getListExpensesQueryKey() },
  });

  const expenses = useMemo(() => {
    if (!allExpenses) return [];
    return allExpenses.filter((e) => {
      if (filter !== "all" && e.category !== filter) return false;
      if (!isInDateRange(e.date, dateFilter)) return false;
      return true;
    });
  }, [allExpenses, filter, dateFilter]);

  const { data: breakdown } = useGetExpenseBreakdown({
    query: { queryKey: getGetExpenseBreakdownQueryKey() },
  });

  const deleteMutation = useDeleteExpense();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteId });
      toast.success("Expense deleted");
      queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetExpenseBreakdownQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetRevenueTrendQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
    } catch {
      toast.error("Could not delete expense");
    } finally {
      setDeleteId(null);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const avgExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;
  const biggestExpense = expenses.length > 0 ? Math.max(...expenses.map((e) => Number(e.amount))) : 0;
  const isEmpty = !isLoading && expenses.length === 0;

  const ROSE = "#f43f5e";
  const VIOLET = "#a855f7";
  const AMBER = "#F59E0B";

  // Chart bar colors matched to category
  const chartData = useMemo(
    () =>
      (breakdown ?? []).map((b) => ({
        ...b,
        category: getCatCfg(b.category).label,
        color: getCatCfg(b.category).color,
      })),
    [breakdown],
  );

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-start justify-between flex-wrap gap-4"
      >
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.25)" }}>
              <Receipt className="w-4 h-4" style={{ color: ROSE }} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              Expenses
            </h1>
          </div>
          <p className="text-sm text-muted-foreground/60 ml-0.5">
            Track and analyse where your studio is spending
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 rounded-xl h-9 text-sm text-muted-foreground hover:text-foreground border border-white/[0.06] hover:border-white/[0.1]"
            onClick={() => exportCsv(expenses)}
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 rounded-xl h-9 font-semibold text-sm transition-all duration-200"
            style={{ background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.3)", color: ROSE }}
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </Button>
        </div>
      </motion.div>

      {/* ── Stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard index={0} label="Total Spending" value={formatCurrency(totalExpenses)}
          sub={`across ${expenses.length} expense${expenses.length !== 1 ? "s" : ""}`}
          icon={TrendingDown} color={ROSE} />
        <StatCard index={1} label="Average Expense" value={formatCurrency(avgExpense)}
          sub="per entry" icon={BarChart3} color={VIOLET} />
        <StatCard index={2} label="Largest Expense" value={formatCurrency(biggestExpense)}
          sub="single entry" icon={Wallet} color={AMBER} />
      </div>

      {/* ── Spending by category chart ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl border border-white/[0.06] bg-card overflow-hidden"
        style={{ boxShadow: "0 0 30px rgba(168,85,247,0.06)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent)" }} />

        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.22)" }}>
              <BarChart3 className="w-3.5 h-3.5" style={{ color: VIOLET }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground/90">Spending by category</p>
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">All time breakdown</p>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 h-[240px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} barCategoryGap="35%">
                <defs>
                  {chartData.map((d, i) => (
                    <linearGradient key={i} id={`bar-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={d.color} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={d.color} stopOpacity={0.45} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                <XAxis dataKey="category" stroke="transparent" fontSize={10} tickLine={false} axisLine={false}
                  tick={{ fill: "rgba(255,255,255,0.35)", fontWeight: 500 }} />
                <YAxis stroke="transparent" fontSize={10} tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                  tick={{ fill: "rgba(255,255,255,0.3)" }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)", radius: 6 }} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={`url(#bar-grad-${i})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full grid place-items-center">
              <div className="text-center">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm text-muted-foreground/50">Add expenses to see category breakdown</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
      >
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.35 }}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Filter className="w-3.5 h-3.5 text-muted-foreground/50" />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px] h-9 rounded-xl border-white/[0.08] bg-white/[0.03] text-sm">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground/50 font-medium">
            {expenses.length} {expenses.length === 1 ? "entry" : "entries"}
          </span>
          <div className="h-3 w-px bg-white/10" />
          <span className="text-xs font-bold tabular-nums" style={{ color: ROSE }}>
            {formatCurrency(totalExpenses)} total
          </span>
        </div>
      </motion.div>

      {/* ── Expense list ─────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {isEmpty ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="relative rounded-2xl border border-dashed overflow-hidden py-16 text-center"
            style={{ borderColor: "rgba(244,63,94,0.2)", background: "rgba(244,63,94,0.03)" }}
          >
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(244,63,94,0.3), transparent)" }} />
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)" }}>
              <Receipt className="w-7 h-7" style={{ color: "rgba(244,63,94,0.5)" }} />
            </div>
            <p className="text-sm font-semibold text-foreground/60 mb-1">No expenses logged</p>
            <p className="text-xs text-muted-foreground/40 mb-6">Start tracking what your studio is spending on</p>
            <Button
              onClick={() => setCreateOpen(true)}
              className="gap-2 rounded-xl h-9 font-semibold text-sm"
              style={{ background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.28)", color: ROSE }}
            >
              <Plus className="w-4 h-4" />
              Add first expense
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="relative rounded-2xl border border-white/[0.06] bg-card overflow-hidden"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.25)" }}
          >
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(244,63,94,0.3), transparent)" }} />

            {/* List header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.05]">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.2)" }}>
                <Receipt className="w-3.5 h-3.5" style={{ color: ROSE }} />
              </div>
              <span className="text-sm font-semibold text-foreground/80">Expense Entries</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold ml-auto"
                style={{ background: "rgba(244,63,94,0.1)", color: ROSE, border: "1px solid rgba(244,63,94,0.2)" }}>
                {expenses.length}
              </span>
            </div>

            {/* Skeleton */}
            {isLoading && (
              <div className="space-y-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04]">
                    <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-3.5 w-20 hidden sm:block" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            )}

            {/* Rows */}
            {!isLoading && (
              <AnimatePresence>
                {expenses.map((e, i) => (
                  <ExpenseRow
                    key={e.id}
                    expense={e}
                    index={i}
                    onEdit={() => setEditExpense(e)}
                    onDelete={() => setDeleteId(e.id)}
                  />
                ))}
              </AnimatePresence>
            )}

            {/* Footer total */}
            {!isLoading && expenses.length > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.05]"
                style={{ background: "rgba(244,63,94,0.025)" }}>
                <span className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">Total</span>
                <span className="text-base font-bold tabular-nums" style={{ color: ROSE }}>
                  {formatCurrency(totalExpenses)}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Category legend ──────────────────────────────────────────── */}
      {!isEmpty && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="flex flex-wrap gap-2"
        >
          {Object.entries(CAT_CFG).map(([key, cfg]) => {
            const count = expenses.filter((e) => e.category === key).length;
            if (count === 0) return null;
            const Icon = cfg.icon;
            return (
              <button
                key={key}
                onClick={() => setFilter(filter === key ? "all" : key)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200"
                style={{
                  background: filter === key ? cfg.bg : "rgba(255,255,255,0.03)",
                  border: `1px solid ${filter === key ? cfg.border : "rgba(255,255,255,0.06)"}`,
                  color: filter === key ? cfg.color : "rgba(255,255,255,0.35)",
                }}
              >
                <Icon className="w-3 h-3" />
                {cfg.label}
                <span className="opacity-60">{count}</span>
              </button>
            );
          })}
          {filter !== "all" && (
            <button
              onClick={() => setFilter("all")}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}
            >
              Clear filter
            </button>
          )}
        </motion.div>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────── */}
      <ExpenseFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editExpense && (
        <ExpenseFormDialog
          open={!!editExpense}
          onOpenChange={(o) => !o && setEditExpense(null)}
          expense={editExpense}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the expense entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
