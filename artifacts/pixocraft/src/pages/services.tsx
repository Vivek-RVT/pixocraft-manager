import { useState, useMemo } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, MoreHorizontal, Pencil, Trash2, Download,
  Star, Globe, Megaphone, RefreshCw, Search, Zap,
  TrendingUp, DollarSign, CheckCircle2, Clock, SlidersHorizontal,
  ChevronRight, Boxes, ArrowUpRight, Layers, Package,
} from "lucide-react";
import {
  useListServices, getListServicesQueryKey, useDeleteService,
  useListCustomers, getListCustomersQueryKey,
  getGetDashboardSummaryQueryKey, getGetTopServicesQueryKey,
  getGetTopCustomersQueryKey, getGetRecentActivityQueryKey,
  getGetRevenueTrendQueryKey, type Service,
} from "@workspace/api-client-react";
import {
  DateRangeFilter, getAllTimeDateFilter, isInDateRange, type DateFilter,
} from "@/components/date-range-filter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ServiceFormDialog } from "@/components/service-form-dialog";
import { formatCurrency, formatDate } from "@/lib/format";

// ── Design tokens per service type ─────────────────────────────────────────
const TYPE_CONFIG = {
  web: {
    label: "Web",
    color: "#00E7FF",
    bg: "rgba(0,231,255,0.08)",
    border: "rgba(0,231,255,0.2)",
    icon: Globe,
    glow: "rgba(0,231,255,0.15)",
  },
  digital: {
    label: "Digital",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.2)",
    icon: Megaphone,
    glow: "rgba(168,85,247,0.15)",
  },
  other: {
    label: "Other",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    icon: Package,
    glow: "rgba(245,158,11,0.15)",
  },
} as const;

type ServiceType = keyof typeof TYPE_CONFIG;

function getTypeConfig(type?: string) {
  return TYPE_CONFIG[(type as ServiceType) ?? "other"] ?? TYPE_CONFIG.other;
}

// ── Payment badge ───────────────────────────────────────────────────────────
const PAYMENT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  paid:    { label: "Paid",    color: "#10B981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)", dot: "#10B981" },
  partial: { label: "Partial", color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)", dot: "#F59E0B" },
  pending: { label: "Pending", color: "#f43f5e", bg: "rgba(244,63,94,0.1)",   border: "rgba(244,63,94,0.25)",  dot: "#f43f5e" },
};

function PaymentBadge({ status }: { status: string }) {
  const cfg = PAYMENT_CONFIG[status] ?? PAYMENT_CONFIG.pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
      {cfg.label}
    </span>
  );
}

// ── Delivery badge ──────────────────────────────────────────────────────────
const DELIVERY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  delivered:   { label: "Delivered",   color: "#10B981", bg: "rgba(16,185,129,0.07)",  border: "rgba(16,185,129,0.18)" },
  in_progress: { label: "In Progress", color: "#38bdf8", bg: "rgba(56,189,248,0.07)",  border: "rgba(56,189,248,0.18)" },
  pending:     { label: "Pending",     color: "#94a3b8", bg: "rgba(148,163,184,0.07)", border: "rgba(148,163,184,0.18)" },
};

