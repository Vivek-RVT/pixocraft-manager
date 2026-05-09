import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, getYear, getMonth } from "date-fns";
import {
  Plus, Pencil, Trash2, CheckCircle2, Circle, Globe, Megaphone,
  ChevronDown, ChevronUp, BarChart2, TrendingUp, Users, Zap,
  FileText, CalendarDays, Layers, DollarSign, Wallet, Activity,
  ArrowUpRight, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useListCustomers } from "@workspace/api-client-react";
import { CalendarDatePicker } from "@/components/ui/calendar-date-picker";

const DatePickerField = CalendarDatePicker;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const BASE_PATH = import.meta.env.BASE_URL ?? "/pixocraft/";

async function apiFetch(path: string, options?: RequestInit) {
  const base = BASE_PATH.endsWith("/") ? BASE_PATH.slice(0, -1) : BASE_PATH;
  const res = await fetch(`${base}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type MonthlyCompletion = {
  id: number; serviceId: number; year: number; month: number;
  completed: boolean; paidAmount: number; notes: string | null; completedAt: string | null;
};

type MonthlyWebsiteService = {
  id: number; customerId: number; customerName: string; websiteName: string;
  monthlyCost: number; monthlyCharge: number; discount: number;
  startDate: string; status: "active" | "paused" | "cancelled";
  notes: string | null; completions: MonthlyCompletion[];
};

type MonthlyDigitalService = {
  id: number; customerId: number; customerName: string; serviceName: string;
  platform: string | null; monthlyCost: number; monthlyCharge: number;
  discount: number; startDate: string; status: "active" | "running" | "paused" | "cancelled";
  notes: string | null; completions: MonthlyCompletion[];
};

const currentYear = getYear(new Date());
const currentMonth = getMonth(new Date()) + 1;

// ─── Status badge ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  active:    { label: "Active",    color: "#10B981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)", dot: "#10B981" },
  running:   { label: "Running",   color: "#38bdf8", bg: "rgba(56,189,248,0.1)",  border: "rgba(56,189,248,0.25)", dot: "#38bdf8" },
  paused:    { label: "Paused",    color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)", dot: "#F59E0B" },
  cancelled: { label: "Cancelled", color: "#f43f5e", bg: "rgba(244,63,94,0.1)",   border: "rgba(244,63,94,0.25)",  dot: "#f43f5e" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.active;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
      {cfg.label}
    </span>
  );
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
      transition={{ delay: index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl border border-white/[0.06] bg-card overflow-hidden p-5"
      style={{ boxShadow: `0 0 28px ${color}0d` }}
    >
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}55, transparent)` }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: `${color}80` }}>{label}</div>
          <div className="text-2xl font-bold tabular-nums tracking-tight" style={{ color }}>{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground/50 mt-1 font-medium">{sub}</div>}
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}22` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Month grid ───────────────────────────────────────────────────────────────
function MonthGrid({
  completions, year, serviceId, endpoint, monthlyCharge, monthlyCost, onCompleted, accentColor,
}: {
  completions: MonthlyCompletion[]; year: number; serviceId: number;
  endpoint: "monthly-website" | "monthly-digital"; monthlyCharge: number;
  monthlyCost: number; onCompleted?: (year: number, month: number) => void;
  accentColor: string;
}) {
  const qc = useQueryClient();
  const [pendingMonth, setPendingMonth] = useState<number | null>(null);
  const [amountCharged, setAmountCharged] = useState("");
  const [costPrice, setCostPrice] = useState("");

  const toggleMutation = useMutation({
    mutationFn: async ({ month, completed, paidAmount }: { month: number; completed: boolean; paidAmount: number }) =>
      apiFetch(`/${endpoint}/${serviceId}/completion`, {
        method: "POST",
        body: JSON.stringify({ year, month, completed, paidAmount }),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [endpoint] }); },
    onError: () => toast.error("Could not update completion"),
  });

  const completionMap = useMemo(() => {
    const map = new Map<number, MonthlyCompletion>();
    for (const c of completions) { if (c.year === year) map.set(c.month, c); }
    return map;
  }, [completions, year]);

  let maxAllowedMonth = currentMonth + 1;
  let maxAllowedYear = currentYear;
  if (maxAllowedMonth > 12) { maxAllowedMonth = 1; maxAllowedYear = currentYear + 1; }

  const handleMonthClick = (monthNum: number, done: boolean) => {
    if (done) {
      toggleMutation.mutate({ month: monthNum, completed: false, paidAmount: 0 });
    } else {
      setAmountCharged(String(monthlyCharge));
      setCostPrice(String(monthlyCost));
      setPendingMonth(monthNum);
    }
  };

  const confirmCompletion = () => {
    if (pendingMonth === null) return;
    const doneMonth = pendingMonth;
    const doneYear = year;
    toggleMutation.mutate(
      { month: doneMonth, completed: true, paidAmount: Number(amountCharged) || monthlyCharge },
      { onSuccess: () => { onCompleted?.(doneYear, doneMonth); } },
    );
    setPendingMonth(null);
  };

  const doneCount = Array.from(completionMap.values()).filter((c) => c.completed).length;
  const progressPct = Math.round((doneCount / 12) * 100);

  return (
    <>
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-3 mt-1">
        <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${accentColor}80, ${accentColor})` }}
          />
        </div>
        <span className="text-[10px] font-semibold tabular-nums" style={{ color: `${accentColor}90` }}>
          {doneCount}/12
        </span>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {MONTHS.map((m, i) => {
          const monthNum = i + 1;
          const comp = completionMap.get(monthNum);
          const done = comp?.completed ?? false;
          const isFuture =
            year > maxAllowedYear ||
            (year === maxAllowedYear && monthNum > maxAllowedMonth);
          const isCurrent = year === currentYear && monthNum === currentMonth;
          const isNextMonth =
            !done && !isFuture &&
            ((year === currentYear && monthNum === currentMonth + 1) ||
              (year === currentYear + 1 && currentMonth === 12 && monthNum === 1));

          return (
            <button
              key={m}
              disabled={isFuture || toggleMutation.isPending}
              onClick={() => handleMonthClick(monthNum, done)}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border py-2 text-[11px] font-semibold transition-all duration-200 gap-0.5",
                isFuture
                  ? "opacity-15 cursor-not-allowed border-dashed border-white/10"
                  : done
                    ? "cursor-pointer"
                    : isCurrent
                      ? "cursor-pointer border-dashed"
                      : isNextMonth
                        ? "cursor-pointer"
                        : "hover:bg-white/[0.04] cursor-pointer border-white/[0.06]",
              )}
              style={
                done
                  ? { background: "rgba(16,185,129,0.12)", borderColor: "rgba(16,185,129,0.3)", color: "#10B981" }
                  : isCurrent
                    ? { borderColor: `${accentColor}50`, color: `${accentColor}cc`, background: `${accentColor}08` }
                    : isNextMonth
                      ? { borderColor: "rgba(56,189,248,0.4)", color: "#38bdf8", background: "rgba(56,189,248,0.06)" }
                      : { color: "rgba(255,255,255,0.35)" }
              }
            >
              <span>{m}</span>
              {done ? (
                <CheckCircle2 className="w-3 h-3" style={{ color: "#10B981" }} />
              ) : isCurrent ? (
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor, boxShadow: `0 0 5px ${accentColor}` }} />
              ) : isNextMonth ? (
                <Circle className="w-3 h-3 text-sky-400" />
              ) : (
                <Circle className="w-2.5 h-2.5 opacity-30" />
              )}
            </button>
          );
        })}
      </div>

      <Dialog open={pendingMonth !== null} onOpenChange={(o) => !o && setPendingMonth(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Mark {pendingMonth ? MONTHS[pendingMonth - 1] : ""} as done</DialogTitle>
            <DialogDescription>Confirm the amounts for this month — prices can differ from the default.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label>Amount charged to customer (₹)</Label>
              <Input type="number" inputMode="decimal" value={amountCharged}
                onChange={(e) => setAmountCharged(e.target.value)} placeholder={String(monthlyCharge)} />
              <p className="text-xs text-muted-foreground">Default rate: ₹{monthlyCharge.toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <Label>Your cost this month (₹)</Label>
              <Input type="number" inputMode="decimal" value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)} placeholder={String(monthlyCost)} />
              <p className="text-xs text-muted-foreground">
                Profit: ₹{((Number(amountCharged) || monthlyCharge) - (Number(costPrice) || monthlyCost)).toLocaleString()}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingMonth(null)}>Cancel</Button>
            <Button onClick={confirmCompletion} disabled={toggleMutation.isPending}>
              {toggleMutation.isPending ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── DM progress dialog ───────────────────────────────────────────────────────
type DMInitialData = {
  platforms: string | null; plan: string | null;
  uploadedVideos: number; uploadedPosts: number; uploadedReels: number; uploadedStories: number;
  followersGained: number; engagementGrowth: string | null; leadsGenerated: number;
  adSpend: string; summaryNotes: string | null;
};

function DMProgressDialog({ open, onOpenChange, customerId, customerName, serviceName, year, month, initialData }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  customerId: number; customerName: string; serviceName: string;
  year: number; month: number; initialData?: DMInitialData;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    platforms: "", plan: "",
    uploadedVideos: "0", uploadedPosts: "0", uploadedReels: "0", uploadedStories: "0",
    followersGained: "0", engagementGrowth: "", leadsGenerated: "0",
    adSpend: "0", summaryNotes: "",
  });

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setForm({
        platforms: initialData.platforms ?? "", plan: initialData.plan ?? "",
        uploadedVideos: String(initialData.uploadedVideos ?? 0),
        uploadedPosts: String(initialData.uploadedPosts ?? 0),
        uploadedReels: String(initialData.uploadedReels ?? 0),
        uploadedStories: String(initialData.uploadedStories ?? 0),
        followersGained: String(initialData.followersGained ?? 0),
        engagementGrowth: initialData.engagementGrowth ?? "",
        leadsGenerated: String(initialData.leadsGenerated ?? 0),
        adSpend: initialData.adSpend ?? "0",
        summaryNotes: initialData.summaryNotes ?? "",
      });
    } else {
      setForm({
        platforms: "", plan: "",
        uploadedVideos: "0", uploadedPosts: "0", uploadedReels: "0", uploadedStories: "0",
        followersGained: "0", engagementGrowth: "", leadsGenerated: "0",
        adSpend: "0", summaryNotes: "",
      });
    }
  }, [open, initialData]);

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/admin/dm-reports/${customerId}`, {
        method: "POST",
        body: JSON.stringify({
          year, month,
          platforms: form.platforms || null, plan: form.plan || null,
          targetVideos: 0, targetPosts: 0, targetReels: 0, targetStories: 0,
          uploadedVideos: Number(form.uploadedVideos),
          uploadedPosts: Number(form.uploadedPosts),
          uploadedReels: Number(form.uploadedReels),
          uploadedStories: Number(form.uploadedStories),
          followersGained: Number(form.followersGained),
          engagementGrowth: form.engagementGrowth || null,
          leadsGenerated: Number(form.leadsGenerated),
          adSpend: form.adSpend || "0",
          summaryNotes: form.summaryNotes || null,
        }),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dm-reports"] }); toast.success("DM report saved!"); onOpenChange(false); },
    onError: () => toast.error("Failed to save report"),
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit" : "Log"} Digital Progress — {MONTHS[month - 1]} {year}</DialogTitle>
          <DialogDescription>
            {initialData ? "Update" : "Add"} progress for <span className="font-medium">{serviceName}</span> ({customerName})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1 text-sm">
          <div>
            <Label className="text-xs">Platforms</Label>
            <Input className="mt-1 h-9" value={form.platforms} onChange={(e) => set("platforms", e.target.value)} placeholder="e.g. Instagram, Facebook" />
          </div>
          <div>
            <Label className="text-xs">Plan / Focus this month</Label>
            <Textarea className="mt-1 min-h-[60px] resize-none" value={form.plan} onChange={(e) => set("plan", e.target.value)} placeholder="Brand awareness, product launch..." />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(["uploadedVideos","uploadedPosts","uploadedReels","uploadedStories"] as const).map((k) => (
              <div key={k}>
                <Label className="text-xs capitalize">{k.replace("uploaded","")}</Label>
                <Input className="mt-1 h-9" type="number" min={0} value={form[k]} onChange={(e) => set(k, e.target.value)} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Followers gained</Label>
              <Input className="mt-1 h-9" type="number" min={0} value={form.followersGained} onChange={(e) => set("followersGained", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Leads generated</Label>
              <Input className="mt-1 h-9" type="number" min={0} value={form.leadsGenerated} onChange={(e) => set("leadsGenerated", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Ad spend (₹)</Label>
              <Input className="mt-1 h-9" type="number" min={0} value={form.adSpend} onChange={(e) => set("adSpend", e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Engagement growth</Label>
            <Input className="mt-1 h-9" value={form.engagementGrowth} onChange={(e) => set("engagementGrowth", e.target.value)} placeholder="e.g. +12%" />
          </div>
          <div>
            <Label className="text-xs">Summary / notes</Label>
            <Textarea className="mt-1 min-h-[60px] resize-none" value={form.summaryNotes} onChange={(e) => set("summaryNotes", e.target.value)} placeholder="What went well, what to improve..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Skip</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : "Save Report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── SEO progress dialog ──────────────────────────────────────────────────────
type SeoInitialData = {
  blogsPosted: number; keywordsRanked: number; trafficGrowth: string | null;
  backlinksAdded: number; seoScore: number | null; notes: string | null;
};

function SeoProgressDialog({ open, onOpenChange, customerId, customerName, websiteName, year, month, initialData }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  customerId: number; customerName: string; websiteName: string;
  year: number; month: number; initialData?: SeoInitialData;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ blogsPosted: "0", keywordsRanked: "0", trafficGrowth: "", backlinksAdded: "0", seoScore: "", notes: "" });

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setForm({
        blogsPosted: String(initialData.blogsPosted ?? 0),
        keywordsRanked: String(initialData.keywordsRanked ?? 0),
        trafficGrowth: initialData.trafficGrowth ?? "",
        backlinksAdded: String(initialData.backlinksAdded ?? 0),
        seoScore: initialData.seoScore != null ? String(initialData.seoScore) : "",
        notes: initialData.notes ?? "",
      });
    } else {
      setForm({ blogsPosted: "0", keywordsRanked: "0", trafficGrowth: "", backlinksAdded: "0", seoScore: "", notes: "" });
    }
  }, [open, initialData]);

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/admin/seo-reports/${customerId}`, {
        method: "POST",
        body: JSON.stringify({
          year, month,
          blogsPosted: Number(form.blogsPosted),
          keywordsRanked: Number(form.keywordsRanked),
          trafficGrowth: form.trafficGrowth || null,
          backlinksAdded: Number(form.backlinksAdded),
          seoScore: form.seoScore ? Number(form.seoScore) : null,
          notes: form.notes || null,
        }),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["seo-reports"] }); toast.success("SEO report saved!"); onOpenChange(false); },
    onError: () => toast.error("Failed to save report"),
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Web / SEO Progress — {MONTHS[month - 1]} {year}</DialogTitle>
          <DialogDescription>Add last month's progress for <span className="font-medium">{websiteName}</span> ({customerName})</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Blogs posted</Label>
              <Input className="mt-1 h-9" type="number" min={0} value={form.blogsPosted} onChange={(e) => set("blogsPosted", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Keywords ranked</Label>
              <Input className="mt-1 h-9" type="number" min={0} value={form.keywordsRanked} onChange={(e) => set("keywordsRanked", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Backlinks added</Label>
              <Input className="mt-1 h-9" type="number" min={0} value={form.backlinksAdded} onChange={(e) => set("backlinksAdded", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">SEO score (0-100)</Label>
              <Input className="mt-1 h-9" type="number" min={0} max={100} value={form.seoScore} onChange={(e) => set("seoScore", e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Traffic growth</Label>
            <Input className="mt-1 h-9" value={form.trafficGrowth} onChange={(e) => set("trafficGrowth", e.target.value)} placeholder="e.g. +18% or 1,240 clicks" />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea className="mt-1 min-h-[70px] resize-none" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="What was done this month..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Skip</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : "Save Report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── DM Reports View ──────────────────────────────────────────────────────────
function DMReportsViewDialog({ open, onOpenChange, customerId, customerName, serviceName }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  customerId: number; customerName: string; serviceName: string;
}) {
  const [editReport, setEditReport] = useState<{ year: number; month: number; data: DMInitialData } | null>(null);

  const { data: reports = [], isLoading } = useQuery<{
    id: number; year: number; month: number;
    platforms: string | null; plan: string | null;
    uploadedVideos: number; uploadedPosts: number; uploadedReels: number; uploadedStories: number;
    followersGained: number; engagementGrowth: string | null; leadsGenerated: number;
    adSpend: string; summaryNotes: string | null;
  }[]>({
    queryKey: ["dm-reports", customerId],
    queryFn: () => apiFetch(`/admin/dm-reports/${customerId}`),
    enabled: open,
  });

  const sorted = useMemo(
    () => [...reports].sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month),
    [reports],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-violet-400" />
              Reports — {serviceName}
            </DialogTitle>
            <DialogDescription>{customerName} · {sorted.length} report{sorted.length !== 1 ? "s" : ""} saved</DialogDescription>
          </DialogHeader>

          {isLoading && <p className="text-sm text-muted-foreground py-4">Loading reports...</p>}

          {!isLoading && sorted.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No reports saved yet. Mark a month as done to add a report.</p>
            </div>
          )}

          <div className="space-y-3">
            {sorted.map((r) => (
              <div key={r.id} className="rounded-xl border border-white/[0.07] bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{MONTHS[r.month - 1]} {r.year}</h3>
                    {r.platforms && <Badge variant="secondary" className="text-xs">{r.platforms}</Badge>}
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditReport({ year: r.year, month: r.month, data: r })}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {r.plan && <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">{r.plan}</p>}
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: "Videos", value: r.uploadedVideos, color: "#a855f7" },
                    { label: "Posts", value: r.uploadedPosts, color: "#a855f7" },
                    { label: "Reels", value: r.uploadedReels, color: "#a855f7" },
                    { label: "Stories", value: r.uploadedStories, color: "#a855f7" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-2 py-2">
                      <p className="text-lg font-bold" style={{ color }}>{value}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-2">
                    <p className="text-lg font-bold text-emerald-400">+{r.followersGained}</p>
                    <p className="text-[10px] text-muted-foreground">Followers</p>
                  </div>
                  <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-2 py-2">
                    <p className="text-lg font-bold text-sky-400">{r.leadsGenerated}</p>
                    <p className="text-[10px] text-muted-foreground">Leads</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-2">
                    <p className="text-lg font-bold text-amber-400">{r.engagementGrowth || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Engagement</p>
                  </div>
                </div>
                {(Number(r.adSpend) > 0 || r.summaryNotes) && (
                  <div className="space-y-1.5 text-xs text-muted-foreground border-t border-white/[0.05] pt-2">
                    {Number(r.adSpend) > 0 && (
                      <p>Ad spend: <span className="font-semibold text-foreground">₹{Number(r.adSpend).toLocaleString()}</span></p>
                    )}
                    {r.summaryNotes && <p className="italic">{r.summaryNotes}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <DMProgressDialog
        open={!!editReport} onOpenChange={(v) => !v && setEditReport(null)}
        customerId={customerId} customerName={customerName} serviceName={serviceName}
        year={editReport?.year ?? currentYear} month={editReport?.month ?? currentMonth}
        initialData={editReport?.data}
      />
    </>
  );
}

// ─── SEO Reports View ─────────────────────────────────────────────────────────
function SeoReportsViewDialog({ open, onOpenChange, customerId, customerName, websiteName }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  customerId: number; customerName: string; websiteName: string;
}) {
  const [editReport, setEditReport] = useState<{ year: number; month: number; data: SeoInitialData } | null>(null);

  const { data: reports = [], isLoading } = useQuery<{
    id: number; year: number; month: number;
    blogsPosted: number; keywordsRanked: number; trafficGrowth: string | null;
    backlinksAdded: number; seoScore: number | null; notes: string | null;
  }[]>({
    queryKey: ["seo-reports", customerId],
    queryFn: () => apiFetch(`/admin/seo-reports/${customerId}`),
    enabled: open,
  });

  const sorted = useMemo(
    () => [...reports].sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month),
    [reports],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              Reports — {websiteName}
            </DialogTitle>
            <DialogDescription>{customerName} · {sorted.length} report{sorted.length !== 1 ? "s" : ""} saved</DialogDescription>
          </DialogHeader>

          {isLoading && <p className="text-sm text-muted-foreground py-4">Loading reports...</p>}

          {!isLoading && sorted.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No SEO reports saved yet. Mark a month as done to add a report.</p>
            </div>
          )}

          <div className="space-y-3">
            {sorted.map((r) => (
              <div key={r.id} className="rounded-xl border border-white/[0.07] bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{MONTHS[r.month - 1]} {r.year}</h3>
                    {r.seoScore != null && (
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border",
                        r.seoScore >= 80 ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" :
                        r.seoScore >= 60 ? "bg-sky-500/10 border-sky-500/25 text-sky-400" :
                        "bg-amber-500/10 border-amber-500/25 text-amber-400",
                      )}>
                        SEO {r.seoScore}/100
                      </span>
                    )}
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditReport({ year: r.year, month: r.month, data: r })}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: "Blogs", value: r.blogsPosted, color: "#38bdf8" },
                    { label: "Keywords", value: r.keywordsRanked, color: "#a855f7" },
                    { label: "Backlinks", value: r.backlinksAdded, color: "#10B981" },
                    { label: "Traffic", value: r.trafficGrowth ?? "—", color: "#F59E0B" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-lg border px-2 py-2"
                      style={{ background: `${color}10`, borderColor: `${color}25` }}>
                      <p className="text-lg font-bold" style={{ color }}>{value}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                {r.notes && <p className="text-xs text-muted-foreground border-t border-white/[0.05] pt-2 italic">{r.notes}</p>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <SeoProgressDialog
        open={!!editReport} onOpenChange={(v) => !v && setEditReport(null)}
        customerId={customerId} customerName={customerName} websiteName={websiteName}
        year={editReport?.year ?? currentYear} month={editReport?.month ?? currentMonth}
        initialData={editReport?.data}
      />
    </>
  );
}

// ─── Website service form dialog ──────────────────────────────────────────────
type WebsiteFormData = {
  customerId: string; websiteName: string; monthlyCost: string;
  standardRate: string; monthlyCharge: string; startDate: string;
  status: "active" | "paused" | "cancelled"; notes: string;
};

function WebsiteServiceDialog({ open, onOpenChange, editing, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editing?: MonthlyWebsiteService; onSaved: () => void;
}) {
  const { data: customers } = useListCustomers();
  const [form, setForm] = useState<WebsiteFormData>({
    customerId: "", websiteName: "", monthlyCost: "", standardRate: "", monthlyCharge: "",
    startDate: new Date().toISOString().slice(0, 10), status: "active", notes: "",
  });
  const [loading, setLoading] = useState(false);

  useMemo(() => {
    if (!open) return;
    if (editing) {
      const reconstructed = editing.monthlyCharge + editing.discount;
      setForm({
        customerId: String(editing.customerId), websiteName: editing.websiteName,
        monthlyCost: String(editing.monthlyCost),
        standardRate: reconstructed > editing.monthlyCharge ? String(reconstructed) : "",
        monthlyCharge: String(editing.monthlyCharge), startDate: editing.startDate,
        status: editing.status, notes: editing.notes ?? "",
      });
    } else {
      setForm({
        customerId: "", websiteName: "", monthlyCost: "", standardRate: "", monthlyCharge: "",
        startDate: new Date().toISOString().slice(0, 10), status: "active", notes: "",
      });
    }
  }, [open, editing]);

  const set = (k: keyof WebsiteFormData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const stdRate = Number(form.standardRate || 0);
      const charge = Number(form.monthlyCharge || 0);
      const discount = stdRate > charge ? stdRate - charge : 0;
      const body = {
        customerId: Number(form.customerId), websiteName: form.websiteName,
        monthlyCost: Number(form.monthlyCost || 0), monthlyCharge: charge, discount,
        startDate: form.startDate, status: form.status, notes: form.notes || null,
      };
      if (editing) {
        await apiFetch(`/monthly-website/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast.success("Website service updated");
      } else {
        await apiFetch("/monthly-website", { method: "POST", body: JSON.stringify(body) });
        toast.success("Website service added");
      }
      onSaved();
      onOpenChange(false);
    } catch { toast.error("Could not save"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit website service" : "Add website service"}</DialogTitle>
          <DialogDescription>Monthly website management service</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Customer *</Label>
              <Select value={form.customerId} onValueChange={(v) => set("customerId", v)}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}{c.businessName ? ` — ${c.businessName}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Website / Project name *</Label>
              <Input required value={form.websiteName} onChange={(e) => set("websiteName", e.target.value)} placeholder="client.com" />
            </div>
            <div className="space-y-2">
              <Label>Your cost (₹)</Label>
              <Input type="number" value={form.monthlyCost} onChange={(e) => set("monthlyCost", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Standard rate (₹)</Label>
              <Input type="number" value={form.standardRate} onChange={(e) => set("standardRate", e.target.value)} placeholder="Your normal list price" />
            </div>
            <div className="space-y-2">
              <Label>Client rate (₹) *</Label>
              <Input required type="number" value={form.monthlyCharge} onChange={(e) => set("monthlyCharge", e.target.value)} placeholder="What this client pays" />
            </div>
            {(() => {
              const std = Number(form.standardRate || 0);
              const charge = Number(form.monthlyCharge || 0);
              const disc = std > charge && charge > 0 ? std - charge : 0;
              const pct = std > 0 && disc > 0 ? Math.round((disc / std) * 100) : 0;
              return disc > 0 ? (
                <div className="col-span-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 text-sm text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Discount: <span className="font-semibold">₹{disc.toLocaleString()}/mo</span> — {pct}% off standard rate
                </div>
              ) : null;
            })()}
            <div className="space-y-2">
              <Label>Start date</Label>
              <DatePickerField value={form.startDate} onChange={(v) => set("startDate", v)} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : editing ? "Save changes" : "Add service"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Digital service form dialog ──────────────────────────────────────────────
type DigitalFormData = {
  customerId: string; serviceName: string; platform: string; monthlyCost: string;
  standardRate: string; monthlyCharge: string; startDate: string;
  status: "active" | "running" | "paused" | "cancelled"; notes: string;
};

function DigitalServiceDialog({ open, onOpenChange, editing, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editing?: MonthlyDigitalService; onSaved: () => void;
}) {
  const { data: customers } = useListCustomers();
  const [form, setForm] = useState<DigitalFormData>({
    customerId: "", serviceName: "", platform: "", monthlyCost: "", standardRate: "",
    monthlyCharge: "", startDate: new Date().toISOString().slice(0, 10), status: "active", notes: "",
  });
  const [loading, setLoading] = useState(false);

  useMemo(() => {
    if (!open) return;
    if (editing) {
      const reconstructed = editing.monthlyCharge + editing.discount;
      setForm({
        customerId: String(editing.customerId), serviceName: editing.serviceName,
        platform: editing.platform ?? "", monthlyCost: String(editing.monthlyCost),
        standardRate: reconstructed > editing.monthlyCharge ? String(reconstructed) : "",
        monthlyCharge: String(editing.monthlyCharge), startDate: editing.startDate,
        status: editing.status, notes: editing.notes ?? "",
      });
    } else {
      setForm({
        customerId: "", serviceName: "", platform: "", monthlyCost: "", standardRate: "",
        monthlyCharge: "", startDate: new Date().toISOString().slice(0, 10), status: "active", notes: "",
      });
    }
  }, [open, editing]);

  const set = (k: keyof DigitalFormData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const stdRate = Number(form.standardRate || 0);
      const charge = Number(form.monthlyCharge || 0);
      const discount = stdRate > charge ? stdRate - charge : 0;
      const body = {
        customerId: Number(form.customerId), serviceName: form.serviceName,
        platform: form.platform || null, monthlyCost: Number(form.monthlyCost || 0),
        monthlyCharge: charge, discount, startDate: form.startDate,
        status: form.status, notes: form.notes || null,
      };
      if (editing) {
        await apiFetch(`/monthly-digital/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast.success("Digital service updated");
      } else {
        await apiFetch("/monthly-digital", { method: "POST", body: JSON.stringify(body) });
        toast.success("Digital service added");
      }
      onSaved();
      onOpenChange(false);
    } catch { toast.error("Could not save"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit digital service" : "Add digital service"}</DialogTitle>
          <DialogDescription>Monthly digital marketing service</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Customer *</Label>
              <Select value={form.customerId} onValueChange={(v) => set("customerId", v)}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}{c.businessName ? ` — ${c.businessName}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Service name *</Label>
              <Input required value={form.serviceName} onChange={(e) => set("serviceName", e.target.value)} placeholder="SEO, Social Media..." />
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Input value={form.platform} onChange={(e) => set("platform", e.target.value)} placeholder="Instagram, Google..." />
            </div>
            <div className="space-y-2">
              <Label>Your cost (₹)</Label>
              <Input type="number" value={form.monthlyCost} onChange={(e) => set("monthlyCost", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Standard rate (₹)</Label>
              <Input type="number" value={form.standardRate} onChange={(e) => set("standardRate", e.target.value)} placeholder="Your normal list price" />
            </div>
            <div className="space-y-2">
              <Label>Client rate (₹) *</Label>
              <Input required type="number" value={form.monthlyCharge} onChange={(e) => set("monthlyCharge", e.target.value)} placeholder="What this client pays" />
            </div>
            {(() => {
              const std = Number(form.standardRate || 0);
              const charge = Number(form.monthlyCharge || 0);
              const disc = std > charge && charge > 0 ? std - charge : 0;
              const pct = std > 0 && disc > 0 ? Math.round((disc / std) * 100) : 0;
              return disc > 0 ? (
                <div className="col-span-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 text-sm text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Discount: <span className="font-semibold">₹{disc.toLocaleString()}/mo</span> — {pct}% off standard rate
                </div>
              ) : null;
            })()}
            <div className="space-y-2">
              <Label>Start date</Label>
              <DatePickerField value={form.startDate} onChange={(v) => set("startDate", v)} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="running">Running (being delivered now)</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : editing ? "Save changes" : "Add service"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Website service card ─────────────────────────────────────────────────────
function WebsiteServiceCard({ service, year, onEdit, onDelete, highlighted, index }: {
  service: MonthlyWebsiteService; year: number; onEdit: () => void;
  onDelete: () => void; highlighted?: boolean; index: number;
}) {
  const CYAN = "#00E7FF";
  const cardRef = useRef<HTMLDivElement>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportYear, setReportYear] = useState(currentYear);
  const [reportMonth, setReportMonth] = useState(currentMonth);
  const [viewReportsOpen, setViewReportsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (highlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashActive(true);
      const t = setTimeout(() => setFlashActive(false), 2500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [highlighted]);

  const profit = service.monthlyCharge - service.monthlyCost;
  const doneThisYear = service.completions.filter((c) => c.year === year && c.completed).length;
  const collectedThisYear = service.completions
    .filter((c) => c.year === year && c.completed)
    .reduce((sum, c) => sum + c.paidAmount, 0);
  const standardRate = service.monthlyCharge + service.discount;
  const discountPct = service.discount > 0 && standardRate > 0
    ? Math.round((service.discount / standardRate) * 100) : 0;

  return (
    <motion.div
      ref={cardRef}
      id={`service-${service.id}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative rounded-2xl border bg-card overflow-hidden transition-all duration-300"
      style={{
        borderColor: flashActive ? "rgba(0,231,255,0.5)" : hovered ? "rgba(0,231,255,0.2)" : "rgba(255,255,255,0.06)",
        boxShadow: flashActive
          ? "0 0 40px rgba(0,231,255,0.2)"
          : hovered
            ? "0 0 32px rgba(0,231,255,0.08), 0 4px 20px rgba(0,0,0,0.3)"
            : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${CYAN}55, transparent)` }} />

      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-full transition-all duration-300"
        style={{ background: CYAN, opacity: hovered ? 0.9 : 0.35, boxShadow: hovered ? `0 0 10px ${CYAN}` : "none" }}
      />

      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-4 pb-3 pl-6 gap-3">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          {/* Icon badge */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
            style={{
              background: hovered ? "rgba(0,231,255,0.15)" : "rgba(0,231,255,0.1)",
              border: `1px solid rgba(0,231,255,0.22)`,
              boxShadow: hovered ? "0 0 18px rgba(0,231,255,0.2)" : "none",
            }}
          >
            <Globe className="w-5 h-5" style={{ color: CYAN }} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <p className="font-semibold text-sm text-foreground">{service.websiteName}</p>
              <StatusBadge status={service.status} />
              {service.discount > 0 && (
                <span className="inline-flex items-center rounded-full text-[10px] font-semibold px-2 py-0.5 border"
                  style={{ background: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.25)", color: "#10B981" }}>
                  {discountPct}% off
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground/70 mb-1.5">{service.customerName}</p>

            {/* Metrics row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground/60">
                Rate: <span className="font-semibold text-foreground">{formatCurrency(service.monthlyCharge)}/mo</span>
                {service.discount > 0 && (
                  <span className="ml-1.5 line-through text-muted-foreground/40">{formatCurrency(standardRate)}</span>
                )}
              </span>
              <span className="text-muted-foreground/60">
                Cost: <span className="font-medium text-muted-foreground/80">{formatCurrency(service.monthlyCost)}/mo</span>
              </span>
              <span style={{ color: profit >= 0 ? "#10B981" : "#f43f5e" }}>
                Profit: <span className="font-semibold">{formatCurrency(profit)}/mo</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <div className="flex flex-col items-end mr-1 gap-0.5 text-right">
            <span className="text-[11px] font-semibold" style={{ color: `${CYAN}90` }}>{doneThisYear}/12</span>
            {collectedThisYear > 0 && (
              <span className="text-[11px] font-semibold" style={{ color: "#10B981" }}>{formatCurrency(collectedThisYear)}</span>
            )}
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-cyan-400 hover:bg-cyan-400/10"
            onClick={() => setViewReportsOpen(true)} title="View saved reports">
            <BarChart2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
            onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
            onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
            onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Month grid section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pl-6 border-t border-white/[0.04]" style={{ background: "rgba(0,231,255,0.02)" }}>
              <MonthGrid
                completions={service.completions} year={year} serviceId={service.id}
                endpoint="monthly-website" monthlyCharge={service.monthlyCharge}
                monthlyCost={service.monthlyCost} accentColor={CYAN}
                onCompleted={(y, m) => { setReportYear(y); setReportMonth(m); setReportOpen(true); }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SeoProgressDialog
        open={reportOpen} onOpenChange={setReportOpen}
        customerId={service.customerId} customerName={service.customerName}
        websiteName={service.websiteName} year={reportYear} month={reportMonth}
      />
      <SeoReportsViewDialog
        open={viewReportsOpen} onOpenChange={setViewReportsOpen}
        customerId={service.customerId} customerName={service.customerName}
        websiteName={service.websiteName}
      />
    </motion.div>
  );
}

// ─── Digital service card ─────────────────────────────────────────────────────
function DigitalServiceCard({ service, year, onEdit, onDelete, highlighted, index }: {
  service: MonthlyDigitalService; year: number; onEdit: () => void;
  onDelete: () => void; highlighted?: boolean; index: number;
}) {
  const VIOLET = "#a855f7";
  const cardRef = useRef<HTMLDivElement>(null);
  const [flashActive, setFlashActive] = useState(false);
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [markDoneOpen, setMarkDoneOpen] = useState(false);
  const [markAmount, setMarkAmount] = useState("");
  const [hovered, setHovered] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportYear, setReportYear] = useState(currentYear);
  const [reportMonth, setReportMonth] = useState(currentMonth);
  const [viewReportsOpen, setViewReportsOpen] = useState(false);

  useEffect(() => {
    if (highlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashActive(true);
      const t = setTimeout(() => setFlashActive(false), 2500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [highlighted]);

  const profit = service.monthlyCharge - service.monthlyCost;
  const doneThisYear = service.completions.filter((c) => c.year === year && c.completed).length;
  const collectedThisYear = service.completions
    .filter((c) => c.year === year && c.completed)
    .reduce((sum, c) => sum + c.paidAmount, 0);
  const standardRate = service.monthlyCharge + service.discount;
  const discountPct = service.discount > 0 && standardRate > 0
    ? Math.round((service.discount / standardRate) * 100) : 0;
  const currentMonthDone = service.completions.some(
    (c) => c.year === currentYear && c.month === currentMonth && c.completed,
  );

  const quickMarkMutation = useMutation({
    mutationFn: (paidAmount: number) =>
      apiFetch(`/monthly-digital/${service.id}/completion`, {
        method: "POST",
        body: JSON.stringify({ year: currentYear, month: currentMonth, completed: true, paidAmount }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly-digital"] });
      setMarkDoneOpen(false);
      toast.success(`${MONTHS[currentMonth - 1]} marked as done!`);
      setReportYear(currentYear); setReportMonth(currentMonth); setReportOpen(true);
    },
    onError: () => toast.error("Could not mark done"),
  });

  return (
    <motion.div
      ref={cardRef}
      id={`service-${service.id}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative rounded-2xl border bg-card overflow-hidden transition-all duration-300"
      style={{
        borderColor: flashActive ? "rgba(168,85,247,0.5)" : hovered ? "rgba(168,85,247,0.22)" : "rgba(255,255,255,0.06)",
        boxShadow: flashActive
          ? "0 0 40px rgba(168,85,247,0.2)"
          : hovered
            ? "0 0 32px rgba(168,85,247,0.1), 0 4px 20px rgba(0,0,0,0.3)"
            : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${VIOLET}55, transparent)` }} />

      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-full transition-all duration-300"
        style={{ background: VIOLET, opacity: hovered ? 0.9 : 0.35, boxShadow: hovered ? `0 0 10px ${VIOLET}` : "none" }}
      />

      {/* "Running" quick mark banner */}
      {service.status === "running" && !currentMonthDone && (
        <div className="flex items-center gap-3 px-5 pt-3 pl-6">
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 rounded-lg font-semibold transition-all duration-200"
            style={{ background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)", color: "#38bdf8" }}
            onClick={() => { setMarkAmount(String(service.monthlyCharge)); setMarkDoneOpen(true); }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark {MONTHS[currentMonth - 1]} done
          </Button>
          <span className="text-xs text-muted-foreground/60">Current month in progress</span>
        </div>
      )}
      {service.status === "running" && currentMonthDone && (
        <div className="px-5 pt-3 pl-6">
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> {MONTHS[currentMonth - 1]} already marked done
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-3.5 pb-3 pl-6 gap-3">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          {/* Icon badge */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
            style={{
              background: hovered ? "rgba(168,85,247,0.15)" : "rgba(168,85,247,0.1)",
              border: `1px solid rgba(168,85,247,0.22)`,
              boxShadow: hovered ? "0 0 18px rgba(168,85,247,0.2)" : "none",
            }}
          >
            <Megaphone className="w-5 h-5" style={{ color: VIOLET }} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <p className="font-semibold text-sm text-foreground">{service.serviceName}</p>
              <StatusBadge status={service.status} />
              {service.platform && (
                <span className="inline-flex items-center rounded-full text-[10px] font-semibold px-2 py-0.5 border"
                  style={{ background: "rgba(168,85,247,0.1)", borderColor: "rgba(168,85,247,0.25)", color: VIOLET }}>
                  {service.platform}
                </span>
              )}
              {service.discount > 0 && (
                <span className="inline-flex items-center rounded-full text-[10px] font-semibold px-2 py-0.5 border"
                  style={{ background: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.25)", color: "#10B981" }}>
                  {discountPct}% off
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground/70 mb-1.5">{service.customerName}</p>

            {/* Metrics row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground/60">
                Rate: <span className="font-semibold text-foreground">{formatCurrency(service.monthlyCharge)}/mo</span>
                {service.discount > 0 && (
                  <span className="ml-1.5 line-through text-muted-foreground/40">{formatCurrency(standardRate)}</span>
                )}
              </span>
              <span className="text-muted-foreground/60">
                Cost: <span className="font-medium text-muted-foreground/80">{formatCurrency(service.monthlyCost)}/mo</span>
              </span>
              <span style={{ color: profit >= 0 ? "#10B981" : "#f43f5e" }}>
                Profit: <span className="font-semibold">{formatCurrency(profit)}/mo</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <div className="flex flex-col items-end mr-1 gap-0.5 text-right">
            <span className="text-[11px] font-semibold" style={{ color: `${VIOLET}90` }}>{doneThisYear}/12</span>
            {collectedThisYear > 0 && (
              <span className="text-[11px] font-semibold" style={{ color: "#10B981" }}>{formatCurrency(collectedThisYear)}</span>
            )}
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-violet-400 hover:bg-violet-400/10"
            onClick={() => setViewReportsOpen(true)} title="View saved reports">
            <BarChart2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
            onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
            onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
            onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Month grid section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pl-6 border-t border-white/[0.04]" style={{ background: "rgba(168,85,247,0.02)" }}>
              <MonthGrid
                completions={service.completions} year={year} serviceId={service.id}
                endpoint="monthly-digital" monthlyCharge={service.monthlyCharge}
                monthlyCost={service.monthlyCost} accentColor={VIOLET}
                onCompleted={(y, m) => { setReportYear(y); setReportMonth(m); setReportOpen(true); }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mark done dialog */}
      <Dialog open={markDoneOpen} onOpenChange={(o) => !o && setMarkDoneOpen(false)}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle>Mark {MONTHS[currentMonth - 1]} {currentYear} done</DialogTitle>
            <DialogDescription>Confirm the amount collected for this month.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-2">
              <Label>Amount collected (₹)</Label>
              <Input type="number" inputMode="decimal" value={markAmount}
                onChange={(e) => setMarkAmount(e.target.value)}
                placeholder={String(service.monthlyCharge)} />
              <p className="text-xs text-muted-foreground">Default: ₹{service.monthlyCharge.toLocaleString()}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMarkDoneOpen(false)}>Cancel</Button>
            <Button
              onClick={() => quickMarkMutation.mutate(Number(markAmount) || service.monthlyCharge)}
              disabled={quickMarkMutation.isPending}
              style={{ background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)", color: "#38bdf8" }}
            >
              {quickMarkMutation.isPending ? "Saving..." : "Confirm Done"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DMProgressDialog
        open={reportOpen} onOpenChange={setReportOpen}
        customerId={service.customerId} customerName={service.customerName}
        serviceName={service.serviceName} year={reportYear} month={reportMonth}
      />
      <DMReportsViewDialog
        open={viewReportsOpen} onOpenChange={setViewReportsOpen}
        customerId={service.customerId} customerName={service.customerName}
        serviceName={service.serviceName}
      />
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ label, onAdd, accentColor, icon: Icon }: {
  label: string; onAdd: () => void; accentColor: string; icon: React.ElementType;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-2xl border border-dashed py-16 text-center overflow-hidden"
      style={{ borderColor: `${accentColor}25`, background: `${accentColor}04` }}
    >
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}30, transparent)` }} />
      <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
        style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}25` }}>
        <Icon className="w-7 h-7" style={{ color: `${accentColor}80` }} />
      </div>
      <p className="text-sm font-medium text-muted-foreground/70 mb-1">No {label} yet</p>
      <p className="text-xs text-muted-foreground/40 mb-5">Add your first service to start tracking</p>
      <Button
        size="sm"
        className="gap-2 rounded-xl font-semibold"
        style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30`, color: accentColor }}
        onClick={onAdd}
      >
        <Plus className="w-4 h-4" />
        Add {label}
      </Button>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MonthlyServices() {
  const qc = useQueryClient();
  const [year, setYear] = useState(currentYear);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tabValue, setTabValue] = useState("website");
  const [highlightId, setHighlightId] = useState<number | null>(null);

  const [webDialogOpen, setWebDialogOpen] = useState(false);
  const [digitalDialogOpen, setDigitalDialogOpen] = useState(false);
  const [editingWeb, setEditingWeb] = useState<MonthlyWebsiteService | undefined>();
  const [editingDigital, setEditingDigital] = useState<MonthlyDigitalService | undefined>();
  const [deleteId, setDeleteId] = useState<{ id: number; type: "web" | "digital" } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const highlight = params.get("highlight");
    const tab = params.get("tab") ?? params.get("type");
    if (highlight) setHighlightId(Number(highlight));
    if (tab === "digital") setTabValue("digital");
  }, []);

  const { data: webServices = [], isLoading: webLoading } = useQuery<MonthlyWebsiteService[]>({
    queryKey: ["monthly-website"],
    queryFn: () => apiFetch("/monthly-website"),
  });

  const { data: digitalServices = [], isLoading: digitalLoading } = useQuery<MonthlyDigitalService[]>({
    queryKey: ["monthly-digital"],
    queryFn: () => apiFetch("/monthly-digital"),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: "web" | "digital" }) =>
      apiFetch(`/${type === "web" ? "monthly-website" : "monthly-digital"}/${id}`, { method: "DELETE" }),
    onSuccess: (_, { type }) => {
      qc.invalidateQueries({ queryKey: [type === "web" ? "monthly-website" : "monthly-digital"] });
      toast.success("Deleted");
      setDeleteId(null);
    },
    onError: () => toast.error("Could not delete"),
  });

  const filteredWeb = useMemo(
    () => statusFilter === "all" ? webServices : webServices.filter((s) => s.status === statusFilter),
    [webServices, statusFilter],
  );

  const filteredDigital = useMemo(
    () => statusFilter === "all" ? digitalServices : digitalServices.filter((s) => s.status === statusFilter),
    [digitalServices, statusFilter],
  );

  const webActiveRevenue = webServices.filter((s) => s.status === "active").reduce((sum, s) => sum + s.monthlyCharge, 0);
  const digitalActiveRevenue = digitalServices.filter((s) => s.status === "active" || s.status === "running").reduce((sum, s) => sum + s.monthlyCharge, 0);
  const webCollectedThisYear = webServices.flatMap((s) => s.completions).filter((c) => c.year === year && c.completed).reduce((sum, c) => sum + c.paidAmount, 0);
  const digitalCollectedThisYear = digitalServices.flatMap((s) => s.completions).filter((c) => c.year === year && c.completed).reduce((sum, c) => sum + c.paidAmount, 0);
  const totalMRR = webActiveRevenue + digitalActiveRevenue;
  const totalCollected = webCollectedThisYear + digitalCollectedThisYear;

  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i);

  const CYAN = "#00E7FF";
  const VIOLET = "#a855f7";
  const EMERALD = "#10B981";

  return (
    <div className="space-y-7">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-start justify-between flex-wrap gap-4"
      >
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(0,231,255,0.2), rgba(168,85,247,0.2))", border: "1px solid rgba(255,255,255,0.1)" }}>
              <Layers className="w-4 h-4" style={{ color: CYAN }} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              Monthly Services
            </h1>
          </div>
          <p className="text-sm text-muted-foreground/60 ml-0.5">
            Track recurring website management and digital marketing services
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9 rounded-xl border-white/[0.08] bg-white/[0.03] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[90px] h-9 rounded-xl border-white/[0.08] bg-white/[0.03] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard index={0} label="Web clients" value={String(webServices.filter((s) => s.status === "active").length)}
          sub="active" icon={Globe} color={CYAN} />
        <StatCard index={1} label="Web MRR" value={formatCurrency(webActiveRevenue)}
          sub="monthly recurring" icon={DollarSign} color={CYAN} />
        <StatCard index={2} label={`Web ${year}`} value={formatCurrency(webCollectedThisYear)}
          sub="collected this year" icon={Wallet} color={EMERALD} />
        <StatCard index={3} label="DM clients" value={String(digitalServices.filter((s) => s.status === "active" || s.status === "running").length)}
          sub="active / running" icon={Megaphone} color={VIOLET} />
        <StatCard index={4} label="DM MRR" value={formatCurrency(digitalActiveRevenue)}
          sub="monthly recurring" icon={TrendingUp} color={VIOLET} />
        <StatCard index={5} label={`DM ${year}`} value={formatCurrency(digitalCollectedThisYear)}
          sub="collected this year" icon={Activity} color={EMERALD} />
      </div>

      {/* ── Combined MRR banner ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl border border-white/[0.06] overflow-hidden px-6 py-4"
        style={{ background: "linear-gradient(135deg, rgba(0,231,255,0.04), rgba(168,85,247,0.06))" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0,231,255,0.4), rgba(168,85,247,0.4), transparent)" }} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(0,231,255,0.15), rgba(168,85,247,0.15))", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Sparkles className="w-4 h-4" style={{ color: CYAN }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Total Monthly Recurring Revenue</p>
              <p className="text-2xl font-bold tabular-nums" style={{ background: "linear-gradient(90deg, #00E7FF, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {formatCurrency(totalMRR)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Collected in {year}</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: EMERALD }}>{formatCurrency(totalCollected)}</p>
          </div>
        </div>
      </motion.div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs value={tabValue} onValueChange={setTabValue}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-1 gap-1">
            <TabsTrigger
              value="website"
              className="rounded-lg px-4 gap-2 text-sm data-[state=active]:shadow-none transition-all duration-200"
              style={{}}
            >
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: "rgba(0,231,255,0.12)" }}>
                <Globe className="w-3 h-3" style={{ color: CYAN }} />
              </div>
              Website
              <span className="ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(0,231,255,0.12)", color: CYAN }}>
                {filteredWeb.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="digital"
              className="rounded-lg px-4 gap-2 text-sm data-[state=active]:shadow-none transition-all duration-200"
            >
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: "rgba(168,85,247,0.12)" }}>
                <Megaphone className="w-3 h-3" style={{ color: VIOLET }} />
              </div>
              Digital Marketing
              <span className="ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(168,85,247,0.12)", color: VIOLET }}>
                {filteredDigital.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Tab-specific add button */}
          <AnimatePresence mode="wait">
            {tabValue === "website" ? (
              <motion.div key="add-web" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                <Button
                  onClick={() => { setEditingWeb(undefined); setWebDialogOpen(true); }}
                  className="gap-2 rounded-xl h-9 font-semibold text-sm transition-all duration-200"
                  style={{ background: "rgba(0,231,255,0.12)", border: "1px solid rgba(0,231,255,0.25)", color: CYAN }}
                >
                  <Plus className="w-4 h-4" />
                  Add Website Service
                </Button>
              </motion.div>
            ) : (
              <motion.div key="add-dig" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                <Button
                  onClick={() => { setEditingDigital(undefined); setDigitalDialogOpen(true); }}
                  className="gap-2 rounded-xl h-9 font-semibold text-sm transition-all duration-200"
                  style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)", color: VIOLET }}
                >
                  <Plus className="w-4 h-4" />
                  Add Digital Service
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Website tab */}
        <TabsContent value="website" className="space-y-3 mt-5">
          {webLoading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/[0.06] bg-card h-24 animate-pulse" />
              ))}
            </div>
          )}
          {!webLoading && filteredWeb.length === 0 && (
            <EmptyState label="website services" icon={Globe} accentColor={CYAN}
              onAdd={() => { setEditingWeb(undefined); setWebDialogOpen(true); }} />
          )}
          <AnimatePresence>
            {filteredWeb.map((s, i) => (
              <WebsiteServiceCard
                key={s.id} service={s} year={year} index={i}
                highlighted={highlightId === s.id}
                onEdit={() => { setEditingWeb(s); setWebDialogOpen(true); }}
                onDelete={() => setDeleteId({ id: s.id, type: "web" })}
              />
            ))}
          </AnimatePresence>
        </TabsContent>

        {/* Digital tab */}
        <TabsContent value="digital" className="space-y-3 mt-5">
          {digitalLoading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/[0.06] bg-card h-24 animate-pulse" />
              ))}
            </div>
          )}
          {!digitalLoading && filteredDigital.length === 0 && (
            <EmptyState label="digital services" icon={Megaphone} accentColor={VIOLET}
              onAdd={() => { setEditingDigital(undefined); setDigitalDialogOpen(true); }} />
          )}
          <AnimatePresence>
            {filteredDigital.map((s, i) => (
              <DigitalServiceCard
                key={s.id} service={s} year={year} index={i}
                highlighted={highlightId === s.id}
                onEdit={() => { setEditingDigital(s); setDigitalDialogOpen(true); }}
                onDelete={() => setDeleteId({ id: s.id, type: "digital" })}
              />
            ))}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <WebsiteServiceDialog
        open={webDialogOpen} onOpenChange={setWebDialogOpen} editing={editingWeb}
        onSaved={() => qc.invalidateQueries({ queryKey: ["monthly-website"] })}
      />
      <DigitalServiceDialog
        open={digitalDialogOpen} onOpenChange={setDigitalDialogOpen} editing={editingDigital}
        onSaved={() => qc.invalidateQueries({ queryKey: ["monthly-digital"] })}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the service and all its completion records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