function DeliveryBadge({ status }: { status: string }) {
  const cfg = DELIVERY_CONFIG[status] ?? DELIVERY_CONFIG.pending;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

// ── Star rating ─────────────────────────────────────────────────────────────
function StarRating({ rating }: { rating?: number | null }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className="w-3 h-3"
          style={{
            fill: s <= rating ? "#FBBF24" : "transparent",
            color: s <= rating ? "#FBBF24" : "rgba(255,255,255,0.12)",
          }}
        />
      ))}
    </div>
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────
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
      style={{ boxShadow: `0 0 30px ${color}10` }}
    >
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}50, transparent)` }} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: `${color}80` }}>
            {label}
          </div>
          <div className="text-2xl font-bold tabular-nums tracking-tight" style={{ color }}>
            {value}
          </div>
          {sub && <div className="text-[11px] text-muted-foreground/40 mt-1 font-medium">{sub}</div>}
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}20` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Service row card ────────────────────────────────────────────────────────
function ServiceCard({ service, index, onEdit, onDelete }: {
  service: Service; index: number; onEdit: () => void; onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const tc = getTypeConfig((service as any).serviceType);
  const Icon = tc.icon;
  const profit = Number((service as any).profit ?? 0);
  const margin = Number(service.priceSold) > 0
    ? Math.round((profit / Number(service.priceSold)) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ delay: index * 0.03, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="group relative rounded-2xl border bg-card overflow-hidden transition-all duration-300"
      style={{
        borderColor: hovered ? tc.border : "rgba(255,255,255,0.06)",
        boxShadow: hovered ? `0 0 40px ${tc.glow}, 0 4px 20px rgba(0,0,0,0.3)` : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-full transition-all duration-300"
        style={{ background: tc.color, opacity: hovered ? 1 : 0.4, boxShadow: hovered ? `0 0 12px ${tc.color}` : "none" }}
      />

      <div className="flex items-center gap-4 px-5 py-4 pl-6">
        {/* Type icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
          style={{
            background: hovered ? `${tc.color}20` : `${tc.color}10`,
            border: `1px solid ${tc.border}`,
          }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color: tc.color }} />
        </div>

        {/* Service name + customer */}
        <div className="flex-1 min-w-0">
          <div
            className="font-semibold text-[14px] leading-snug truncate transition-colors duration-200"
            style={{ color: hovered ? tc.color : undefined }}
          >
            {service.serviceName}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tc.color, opacity: 0.6 }} />
            <span className="text-[11.5px] text-muted-foreground/50 truncate">{service.customerName}</span>
          </div>
        </div>

        {/* Date */}
        <div className="hidden lg:flex flex-col items-end shrink-0">
          <span className="text-[11px] text-muted-foreground/35 font-medium">{formatDate(service.date)}</span>
        </div>

        {/* Price + profit */}
        <div className="hidden sm:flex flex-col items-end shrink-0 gap-0.5">
          <span className="text-[15px] font-bold tabular-nums tracking-tight">
            {formatCurrency(Number(service.priceSold))}
          </span>
          <span
            className="text-[11px] font-semibold tabular-nums"
            style={{ color: profit >= 0 ? "#10B981" : "#f43f5e" }}
          >
            {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
            {margin !== 0 && <span className="opacity-60 ml-1">({margin}%)</span>}
          </span>
        </div>

        {/* Badges */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <PaymentBadge status={service.paymentStatus} />
          <DeliveryBadge status={service.deliveryStatus} />
        </div>

        {/* Rating */}
        <div className="hidden xl:block shrink-0">
          <StarRating rating={(service as any).satisfactionRating} />
        </div>

        {/* Actions */}
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-white/[0.06]">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-white/[0.08] bg-card/95 backdrop-blur-xl rounded-xl">
              <DropdownMenuItem onClick={onEdit} className="gap-2 rounded-lg">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive gap-2 rounded-lg" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile: badges row */}
      <div className="flex md:hidden items-center gap-2 px-6 pb-3 pt-0">
        <PaymentBadge status={service.paymentStatus} />
        <DeliveryBadge status={service.deliveryStatus} />
        <span className="ml-auto text-[13px] font-bold tabular-nums">
          {formatCurrency(Number(service.priceSold))}
        </span>
      </div>
    </motion.div>
  );
}

// ── Retainer card ───────────────────────────────────────────────────────────
function RetainerCard({ service, index }: { service: any; index: number }) {
  const [hovered, setHovered] = useState(false);
  const isWeb = service.kind === "web";
  const color = isWeb ? "#00E7FF" : "#a855f7";
  const Icon = isWeb ? Globe : Megaphone;
  const totalCollected = (service.completions ?? []).reduce(
    (sum: number, c: any) => sum + Number(c.paidAmount ?? 0), 0,
  );
  const statusCfg =
    service.status === "active"
      ? { label: "Active", color: "#10B981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)" }
      : service.status === "paused"
        ? { label: "Paused", color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" }
        : { label: "Cancelled", color: "#f43f5e", bg: "rgba(244,63,94,0.1)", border: "rgba(244,63,94,0.25)" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative rounded-2xl border bg-card overflow-hidden p-5 transition-all duration-300"
      style={{
        borderColor: hovered ? `${color}30` : "rgba(255,255,255,0.06)",
        boxShadow: hovered ? `0 0 30px ${color}12` : "none",
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)`, opacity: hovered ? 1 : 0.5, transition: "opacity 0.3s" }} />

      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}12`, border: `1px solid ${color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-snug truncate">{service.websiteName ?? service.serviceName}</div>
          <div className="text-[11px] text-muted-foreground/50 mt-0.5 truncate">{service.customerName}</div>
        </div>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
          style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color }}
        >
          {service.status === "active" && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: statusCfg.color }} />}
          {statusCfg.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-3" style={{ background: `${color}08`, border: `1px solid ${color}14` }}>
          <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: `${color}70` }}>Monthly</div>
          <div className="text-base font-bold tabular-nums" style={{ color }}>{formatCurrency(Number(service.monthlyCharge))}</div>
        </div>
        <div className="rounded-xl p-3 bg-white/[0.02] border border-white/[0.05]">
          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40 mb-1">Collected</div>
          <div className="text-base font-bold tabular-nums text-emerald-400">{formatCurrency(totalCollected)}</div>
        </div>
      </div>
      {service.startDate && (
        <div className="mt-3 text-[10.5px] text-muted-foreground/30 font-medium">Since {formatDate(service.startDate)}</div>
      )}
    </motion.div>
  );
}

// ── Filter pill ─────────────────────────────────────────────────────────────
function FilterPill({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border"
      style={{
        background: active ? "rgba(0,231,255,0.12)" : "rgba(255,255,255,0.03)",
        borderColor: active ? "rgba(0,231,255,0.3)" : "rgba(255,255,255,0.07)",
        color: active ? "#00E7FF" : "rgba(255,255,255,0.35)",
      }}
    >
      {children}
    </button>
  );
}

// ── Export helper ───────────────────────────────────────────────────────────
function exportToCsv(services: Service[]) {
  const rows = [
    ["Date","Customer","Service","Type","Price","Cost","Profit","Payment","Delivery","Rating","Notes"],
    ...services.map((s) => [
      s.date, s.customerName, s.serviceName, (s as any).serviceType ?? "",
      s.priceSold, s.costPrice, (s as any).profit ?? 0,
      s.paymentStatus, s.deliveryStatus, (s as any).satisfactionRating ?? "",
      (s.notes ?? "").replace(/"/g, '""'),
    ]),
  ];
  const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `services-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
  toast.success("Services exported");
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function Services() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>(getAllTimeDateFilter());

  const { data: allServices, isLoading } = useListServices(undefined, {
    query: { queryKey: getListServicesQueryKey() },
  });
  const { data: customers } = useListCustomers(undefined, {
    query: { queryKey: getListCustomersQueryKey() },
  });
  const apiFetch = (path: string) => fetch(path).then((r) => r.ok ? r.json() : Promise.reject());
  const { data: monthlyWebsite = [] } = useQuery<any[]>({ queryKey: ["monthly-website"], queryFn: () => apiFetch("/api/monthly-website") });
  const { data: monthlyDigital = [] } = useQuery<any[]>({ queryKey: ["monthly-digital"], queryFn: () => apiFetch("/api/monthly-digital") });

  const services = useMemo(() => {
    if (!allServices) return [];
    return allServices.filter((s) => {
      if (customerFilter !== "all" && String(s.customerId) !== customerFilter) return false;
      if (paymentFilter !== "all" && s.paymentStatus !== paymentFilter) return false;
      if (typeFilter !== "all" && (s as any).serviceType !== typeFilter) return false;
      if (!isInDateRange(s.date, dateFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.serviceName.toLowerCase().includes(q) && !(s.customerName ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allServices, customerFilter, paymentFilter, typeFilter, dateFilter, search]);

  const deleteMutation = useDeleteService();
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteId });
      toast.success("Service deleted");
      [getListServicesQueryKey, getGetDashboardSummaryQueryKey, getGetRevenueTrendQueryKey,
        getGetTopServicesQueryKey, getGetTopCustomersQueryKey, getGetRecentActivityQueryKey]
        .forEach((fn) => queryClient.invalidateQueries({ queryKey: fn() }));
    } catch {
      toast.error("Could not delete service");
    } finally { setDeleteId(null); }
  };

  const totalRevenue = services.reduce((s, x) => s + Number(x.priceSold), 0);
  const totalProfit = services.reduce((s, x) => s + Number((x as any).profit ?? 0), 0);
  const totalPaid = services.filter((s) => s.paymentStatus === "paid").reduce((a, x) => a + Number(x.priceSold), 0);
  const totalPending = services.filter((s) => s.paymentStatus !== "paid").reduce((a, x) => a + Number(x.priceSold), 0);
  const retainers = [
    ...monthlyWebsite.map((s: any) => ({ ...s, kind: "web" })),
    ...monthlyDigital.map((s: any) => ({ ...s, kind: "digital" })),
  ];
  const monthlyMRR = retainers.filter((r) => r.status === "active")
    .reduce((s, r) => s + Number(r.monthlyCharge ?? 0), 0);

  const isEmpty = !isLoading && services.length === 0;

  return (
    <div className="space-y-8 pb-12">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-5"
      >
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,231,255,0.1)", border: "1px solid rgba(0,231,255,0.15)" }}>
              <Boxes className="w-4.5 h-4.5 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Services</h1>
            {!isLoading && services.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(0,231,255,0.1)", color: "#00E7FF" }}>
                {services.length}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground/45 font-medium">
            Every service sold — profit, payment, and delivery at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline" size="sm"
            onClick={() => exportToCsv(services)}
            disabled={services.length === 0}
            className="h-9 rounded-xl border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-white/20 gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="h-9 rounded-xl gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white border-0 font-semibold shadow-lg shadow-cyan-500/20"
          >
            <Plus className="h-4 w-4" /> Add Service
          </Button>
        </div>
      </motion.div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Services" value={String(isLoading ? "—" : services.length)} icon={Layers} color="#00E7FF" index={0} />
        <StatCard label="Revenue" value={isLoading ? "—" : formatCurrency(totalRevenue)} icon={DollarSign} color="#a855f7" index={1} />
        <StatCard label="Net Profit" value={isLoading ? "—" : formatCurrency(totalProfit)} sub={totalRevenue > 0 ? `${Math.round(totalProfit/totalRevenue*100)}% margin` : undefined} icon={TrendingUp} color="#10B981" index={2} />
        <StatCard label="MRR (retainers)" value={isLoading ? "—" : formatCurrency(monthlyMRR)} sub={`${retainers.filter(r=>r.status==="active").length} active`} icon={RefreshCw} color="#F59E0B" index={3} />
      </div>

      {/* ── Filters ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-3"
      >
        {/* Search + date */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/35 pointer-events-none" />
            <Input
              placeholder="Search services or clients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl bg-white/[0.03] border-white/[0.07] placeholder:text-muted-foreground/25 focus:border-cyan-400/40 text-sm"
            />
          </div>
          <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
        </div>

        {/* Pill filters + dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" /> Filter
          </span>
          <FilterPill active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>All Types</FilterPill>
          <FilterPill active={typeFilter === "web"} onClick={() => setTypeFilter("web")}>
            <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Web</span>
          </FilterPill>
          <FilterPill active={typeFilter === "digital"} onClick={() => setTypeFilter("digital")}>
            <span className="flex items-center gap-1"><Megaphone className="w-3 h-3" /> Digital</span>
          </FilterPill>
          <FilterPill active={typeFilter === "other"} onClick={() => setTypeFilter("other")}>
            <span className="flex items-center gap-1"><Package className="w-3 h-3" /> Other</span>
          </FilterPill>

          <div className="h-5 w-px bg-white/[0.08] mx-1" />

          <FilterPill active={paymentFilter === "all"} onClick={() => setPaymentFilter("all")}>Any Payment</FilterPill>
          <FilterPill active={paymentFilter === "paid"} onClick={() => setPaymentFilter("paid")}>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Paid</span>
          </FilterPill>
          <FilterPill active={paymentFilter === "partial"} onClick={() => setPaymentFilter("partial")}>Partial</FilterPill>
          <FilterPill active={paymentFilter === "pending"} onClick={() => setPaymentFilter("pending")}>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
          </FilterPill>

          <div className="h-5 w-px bg-white/[0.08] mx-1 hidden sm:block" />

          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="h-9 w-auto min-w-[140px] rounded-xl border-white/[0.07] bg-white/[0.03] text-xs text-muted-foreground/60">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {customers?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {(search || typeFilter !== "all" || paymentFilter !== "all" || customerFilter !== "all") && (
            <button
              onClick={() => { setSearch(""); setTypeFilter("all"); setPaymentFilter("all"); setCustomerFilter("all"); }}
              className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors font-medium underline underline-offset-2 ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Service list ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground/50">One-time services</span>
            {!isLoading && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.05] text-muted-foreground/40">
                {services.length}
              </span>
            )}
          </div>
          {!isLoading && services.length > 0 && (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground/35 font-medium">
              <span style={{ color: "#10B981" }}>{formatCurrency(totalPaid)} paid</span>
              <span className="w-1 h-1 rounded-full bg-white/[0.1]" />
              <span style={{ color: "#f43f5e" }}>{formatCurrency(totalPending)} outstanding</span>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/[0.05] bg-card p-5 flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-40 rounded-full" />
                    <Skeleton className="h-2.5 w-28 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-20 rounded-full hidden sm:block" />
                  <Skeleton className="h-6 w-16 rounded-full hidden md:block" />
                  <Skeleton className="h-6 w-20 rounded-full hidden md:block" />
                </div>
              ))}
            </motion.div>
          ) : isEmpty ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-dashed border-white/[0.07] bg-white/[0.01] p-20 text-center"
            >
              <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(0,231,255,0.07)" }}>
                <Boxes className="w-7 h-7 text-cyan-400/50" />
              </div>
              <div className="font-semibold text-lg mb-1">No services found</div>
              <p className="text-sm text-muted-foreground/40 mb-6">
                {search || typeFilter !== "all" || paymentFilter !== "all" || customerFilter !== "all"
                  ? "Try adjusting your filters."
                  : "Add your first service to start tracking revenue."}
              </p>
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white border-0 rounded-xl"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Service
              </Button>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {services.map((s, i) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  index={i}
                  onEdit={() => setEditService(s)}
                  onDelete={() => setDeleteId(s.id)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Monthly retainers ── */}
      {retainers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <span className="text-sm font-semibold">Monthly Retainers</span>
                <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
                  {retainers.length}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-muted-foreground/35">Active MRR</span>
              <span className="font-bold" style={{ color: "#10B981" }}>{formatCurrency(monthlyMRR)}</span>
              <ArrowUpRight className="w-3 h-3" style={{ color: "#10B981" }} />
            </div>
          </div>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {retainers.map((s, i) => (
              <RetainerCard key={`${s.kind}-${s.id}`} service={s} index={i} />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Dialogs ── */}
      <ServiceFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editService && (
        <ServiceFormDialog
          open={!!editService}
          onOpenChange={(o) => !o && setEditService(null)}
          service={editService}
        />
      )}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this service?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the service entry and its impact on revenue calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
