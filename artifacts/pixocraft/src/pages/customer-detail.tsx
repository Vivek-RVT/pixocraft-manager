import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListServices, getListServicesQueryKey, useUpdateService, type Service } from "@workspace/api-client-react";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Plus,
  Briefcase,
  Globe,
  Megaphone,
  CheckCircle2,
  Circle,
  CalendarDays,
  LayoutDashboard,
  Key,
  PowerOff,
  Power,
  Copy,
  ExternalLink,
  Layers,
  Trash2,
  ChevronDown,
  ChevronUp,
  Info,
  Activity,
  FileText,
  TrendingUp,
  Clock,
  Zap,
  Building2,
} from "lucide-react";
import { motion } from "framer-motion";
import { getYear, getMonth } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerFormDialog } from "@/components/customer-form-dialog";
import { ServiceFormDialog } from "@/components/service-form-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const BASE_PATH = import.meta.env.BASE_URL ?? "/";

async function apiFetch(path: string, opts?: RequestInit) {
  const base = BASE_PATH.endsWith("/") ? BASE_PATH.slice(0, -1) : BASE_PATH;
  const res = await fetch(`${base}/api${path}`, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const currentYear = getYear(new Date());
const currentMonth = getMonth(new Date()) + 1;

const STAGES = ["pending", "started", "mid-start", "mid-complete", "final-review", "completed"] as const;
const STAGE_LABELS: Record<string, string> = {
  pending: "Pending",
  started: "Started",
  "mid-start": "Mid Start",
  "mid-complete": "Mid Complete",
  "final-review": "Final Review",
  completed: "Completed",
};
const STAGE_COLORS: Record<string, string> = {
  pending: "bg-slate-500",
  started: "bg-amber-500",
  "mid-start": "bg-orange-500",
  "mid-complete": "bg-blue-500",
  "final-review": "bg-violet-500",
  completed: "bg-emerald-600",
};

type MonthlyCompletion = {
  id: number;
  serviceId: number;
  year: number;
  month: number;
  completed: boolean;
  paidAmount: number;
};

type MonthlyWebService = {
  id: number;
  websiteName: string;
  monthlyCost: number;
  monthlyCharge: number;
  discount: number;
  startDate: string;
  status: string;
  completions: MonthlyCompletion[];
};

type MonthlyDigitalService = {
  id: number;
  serviceName: string;
  platform: string | null;
  monthlyCost: number;
  monthlyCharge: number;
  discount: number;
  startDate: string;
  status: string;
  notes: string | null;
  completions: MonthlyCompletion[];
};

type ClientPortal = {
  id: number;
  customerId: number;
  isActive: boolean;
  createdAt: string;
};

type ServiceProject = {
  id: number;
  customerId: number;
  projectType: string;
  projectName: string;
  stage: string;
  progress: number;
  completedNotes: string | null;
  pendingNotes: string | null;
  liveUrl: string | null;
  expectedDelivery: string | null;
};

type DMReport = {
  id: number;
  year: number;
  month: number;
  platforms: string | null;
  plan: string | null;
  targetVideos: number;
  targetPosts: number;
  targetReels: number;
  targetStories: number;
  uploadedVideos: number;
  uploadedPosts: number;
  uploadedReels: number;
  uploadedStories: number;
  followersGained: number;
  engagementGrowth: string | null;
  leadsGenerated: number;
  adSpend: string;
  summaryNotes: string | null;
};

type SeoReport = {
  id: number;
  year: number;
  month: number;
  blogsPosted: number;
  keywordsRanked: number;
  trafficGrowth: string | null;
  backlinksAdded: number;
  seoScore: number | null;
  notes: string | null;
};

type DMFormData = {
  year: string; month: string; platforms: string; plan: string;
  targetVideos: string; targetPosts: string; targetReels: string; targetStories: string;
  uploadedVideos: string; uploadedPosts: string; uploadedReels: string; uploadedStories: string;
  followersGained: string; engagementGrowth: string; leadsGenerated: string;
  adSpend: string; summaryNotes: string;
};

type SeoFormData = {
  year: string; month: string; blogsPosted: string; keywordsRanked: string;
  trafficGrowth: string; backlinksAdded: string; seoScore: string; notes: string;
};

type CustomerTab = "overview" | "digital" | "web" | "monthly";

function MiniMonthGrid({ completions }: { completions: MonthlyCompletion[] }) {
  const map = new Map<number, boolean>();
  for (const c of completions) {
    if (c.year === currentYear) map.set(c.month, c.completed);
  }
  return (
    <div className="grid grid-cols-12 gap-0.5 mt-2">
      {MONTHS.map((m, i) => {
        const monthNum = i + 1;
        const done = map.get(monthNum) ?? false;
        const isFuture = monthNum > currentMonth;
        return (
          <div
            key={m}
            title={`${m}: ${done ? "Done" : isFuture ? "Future" : "Pending"}`}
            className={cn(
              "flex flex-col items-center rounded py-1 text-[9px] font-medium gap-0.5",
              isFuture ? "opacity-25" : done ? "text-emerald-700" : "text-muted-foreground",
            )}
          >
            <span>{m}</span>
            {done ? (
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
            ) : (
              <Circle className="w-2.5 h-2.5 text-muted-foreground/40" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ServiceDetailCard({ project }: { project: ServiceProject }) {
  const stageOrder = STAGES.indexOf(project.stage as typeof STAGES[number]);
  const progress = project.progress > 0 ? project.progress : (stageOrder >= 0 ? Math.round(((stageOrder + 1) / STAGES.length) * 100) : 0);
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-foreground">{project.projectName}</div>
          <div className="text-xs text-muted-foreground capitalize">{project.projectType === "webapp" ? "Web App" : "Website"}</div>
        </div>
        <Badge variant="outline" className={cn("text-xs text-white border-transparent", STAGE_COLORS[project.stage])}>
          {STAGE_LABELS[project.stage] ?? project.stage}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-muted/30 p-3">
          <div className="text-muted-foreground mb-0.5">Progress</div>
          <div className="font-semibold text-foreground">{progress}%</div>
        </div>
        <div className="rounded-xl bg-muted/30 p-3">
          <div className="text-muted-foreground mb-0.5">Expected delivery</div>
          <div className="font-semibold text-foreground">{project.expectedDelivery ? formatDate(project.expectedDelivery) : "—"}</div>
        </div>
        <div className="rounded-xl bg-muted/30 p-3">
          <div className="text-muted-foreground mb-0.5">Live URL</div>
          <div className="font-semibold text-cyan-400 truncate">{project.liveUrl || "—"}</div>
        </div>
        <div className="rounded-xl bg-muted/30 p-3">
          <div className="text-muted-foreground mb-0.5">Stage</div>
          <div className="font-semibold text-foreground capitalize">{project.stage.replace("-", " ")}</div>
        </div>
      </div>
      <div className="grid gap-2 text-xs">
        <div className="rounded-xl border border-white/[0.06] bg-muted/20 p-3">
          <div className="text-muted-foreground mb-1">Completed</div>
          <div className="text-foreground whitespace-pre-wrap">{project.completedNotes || "—"}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-muted/20 p-3">
          <div className="text-muted-foreground mb-1">Pending</div>
          <div className="text-foreground whitespace-pre-wrap">{project.pendingNotes || "—"}</div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium transition-all",
        active
          ? "bg-gradient-to-r from-cyan-500/20 to-violet-600/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,231,255,0.08)]"
          : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/[0.05] border border-transparent",
      )}
    >
      {children}
    </button>
  );
}

const paymentBadge = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "partial":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    default:
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
  }
};

type ProjectFormData = {
  projectType: string;
  projectName: string;
  stage: string;
  progress: string;
  completedNotes: string;
  pendingNotes: string;
  liveUrl: string;
  expectedDelivery: string;
};

const emptyProjectForm: ProjectFormData = {
  projectType: "website",
  projectName: "",
  stage: "planning",
  progress: "0",
  completedNotes: "",
  pendingNotes: "",
  liveUrl: "",
  expectedDelivery: "",
};

function ProjectFormDialog({
  open,
  onOpenChange,
  customerId,
  project,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customerId: number;
  project?: ServiceProject;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProjectFormData>(
    project
      ? {
          projectType: project.projectType,
          projectName: project.projectName,
          stage: project.stage,
          progress: String(project.progress),
          completedNotes: project.completedNotes ?? "",
          pendingNotes: project.pendingNotes ?? "",
          liveUrl: project.liveUrl ?? "",
          expectedDelivery: project.expectedDelivery ?? "",
        }
      : emptyProjectForm,
  );

  const save = useMutation({
    mutationFn: () =>
      apiFetch(
        project ? `/admin/projects/${project.id}` : `/admin/projects/${customerId}`,
        {
          method: project ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", customerId] });
      onOpenChange(false);
      toast.success(project ? "Project updated" : "Project added");
    },
    onError: () => toast.error("Failed to save project"),
  });

  function set(k: keyof ProjectFormData, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "Add Project"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.projectType} onValueChange={(v) => set("projectType", v)}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="webapp">Web App</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Stage</Label>
              <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Project Name</Label>
            <Input
              className="mt-1 h-9"
              value={form.projectName}
              onChange={(e) => set("projectName", e.target.value)}
              placeholder="e.g. YuvaLab Business Website"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Progress %</Label>
              <Input
                className="mt-1 h-9"
                type="number"
                min={0}
                max={100}
                value={form.progress}
                onChange={(e) => set("progress", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Expected Delivery</Label>
              <Input
                className="mt-1 h-9"
                type="date"
                value={form.expectedDelivery}
                onChange={(e) => set("expectedDelivery", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Live URL (optional)</Label>
            <Input
              className="mt-1 h-9"
              value={form.liveUrl}
              onChange={(e) => set("liveUrl", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label className="text-xs">Completed Work</Label>
            <Textarea
              className="mt-1 min-h-[70px] resize-none"
              value={form.completedNotes}
              onChange={(e) => set("completedNotes", e.target.value)}
              placeholder="What has been done so far..."
            />
          </div>
          <div>
            <Label className="text-xs">Pending Work</Label>
            <Textarea
              className="mt-1 min-h-[70px] resize-none"
              value={form.pendingNotes}
              onChange={(e) => set("pendingNotes", e.target.value)}
              placeholder="What still needs to be done..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!form.projectName || save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomerDetail() {
  const [, params] = useRoute("/customers/:id");
  const id = Number(params?.id);
  const qc = useQueryClient();
  const validId = Number.isFinite(id) && id > 0;
  const [editOpen, setEditOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [editService, setEditService] = useState<any>(undefined);
  const [pwDialog, setPwDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [projectDialog, setProjectDialog] = useState(false);
  const [editProject, setEditProject] = useState<ServiceProject | undefined>();
  const [showReports, setShowReports] = useState(false);
  const [dmDialog, setDmDialog] = useState(false);
  const [seoDialog, setSeoDialog] = useState(false);
  const [editDm, setEditDm] = useState<DMReport | undefined>();
  const [editSeo, setEditSeo] = useState<SeoReport | undefined>();
  const [dsEditId, setDsEditId] = useState<string | null>(null);
  const [dsEditStatus, setDsEditStatus] = useState("");
  const [dsEditNote, setDsEditNote] = useState("");
  const [dsEditName, setDsEditName] = useState("");
  const [dsEditCategory, setDsEditCategory] = useState("");
  const [activityOpenId, setActivityOpenId] = useState<string | null>(null);

  const blankDm = (): DMFormData => ({
    year: String(currentYear), month: String(currentMonth), platforms: "", plan: "",
    targetVideos: "0", targetPosts: "0", targetReels: "0", targetStories: "0",
    uploadedVideos: "0", uploadedPosts: "0", uploadedReels: "0", uploadedStories: "0",
    followersGained: "0", engagementGrowth: "", leadsGenerated: "0", adSpend: "0", summaryNotes: "",
  });
  const blankSeo = (): SeoFormData => ({
    year: String(currentYear), month: String(currentMonth),
    blogsPosted: "0", keywordsRanked: "0", trafficGrowth: "", backlinksAdded: "0",
    seoScore: "", notes: "",
  });

  const [dmForm, setDmForm] = useState<DMFormData>(blankDm);
  const [seoForm, setSeoForm] = useState<SeoFormData>(blankSeo);

  const { data: detail, isLoading, isError } = useQuery({
    queryKey: ["customer-detail", id],
    queryFn: () => apiFetch(`/customers/${id}`),
    enabled: validId,
  });
  const customer = detail?.customer;

  const { data: services = [] } = useListServices(
    { customerId: id },
    {
      query: {
        queryKey: getListServicesQueryKey({ customerId: id }),
        enabled: validId,
      },
    },
  );

  const { data: webServices = [] } = useQuery<MonthlyWebService[]>({
    queryKey: ["monthly-website", id],
    queryFn: () => apiFetch(`/monthly-website?customerId=${id}`),
    enabled: validId,
  });

  const { data: digitalServices = [] } = useQuery<MonthlyDigitalService[]>({
    queryKey: ["monthly-digital", id],
    queryFn: () => apiFetch(`/monthly-digital?customerId=${id}`),
    enabled: validId,
  });
  const digitalServiceCards = useMemo<Array<{
    id: string;
    rawId: number;
    serviceName: string;
    serviceType: "web" | "digital";
    status: string;
    billingType: "monthly" | "one_time";
    startDate: string;
    charge: number;
    cost: number;
    discount: number;
    platform: string | null;
    notes: string | null;
    completions: MonthlyCompletion[];
  }>>(() => {
    const monthly = digitalServices.map((ds): {
      id: string;
      rawId: number;
      serviceName: string;
      serviceType: "digital";
      status: string;
      billingType: "monthly";
      startDate: string;
      charge: number;
      cost: number;
      discount: number;
      platform: string | null;
      notes: string | null;
      completions: MonthlyCompletion[];
    } => ({
      id: `monthly-${ds.id}`,
      rawId: ds.id,
      serviceName: ds.serviceName,
      serviceType: "digital" as const,
      status: ds.status,
      billingType: "monthly" as const,
      startDate: ds.startDate,
      charge: ds.monthlyCharge,
      cost: ds.monthlyCost,
      discount: ds.discount ?? 0,
      platform: ds.platform,
      notes: ds.notes ?? null,
      completions: ds.completions ?? [],
    }));
    const oneTime = (services ?? [])
      .filter((s: any) => s.serviceType === "digital")
      .map((s): {
        id: string;
        rawId: number;
        serviceName: string;
        serviceType: "web" | "digital";
        status: string;
        billingType: "one_time";
        startDate: string;
        charge: number;
        cost: number;
        discount: number;
        platform: string | null;
        notes: string | null;
        completions: MonthlyCompletion[];
      } => ({
        id: `one-time-${s.id}`,
        rawId: s.id as number,
        serviceName: s.serviceName,
        serviceType: (s.serviceType === "web" ? "web" : "digital") as "web" | "digital",
        status:
          s.deliveryStatus === "delivered"
            ? "delivered"
            : s.deliveryStatus === "in_progress"
              ? "active"
              : "paused",
        billingType: "one_time" as const,
        startDate: s.date,
        charge: Number(s.priceSold),
        cost: Number(s.costPrice),
        discount: 0,
        platform: "Digital service",
        notes: (s as any).notes ?? null,
        completions: [],
      }));
    return [...monthly, ...oneTime].sort((a, b) => +new Date(b.startDate) - +new Date(a.startDate));
  }, [digitalServices, services]);
  const digitalStages = [
    { value: "pending", label: "Pending" },
    { value: "started", label: "Started" },
    { value: "running", label: "Running" },
    { value: "paused", label: "Paused" },
    { value: "ended", label: "Ended" },
  ] as const;

  function getDigitalStageIndex(status: string) {
    if (status === "ended") return 4;
    if (status === "paused") return 3;
    if (status === "running") return 2;
    if (status === "started") return 1;
    return 0;
  }

  function dsStatusLabel(status: string): string {
    if (status === "active") return "Running";
    if (status === "paused") return "Paused";
    if (status === "cancelled") return "Ended";
    if (status === "delivered") return "Delivered";
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  function dsStageToDB(editStage: string): "active" | "paused" | "cancelled" {
    if (editStage === "started" || editStage === "running") return "active";
    if (editStage === "ended") return "cancelled";
    return "paused";
  }

  function dsProgress(status: string): number {
    if (status === "delivered" || status === "cancelled" || status === "ended") return 100;
    if (status === "active" || status === "running") return 70;
    if (status === "paused") return 45;
    if (status === "started") return 30;
    return 10;
  }

  function dsProgressColor(status: string): string {
    if (status === "delivered") return "bg-blue-500";
    if (status === "cancelled" || status === "ended") return "bg-slate-400";
    if (status === "active" || status === "running") return "bg-emerald-500";
    if (status === "paused") return "bg-amber-500";
    return "bg-purple-400";
  }

  function activityStatusLabel(s: string | null): string {
    if (!s) return "—";
    if (s === "active") return "Running";
    if (s === "cancelled") return "Ended";
    if (s === "in_progress") return "In Progress";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  const activityEntityType = activityOpenId?.startsWith("monthly-") ? "monthly_digital" : "service";
  const activityEntityId = activityOpenId
    ? Number(activityOpenId.replace("monthly-", "").replace("one-time-", ""))
    : null;

  const { data: activityLog = [], isFetching: activityLoading } = useQuery<{
    id: number; entityType: string; entityId: number;
    fromStatus: string | null; toStatus: string | null;
    note: string | null; createdAt: string;
  }[]>({
    queryKey: ["service-activity", activityEntityType, activityEntityId],
    queryFn: () => apiFetch(`/service-activity?entityType=${activityEntityType}&entityId=${activityEntityId}`),
    enabled: activityOpenId !== null && activityEntityId !== null,
  });

  function dsDBToEditStage(status: string): string {
    if (status === "active") return "running";
    if (status === "cancelled") return "ended";
    return "paused";
  }

  const { data: portal } = useQuery<ClientPortal | null>({
    queryKey: ["portal", id],
    queryFn: () => apiFetch(`/admin/portal/${id}`),
    enabled: validId,
  });

  const { data: projects = [] } = useQuery<ServiceProject[]>({
    queryKey: ["projects", id],
    queryFn: () => apiFetch(`/admin/projects/${id}`),
    enabled: validId,
  });

  const { data: dmReports = [] } = useQuery<DMReport[]>({
    queryKey: ["dm-reports", id],
    queryFn: () => apiFetch(`/admin/dm-reports/${id}`),
    enabled: Number.isFinite(id),
  });

  const { data: seoReports = [] } = useQuery<SeoReport[]>({
    queryKey: ["seo-reports", id],
    queryFn: () => apiFetch(`/admin/seo-reports/${id}`),
    enabled: Number.isFinite(id),
  });

  const activatePortal = useMutation({
    mutationFn: () =>
      apiFetch(`/admin/portal/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", id] });
      setPwDialog(false);
      setNewPassword("");
      toast.success("Client portal activated");
    },
    onError: () => toast.error("Failed to activate portal"),
  });

  const togglePortal = useMutation({
    mutationFn: (isActive: boolean) =>
      apiFetch(`/admin/portal/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", id] });
      toast.success("Portal status updated");
    },
  });

  const deleteProject = useMutation({
    mutationFn: (projectId: number) =>
      apiFetch(`/admin/projects/${projectId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", id] });
      toast.success("Project removed");
    },
  });

  const updateService = useUpdateService();

  const updateMonthlyDigital = useMutation({
    mutationFn: ({ rawId, status, notes }: { rawId: number; status: string; notes: string }) =>
      apiFetch(`/monthly-digital/${rawId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: notes || null }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly-digital", id] });
      qc.invalidateQueries({ queryKey: getListServicesQueryKey({ customerId: id }) });
      setDsEditId(null);
      toast.success("Service updated");
    },
    onError: () => toast.error("Failed to update service"),
  });

  const updateOneTimeService = useMutation({
    mutationFn: ({ rawId, status, notes }: { rawId: number; status: string; notes: string }) => {
      const deliveryStatus = status === "delivered" ? "delivered" : "in_progress";
      return apiFetch(`/services/${rawId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryStatus, notes: notes || null }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getListServicesQueryKey({ customerId: id }) });
      qc.invalidateQueries({ queryKey: ["monthly-digital", id] });
      setDsEditId(null);
      toast.success("Service updated");
    },
    onError: () => toast.error("Failed to update service"),
  });

  function openDsEdit(ds: {
    id: string;
    rawId: number;
    status: string;
    notes: string | null;
    serviceName?: string;
    serviceType?: "web" | "digital" | "other";
    platform?: string | null;
    billingType?: "monthly" | "one_time";
    priceSold?: number;
    cost?: number;
    charge?: number;
    amountPaid?: number;
    date?: string;
  }) {
    setEditService({
      id: ds.rawId,
      customerId: id,
      serviceType: ds.serviceType ?? (ds.platform?.toLowerCase().includes("web") ? "web" : "digital"),
      serviceName: ds.serviceName ?? "",
      priceSold: ds.priceSold ?? ds.charge ?? 0,
      costPrice: ds.cost ?? 0,
      amountPaid: ds.amountPaid ?? 0,
      paymentStatus: "pending",
      deliveryStatus: ds.status === "delivered" ? "delivered" : "in_progress",
      satisfactionRating: null,
      date: ds.date ?? new Date().toISOString().slice(0, 10),
      notes: ds.notes ?? "",
      customerName: customer?.name ?? "",
      profit: 0,
    });
    setServiceOpen(true);
  }

  function saveDsEdit(ds: { rawId: number; billingType: "monthly" | "one_time" }) {
    if (ds.billingType === "monthly") {
      updateMonthlyDigital.mutate({
        rawId: ds.rawId,
        status: dsStageToDB(dsEditStatus),
        notes: dsEditNote,
      });
    } else {
      const oneTimeStatus = dsEditStatus === "ended" ? "delivered" : "in_progress";
      updateOneTimeService.mutate({
        rawId: ds.rawId,
        status: oneTimeStatus,
        notes: dsEditNote,
      });
    }
  }

  const saveDmReport = useMutation({
    mutationFn: (data: DMFormData) =>
      apiFetch(`/admin/dm-reports/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: Number(data.year), month: Number(data.month),
          platforms: data.platforms || null, plan: data.plan || null,
          targetVideos: Number(data.targetVideos), targetPosts: Number(data.targetPosts),
          targetReels: Number(data.targetReels), targetStories: Number(data.targetStories),
          uploadedVideos: Number(data.uploadedVideos), uploadedPosts: Number(data.uploadedPosts),
          uploadedReels: Number(data.uploadedReels), uploadedStories: Number(data.uploadedStories),
          followersGained: Number(data.followersGained), engagementGrowth: data.engagementGrowth || null,
          leadsGenerated: Number(data.leadsGenerated), adSpend: data.adSpend || "0",
          summaryNotes: data.summaryNotes || null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dm-reports", id] });
      qc.invalidateQueries({ queryKey: ["client-dashboard"] });
      setDmDialog(false);
      toast.success("DM report saved");
    },
    onError: () => toast.error("Failed to save report"),
  });

  const saveSeoReport = useMutation({
    mutationFn: (data: SeoFormData) =>
      apiFetch(`/admin/seo-reports/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: Number(data.year), month: Number(data.month),
          blogsPosted: Number(data.blogsPosted), keywordsRanked: Number(data.keywordsRanked),
          trafficGrowth: data.trafficGrowth || null, backlinksAdded: Number(data.backlinksAdded),
          seoScore: data.seoScore ? Number(data.seoScore) : null,
          notes: data.notes || null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seo-reports", id] });
      qc.invalidateQueries({ queryKey: ["client-dashboard"] });
      setSeoDialog(false);
      toast.success("SEO report saved");
    },
    onError: () => toast.error("Failed to save report"),
  });

  const totals = useMemo(() => {
    const base = (services ?? []).reduce(
      (acc, s) => {
        acc.revenue += Number(s.priceSold);
        acc.profit += Number(s.profit ?? 0);
        acc.paid += Number(s.amountPaid ?? 0);
        acc.pending += Number(s.priceSold) - Number(s.amountPaid ?? 0);
        return acc;
      },
      { revenue: 0, profit: 0, paid: 0, pending: 0 },
    );
    for (const ws of webServices) {
      for (const c of ws.completions) {
        if (c.completed) {
          base.revenue += Number(c.paidAmount);
          base.profit += Number(c.paidAmount) - Number(ws.monthlyCost);
          base.paid += Number(c.paidAmount);
        }
      }
    }
    for (const ds of digitalServices) {
      for (const c of ds.completions) {
        if (c.completed) {
          base.revenue += Number(c.paidAmount);
          base.profit += Number(c.paidAmount) - Number(ds.monthlyCost);
          base.paid += Number(c.paidAmount);
        }
      }
    }
    return base;
  }, [services, webServices, digitalServices]);

  const webMRR = webServices
    .filter((s) => s.status === "active")
    .reduce((acc, s) => acc + s.monthlyCharge, 0);
  const digitalMRR = digitalServices
    .filter((s) => s.status === "active")
    .reduce((acc, s) => acc + s.monthlyCharge, 0);

  const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const portalLink = `${window.location.origin}${BASE}/portal`;
  const [customerTab, setCustomerTab] = useState<CustomerTab>("overview");
  const [infoOpen, setInfoOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  if (!validId || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Customer detail unavailable.</p>
        <Link href="/customers">
          <Button variant="ghost" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to customers
          </Button>
        </Link>
      </div>
    );
  }

  type ActivityEvent = {
    dateStr: string;
    label: string;
    sublabel?: string;
    kind: "service" | "delivery" | "report" | "project";
    category: "digital" | "web" | "monthly-digital" | "monthly-web";
  };
  const activityEvents: ActivityEvent[] = [];
  for (const s of (services ?? [])) {
    activityEvents.push({
      dateStr: s.date ?? "",
      label: s.serviceName,
      sublabel: `${s.serviceType === "web" ? "Web" : s.serviceType === "digital" ? "Digital" : "Other"} · ${formatCurrency(s.priceSold)} · ${s.deliveryStatus}`,
      kind: "service",
      category: s.serviceType === "web" ? "web" : "digital",
    });
  }
  for (const ws of webServices) {
    for (const c of ws.completions) {
      if (c.completed) {
        activityEvents.push({
          dateStr: `${c.year}-${String(c.month).padStart(2, "0")}-01`,
          label: `${ws.websiteName} — ${MONTHS[c.month - 1]} ${c.year}`,
          sublabel: `Website maintenance delivered · ${formatCurrency(c.paidAmount)}`,
          kind: "delivery",
          category: "monthly-web",
        });
      }
    }
  }
  for (const ds of digitalServices) {
    for (const c of ds.completions) {
      if (c.completed) {
        activityEvents.push({
          dateStr: `${c.year}-${String(c.month).padStart(2, "0")}-01`,
          label: `${ds.serviceName} — ${MONTHS[c.month - 1]} ${c.year}`,
          sublabel: `Digital service delivered · ${formatCurrency(c.paidAmount)}`,
          kind: "delivery",
          category: "monthly-digital",
        });
      }
    }
  }
  for (const r of dmReports) {
    activityEvents.push({
      dateStr: `${r.year}-${String(r.month).padStart(2, "0")}-01`,
      label: `DM Report — ${MONTHS[r.month - 1]} ${r.year}`,
      sublabel: r.platforms ? `${r.platforms}${r.followersGained ? ` · +${r.followersGained} followers` : ""}` : undefined,
      kind: "report",
      category: "monthly-digital",
    });
  }
  for (const r of seoReports) {
    activityEvents.push({
      dateStr: `${r.year}-${String(r.month).padStart(2, "0")}-01`,
      label: `SEO Report — ${MONTHS[r.month - 1]} ${r.year}`,
      sublabel: r.trafficGrowth ? `Traffic: ${r.trafficGrowth}${r.blogsPosted ? ` · ${r.blogsPosted} blogs` : ""}` : undefined,
      kind: "report",
      category: "monthly-web",
    });
  }
  for (const p of projects) {
    activityEvents.push({
      dateStr: p.expectedDelivery ?? "2000-01-01",
      label: p.projectName,
      sublabel: `Project · ${p.stage}`,
      kind: "project",
      category: "web",
    });
  }
  activityEvents.sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  const filteredActivityEvents =
    customerTab === "digital"
      ? activityEvents.filter(e => e.category === "digital" || e.category === "monthly-digital")
      : customerTab === "web"
        ? activityEvents.filter(e => e.category === "web" || e.category === "monthly-web")
        : customerTab === "monthly"
          ? activityEvents.filter(e => e.category === "monthly-digital" || e.category === "monthly-web")
          : activityEvents;

  const activityKindIcon = (kind: ActivityEvent["kind"]) => {
    if (kind === "service") return <Briefcase className="w-3.5 h-3.5" />;
    if (kind === "delivery") return <Zap className="w-3.5 h-3.5" />;
    if (kind === "report") return <FileText className="w-3.5 h-3.5" />;
    return <Layers className="w-3.5 h-3.5" />;
  };
  const activityKindColor = (kind: ActivityEvent["kind"]) => {
    if (kind === "service") return "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400";
    if (kind === "delivery") return "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400";
    if (kind === "report") return "bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400";
    return "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400";
  };

  const oneTimeServices = (services ?? []).slice().sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const avatarColors = (() => {
    const palettes = [
      ["#00E7FF","#0ea5e9"], ["#a855f7","#7c3aed"], ["#10B981","#059669"],
      ["#F59E0B","#d97706"], ["#EC4899","#db2777"], ["#38bdf8","#0284c7"],
    ];
    return palettes[customer.name.charCodeAt(0) % palettes.length];
  })();

  return (
    <div className="space-y-6 pb-10">

      {/* ── Back + Edit ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-between"
      >
        <Link href="/customers">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground/60 hover:text-foreground -ml-2 rounded-xl">
            <ArrowLeft className="h-4 w-4" /> Back to clients
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditOpen(true)}
          className="gap-2 border-white/[0.08] hover:border-white/20 rounded-xl"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </motion.div>

      {/* ── Hero Profile Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl border border-white/[0.07] bg-card overflow-hidden"
        style={{ boxShadow: `0 0 60px ${avatarColors[0]}10` }}
      >
        {/* Ambient top glow */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${avatarColors[0]}50, transparent)` }}
        />
        <div
          className="absolute -top-20 -left-10 w-64 h-64 rounded-full blur-[80px] pointer-events-none"
          style={{ background: `${avatarColors[0]}08` }}
        />

        <div className="relative p-5 sm:p-6">
          {/* Top row: avatar + name + actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-xl ring-1 ring-white/10"
                  style={{ background: `linear-gradient(135deg, ${avatarColors[0]}, ${avatarColors[1]})`, boxShadow: `0 0 30px ${avatarColors[0]}30` }}
                >
                  {customer.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">{customer.name}</h2>
                {customer.businessName && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3 h-3 text-muted-foreground/50" />
                    <span className="text-sm text-muted-foreground/60">{customer.businessName}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 mt-2">
                  <button
                    onClick={() => setInfoOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-muted-foreground/50 hover:text-foreground border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.05] transition-all"
                  >
                    <Info className="h-3 w-3" /> Details
                  </button>
                  <button
                    onClick={() => setPortalOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-muted-foreground/50 hover:text-cyan-400 border border-white/[0.06] hover:border-cyan-500/30 bg-white/[0.02] hover:bg-cyan-500/5 transition-all"
                  >
                    <LayoutDashboard className="h-3 w-3" /> Client Portal
                  </button>
                </div>
              </div>
            </div>

            {/* Financial stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Revenue", value: formatCurrency(totals.revenue), color: "#00E7FF" },
                { label: "Profit", value: formatCurrency(totals.profit), color: "#10B981" },
                { label: "Paid", value: formatCurrency(totals.paid), color: "#a855f7" },
                { label: "Pending", value: formatCurrency(totals.pending), color: "#F59E0B" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl px-3 py-2.5 border border-white/[0.05]"
                  style={{ background: `${item.color}08` }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: `${item.color}80` }}>
                    {item.label}
                  </div>
                  <div className="text-sm font-bold tabular-nums" style={{ color: item.color }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tab bar */}
          <div className="mt-5 pt-5 border-t border-white/[0.05]">
            <div className="flex flex-wrap gap-1.5">
              {(["overview", "digital", "web", "monthly"] as const).map((tab) => {
                const isActive = customerTab === tab;
                const label = tab.charAt(0).toUpperCase() + tab.slice(1);
                return (
                  <button
                    key={tab}
                    onClick={() => setCustomerTab(tab)}
                    className="relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                    style={{
                      color: isActive ? avatarColors[0] : "rgba(255,255,255,0.35)",
                      background: isActive ? `${avatarColors[0]}12` : "transparent",
                      border: isActive ? `1px solid ${avatarColors[0]}30` : "1px solid transparent",
                    }}
                  >
                    {label}
                    {isActive && (
                      <motion.div
                        layoutId="tab-underline"
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                        style={{ background: avatarColors[0] }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {customerTab === "monthly" && (
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">Monthly Progress Reports</div>
                  <div className="text-xs text-muted-foreground/50 mt-0.5">
                    {dmReports.length} DM · {seoReports.length} SEO saved
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 border-white/[0.08] rounded-xl h-8 text-xs"
                    onClick={() => { setDmForm(blankDm()); setDmDialog(true); }}>
                    <Megaphone className="h-3.5 w-3.5" /> Add DM
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 border-white/[0.08] rounded-xl h-8 text-xs"
                    onClick={() => { setSeoForm(blankSeo()); setSeoDialog(true); }}>
                    <Globe className="h-3.5 w-3.5" /> Add SEO
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Info Popup */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              {customer.name}
            </DialogTitle>
            {customer.businessName && (
              <DialogDescription>{customer.businessName}</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3 text-sm pt-1">
            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{customer.address}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-muted-foreground">
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>
                Created:{" "}
                <span className="text-foreground font-medium">
                  {formatDate(customer.createdAt)}
                </span>
              </span>
            </div>
            {customer.notes && (
              <div className="border-t pt-3 text-muted-foreground italic">
                "{customer.notes}"
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Portal Popup */}
      <Dialog open={portalOpen} onOpenChange={setPortalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-blue-600" />
              Client Portal
              {portal ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs ml-1",
                    portal.isActive
                      ? "border-emerald-400 text-emerald-600"
                      : "border-red-400 text-red-500",
                  )}
                >
                  {portal.isActive ? "Active" : "Inactive"}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs ml-1 text-muted-foreground">
                  Not set up
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Give {customer.name.split(" ")[0]} password-only access to their project dashboard
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            {portal && portal.isActive && (
              <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                <span className="text-xs text-muted-foreground flex-1 truncate">{portalLink}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(portalLink);
                    toast.success("Portal link copied");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" asChild>
                  <a href={portalLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => { setPortalOpen(false); setNewPassword(""); setPwDialog(true); }}
              >
                <Key className="h-3.5 w-3.5" />
                {portal ? "Change Password" : "Activate Portal"}
              </Button>
              {portal && (
                <Button
                  size="sm"
                  variant="outline"
                  className={cn("gap-2", portal.isActive ? "text-destructive hover:text-destructive" : "text-emerald-600 hover:text-emerald-600")}
                  onClick={() => togglePortal.mutate(!portal.isActive)}
                  disabled={togglePortal.isPending}
                >
                  {portal.isActive ? (
                    <><PowerOff className="h-3.5 w-3.5" /> Deactivate</>
                  ) : (
                    <><Power className="h-3.5 w-3.5" /> Activate</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Context Stats Strip ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {customerTab === "overview" && [
          { label: "Total Revenue", value: formatCurrency(totals.revenue), icon: TrendingUp, color: "#00E7FF" },
          { label: "Outstanding", value: formatCurrency(totals.pending), icon: Clock, color: "#F59E0B" },
          { label: "Monthly MRR", value: formatCurrency(webMRR + digitalMRR), icon: Zap, color: "#10B981" },
          { label: "Reports", value: String(dmReports.length + seoReports.length), icon: Activity, color: "#a855f7" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/[0.06] bg-card p-4" style={{ boxShadow: `0 0 20px ${s.color}08` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ background: `${s.color}18` }}>
                <s.icon className="w-2.5 h-2.5" style={{ color: s.color }} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: `${s.color}70` }}>{s.label}</span>
            </div>
            <div className="text-base font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
        {customerTab === "digital" && [
          { label: "Digital MRR", value: formatCurrency(digitalMRR), icon: Megaphone, color: "#a855f7" },
          { label: "Active Services", value: String(digitalServices.filter(s => s.status === "active").length), icon: Zap, color: "#10B981" },
          { label: "DM Reports", value: String(dmReports.length), icon: FileText, color: "#00E7FF" },
          { label: "Total Leads", value: String(dmReports.reduce((acc, r) => acc + (r.leadsGenerated ?? 0), 0)), icon: TrendingUp, color: "#F59E0B" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/[0.06] bg-card p-4" style={{ boxShadow: `0 0 20px ${s.color}08` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ background: `${s.color}18` }}>
                <s.icon className="w-2.5 h-2.5" style={{ color: s.color }} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: `${s.color}70` }}>{s.label}</span>
            </div>
            <div className="text-base font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
        {customerTab === "web" && [
          { label: "Web MRR", value: formatCurrency(webMRR), icon: Globe, color: "#00E7FF" },
          { label: "Active Services", value: String(webServices.filter(s => s.status === "active").length), icon: Zap, color: "#10B981" },
          { label: "Projects", value: String(projects.length), icon: Layers, color: "#a855f7" },
          { label: "SEO Reports", value: String(seoReports.length), icon: FileText, color: "#F59E0B" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/[0.06] bg-card p-4" style={{ boxShadow: `0 0 20px ${s.color}08` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ background: `${s.color}18` }}>
                <s.icon className="w-2.5 h-2.5" style={{ color: s.color }} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: `${s.color}70` }}>{s.label}</span>
            </div>
            <div className="text-base font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
        {customerTab === "monthly" && [
          { label: "Total MRR", value: formatCurrency(webMRR + digitalMRR), icon: Zap, color: "#10B981" },
          { label: "DM Reports", value: String(dmReports.length), icon: Megaphone, color: "#a855f7" },
          { label: "SEO Reports", value: String(seoReports.length), icon: Globe, color: "#00E7FF" },
          { label: "Total Leads", value: String(dmReports.reduce((acc, r) => acc + (r.leadsGenerated ?? 0), 0)), icon: TrendingUp, color: "#F59E0B" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/[0.06] bg-card p-4" style={{ boxShadow: `0 0 20px ${s.color}08` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ background: `${s.color}18` }}>
                <s.icon className="w-2.5 h-2.5" style={{ color: s.color }} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: `${s.color}70` }}>{s.label}</span>
            </div>
            <div className="text-base font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </motion.div>

      {/* ── Recent Activity ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl border border-white/[0.06] bg-card overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(168,85,247,0.4),transparent)" }} />
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.2)" }}>
              <Activity className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div>
              <div className="text-sm font-semibold">Recent Activity</div>
              <div className="text-[10.5px] text-muted-foreground/40 mt-0.5">Latest events with this client</div>
            </div>
          </div>
          {filteredActivityEvents.length > 5 && (
            <button
              onClick={() => setActivityOpen(true)}
              className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-white/[0.07] text-muted-foreground/50 hover:text-foreground hover:border-white/[0.14] bg-white/[0.02] hover:bg-white/[0.04] transition-all"
            >
              View all {filteredActivityEvents.length}
            </button>
          )}
        </div>
        <div className="px-5 pb-5">
          {filteredActivityEvents.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground/40">
              No activity yet for this category.
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-3 top-1 bottom-4 w-px" style={{ background: "linear-gradient(to bottom, rgba(168,85,247,0.3), transparent)" }} />
              <div className="space-y-0">
                {filteredActivityEvents.slice(0, 5).map((ev, i) => (
                  <div key={i} className="relative flex gap-4 pb-4">
                    <div className={cn("relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5", activityKindColor(ev.kind))}>
                      {activityKindIcon(ev.kind)}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-sm font-medium leading-snug">{ev.label}</div>
                      {ev.sublabel && <div className="text-xs text-muted-foreground mt-0.5">{ev.sublabel}</div>}
                      {ev.dateStr && ev.dateStr !== "2000-01-01" && (
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5">{formatDate(ev.dateStr)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {filteredActivityEvents.length > 5 && (
                <button
                  onClick={() => setActivityOpen(true)}
                  className="w-full text-center text-[11px] font-medium text-muted-foreground/40 hover:text-muted-foreground pt-3 transition-colors"
                >
                  + {filteredActivityEvents.length - 5} more — View all
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Service History — Overview tab only ── */}
      {customerTab === "overview" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-2xl border border-white/[0.06] bg-card overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(0,231,255,0.35),transparent)" }} />
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,231,255,0.10)", border: "1px solid rgba(0,231,255,0.18)" }}>
                <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div>
                <div className="text-sm font-semibold">Service History</div>
                <div className="text-[10.5px] text-muted-foreground/40 mt-0.5">All one-time services delivered to this client</div>
              </div>
            </div>
            <button
              onClick={() => setServiceOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-cyan-500/20 text-cyan-400 hover:text-cyan-300 hover:border-cyan-400/40 bg-cyan-500/5 hover:bg-cyan-500/10 transition-all"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="px-5 pb-5">
            {oneTimeServices.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground/40">No one-time services yet.</div>
            ) : (
              <div className="space-y-2.5">
                {oneTimeServices.map((s, idx) => {
                  const typeColor = s.serviceType === "web"
                    ? { accent: "#00E7FF", bg: "rgba(0,231,255,0.06)", border: "rgba(0,231,255,0.12)" }
                    : s.serviceType === "digital"
                      ? { accent: "#a855f7", bg: "rgba(168,85,247,0.06)", border: "rgba(168,85,247,0.12)" }
                      : { accent: "#F59E0B", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.12)" };
                  const typeLabel = s.serviceType === "web" ? "Web" : s.serviceType === "digital" ? "Digital" : "Other";
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="flex items-center gap-3 rounded-xl px-3.5 py-3 border"
                      style={{ background: typeColor.bg, borderColor: typeColor.border }}
                    >
                      <div
                        className="w-1.5 h-8 rounded-full shrink-0"
                        style={{ background: `linear-gradient(to bottom, ${typeColor.accent}, ${typeColor.accent}40)` }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{s.serviceName}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: `${typeColor.accent}70` }}>
                          {typeLabel}{s.date ? ` · ${formatDate(s.date)}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-sm font-bold tabular-nums" style={{ color: typeColor.accent }}>{formatCurrency(s.priceSold)}</div>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                          style={{
                            color: s.paymentStatus === "paid" ? "#10B981" : s.paymentStatus === "partial" ? "#38bdf8" : "#F59E0B",
                            borderColor: s.paymentStatus === "paid" ? "rgba(16,185,129,0.3)" : s.paymentStatus === "partial" ? "rgba(56,189,248,0.3)" : "rgba(245,158,11,0.3)",
                            background: s.paymentStatus === "paid" ? "rgba(16,185,129,0.08)" : s.paymentStatus === "partial" ? "rgba(56,189,248,0.08)" : "rgba(245,158,11,0.08)",
                          }}
                        >
                          {s.paymentStatus}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                          style={{
                            color: s.deliveryStatus === "delivered" ? "#10B981" : "#F59E0B",
                            borderColor: s.deliveryStatus === "delivered" ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)",
                            background: s.deliveryStatus === "delivered" ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
                          }}
                        >
                          {s.deliveryStatus}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Project Progress ── */}
      {customerTab === "web" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-2xl border border-white/[0.06] bg-card overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(0,231,255,0.35),transparent)" }} />
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,231,255,0.10)", border: "1px solid rgba(0,231,255,0.18)" }}>
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div>
                <div className="text-sm font-semibold">Project Progress</div>
                <div className="text-[10.5px] text-muted-foreground/40 mt-0.5">Website & web app projects visible in client dashboard</div>
              </div>
            </div>
            <button
              onClick={() => { setEditProject(undefined); setProjectDialog(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-cyan-500/20 text-cyan-400 hover:text-cyan-300 hover:border-cyan-400/40 bg-cyan-500/5 hover:bg-cyan-500/10 transition-all"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="px-5 pb-5">
            {projects.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground/40">
                No projects yet. Add one to show progress in the client dashboard.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {projects.map((proj, idx) => (
                  <motion.div
                    key={proj.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden"
                    style={{ boxShadow: "0 0 20px rgba(0,231,255,0.04)" }}
                  >
                    <ServiceDetailCard project={proj} />
                    <div className="px-3 pb-3">
                      <button
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold border border-white/[0.07] text-muted-foreground/40 hover:text-foreground hover:border-white/[0.14] transition-all"
                        onClick={() => { setEditProject(proj); setProjectDialog(true); }}
                      >
                        <Pencil className="w-3 h-3" /> Edit Project
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Digital Services ── */}
      {customerTab === "digital" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-2xl border border-white/[0.06] bg-card overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(168,85,247,0.45),transparent)" }} />
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.22)" }}>
                <Megaphone className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <div>
                <div className="text-sm font-semibold">Digital Services</div>
                <div className="text-[10.5px] text-muted-foreground/40 mt-0.5">Digital marketing subscriptions and monthly performance</div>
              </div>
            </div>
            <button
              onClick={() => setServiceOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-violet-500/20 text-violet-400 hover:text-violet-300 hover:border-violet-400/40 bg-violet-500/5 hover:bg-violet-500/10 transition-all"
            >
              <Plus className="w-3 h-3" /> Add service
            </button>
          </div>
          <div className="px-5 pb-5 space-y-4">
            {digitalServiceCards.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground/40">
                No digital services yet.
              </div>
            ) : (
              <div className="space-y-3">
                {digitalServiceCards.map((ds) => {
                  const isEditing = dsEditId === ds.id;
                  const isSaving = updateMonthlyDigital.isPending || updateOneTimeService.isPending;
                  return (
                    <div
                      key={ds.id}
                      className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3"
                      style={{ boxShadow: "0 0 24px rgba(168,85,247,0.04)" }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-sm leading-tight">{ds.serviceName}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{ds.serviceType === "web" ? "Web" : "Digital"} · {ds.billingType === "monthly" ? "Monthly" : "One time"}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={cn("text-xs", ds.status === "active" && "border-emerald-400 text-emerald-600", ds.status === "paused" && "border-amber-400 text-amber-600", ds.status === "cancelled" && "border-slate-400 text-slate-500", ds.status === "delivered" && "border-blue-400 text-blue-600")}>
                            {dsStatusLabel(ds.status)}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0 text-purple-400 hover:text-purple-200 hover:bg-purple-950/40"
                            onClick={() => setActivityOpenId(activityOpenId === ds.id ? null : ds.id)}
                            title="View activity"
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </Button>
                          {!isEditing && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 shrink-0"
                              onClick={() => openDsEdit(ds)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Progress</span>
                          <span>{dsProgress(ds.status)}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", dsProgressColor(ds.status))}
                            style={{ width: `${dsProgress(ds.status)}%` }}
                          />
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="rounded-lg border border-white/[0.08] bg-muted/30 p-2.5 space-y-2.5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Name</Label>
                              <Input
                                className="h-8 text-xs rounded-md"
                                value={dsEditName}
                                onChange={(e) => setDsEditName(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Category</Label>
                              <Input
                                className="h-8 text-xs rounded-md"
                                value={dsEditCategory}
                                onChange={(e) => setDsEditCategory(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Stage</Label>
                            <div className="flex flex-wrap gap-2">
                              {digitalStages.map((stage, index) => {
                                const activeStage = getDigitalStageIndex(dsEditStatus) >= index;
                                return (
                                  <Button
                                    key={stage.value}
                                    size="sm"
                                    variant={getDigitalStageIndex(dsEditStatus) === index ? "default" : "outline"}
                                    className={cn(
                                      "h-7 text-xs",
                                      activeStage && getDigitalStageIndex(dsEditStatus) !== index && "border-primary/40 text-primary",
                                    )}
                                    onClick={() => setDsEditStatus(stage.value)}
                                  >
                                    {stage.label}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Notes</Label>
                            <Textarea
                              className="min-h-[70px] resize-none text-xs"
                              placeholder="Add a note about this project…"
                              value={dsEditNote}
                              onChange={(e) => setDsEditNote(e.target.value)}
                            />
                          </div>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDsEditId(null)} disabled={isSaving}>
                              Cancel
                            </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => saveDsEdit(ds)}
                            disabled={isSaving}
                          >
                              {isSaving ? "Saving…" : "Update"}
                          </Button>
                        </div>
                        </div>
                      ) : (
                        <>
                          <div className="rounded-lg border border-white/[0.07] bg-muted/10 p-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                              <span>{ds.serviceType === "web" ? "Web" : "Digital"} · {ds.billingType === "monthly" ? "Monthly" : "One-time"}</span>
                              <span>{formatDate(ds.startDate)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={cn("h-2.5 w-2.5 rounded-full shrink-0",
                                ds.status === "active" && "bg-emerald-500",
                                ds.status === "paused" && "bg-amber-500",
                                ds.status === "cancelled" && "bg-slate-400",
                                ds.status === "delivered" && "bg-blue-500",
                              )} />
                              <span className="text-sm font-semibold">{dsStatusLabel(ds.status)}</span>
                              {ds.status === "active" && (
                                <span className="ml-auto text-[11px] font-medium text-emerald-600 dark:text-emerald-400">● Live</span>
                              )}
                              {ds.status === "cancelled" && (
                                <span className="ml-auto text-[11px] font-medium text-slate-500">Subscription ended</span>
                              )}
                            </div>
                          </div>
                          {ds.notes && (
                            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300 whitespace-pre-wrap">
                              {ds.notes}
                            </div>
                          )}
                        </>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-muted/30 p-3 border border-white/[0.06]">
                          <div className="text-muted-foreground">Charge</div>
                          <div className="font-semibold">{formatCurrency(ds.charge)}{ds.billingType === "monthly" ? "/mo" : ""}</div>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-3 border border-white/[0.06]">
                          <div className="text-muted-foreground">Cost</div>
                          <div className="font-semibold">{formatCurrency(ds.cost)}{ds.billingType === "monthly" ? "/mo" : ""}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {ds.discount > 0 && <span>Discount: {formatCurrency(ds.discount)}</span>}
                        <span>Since: {formatDate(ds.startDate)}</span>
                      </div>
                      {ds.billingType === "monthly" ? (
                        <>
                          <MiniMonthGrid completions={ds.completions} />
                          {ds.billingType === "monthly" && (
                            <Link href={`/monthly-services?highlight=${ds.rawId}&tab=digital`}>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 w-full mt-1">
                                Manage <span aria-hidden>→</span>
                              </Button>
                            </Link>
                          )}
                        </>
                      ) : null}

                      {/* Activity panel */}
                      {activityOpenId === ds.id && (
                        <div className="rounded-xl border border-purple-500/20 bg-purple-950/25 p-3 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                            <Activity className="w-3.5 h-3.5" />
                            Recent Activity
                          </div>
                          {activityLoading ? (
                            <div className="space-y-1.5">
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                            </div>
                          ) : activityLog.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">No activity recorded yet. Update the status to start tracking.</p>
                          ) : (
                            <div className="space-y-2">
                              {activityLog.map((entry, i) => (
                                <div key={entry.id} className="flex gap-2 text-xs">
                                  <div className="flex flex-col items-center">
                                    <div className={cn("h-2 w-2 rounded-full mt-0.5 shrink-0",
                                      entry.toStatus === "active" && "bg-emerald-500",
                                      entry.toStatus === "paused" && "bg-amber-500",
                                      entry.toStatus === "cancelled" && "bg-slate-400",
                                      entry.toStatus === "delivered" && "bg-blue-500",
                                      !["active","paused","cancelled","delivered"].includes(entry.toStatus ?? "") && "bg-purple-400",
                                    )} />
                                    {i < activityLog.length - 1 && <div className="w-px flex-1 bg-border mt-0.5" />}
                                  </div>
                                  <div className="pb-2 flex-1 min-w-0">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {entry.fromStatus && (
                                        <>
                                          <span className="text-muted-foreground">{activityStatusLabel(entry.fromStatus)}</span>
                                          <span className="text-muted-foreground">→</span>
                                        </>
                                      )}
                                      <span className="font-medium">{activityStatusLabel(entry.toStatus)}</span>
                                      <span className="ml-auto text-muted-foreground text-[10px] shrink-0">
                                        {new Date(entry.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                      </span>
                                    </div>
                                    {entry.note && (
                                      <p className="text-muted-foreground mt-0.5 truncate">{entry.note}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Monthly Website Services ── */}
      {customerTab === "monthly" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-2xl border border-white/[0.06] bg-card overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(0,231,255,0.35),transparent)" }} />
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,231,255,0.10)", border: "1px solid rgba(0,231,255,0.18)" }}>
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div>
                <div className="text-sm font-semibold">Monthly Website Services</div>
                <div className="text-[10.5px] text-muted-foreground/40 mt-0.5">Recurring website maintenance retainers</div>
              </div>
            </div>
          </div>
          <div className="px-5 pb-5 space-y-3">
            {webServices.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground/40">No monthly website services yet.</div>
            ) : (
              webServices.map((ws, idx) => {
                const statusColor = ws.status === "active"
                  ? { text: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" }
                  : ws.status === "paused"
                    ? { text: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" }
                    : { text: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.2)" };
                const profit = ws.monthlyCharge - ws.monthlyCost - ws.discount;
                return (
                  <motion.div
                    key={ws.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className="rounded-xl border border-white/[0.07] overflow-hidden"
                    style={{ background: "rgba(0,231,255,0.02)", boxShadow: "0 0 24px rgba(0,231,255,0.04)" }}
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-sm leading-tight">{ws.websiteName}</div>
                          <div className="text-[11px] text-cyan-400/60 mt-0.5">Website Retainer · Since {formatDate(ws.startDate)}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize"
                            style={{ color: statusColor.text, background: statusColor.bg, borderColor: statusColor.border }}
                          >
                            {ws.status}
                          </span>
                          <Link href={`/monthly-services?highlight=${ws.id}&tab=website`}>
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-white/[0.08] text-muted-foreground/50 hover:text-foreground hover:border-white/[0.16] bg-white/[0.02] transition-all cursor-pointer">
                              Manage →
                            </span>
                          </Link>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Charge", value: `${formatCurrency(ws.monthlyCharge)}/mo`, color: "#00E7FF" },
                          { label: "Cost", value: `${formatCurrency(ws.monthlyCost)}/mo`, color: "#a855f7" },
                          { label: "Profit", value: `${formatCurrency(profit)}/mo`, color: "#10B981" },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-lg px-3 py-2 border border-white/[0.05]"
                            style={{ background: `${item.color}06` }}
                          >
                            <div className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: `${item.color}60` }}>{item.label}</div>
                            <div className="text-xs font-bold tabular-nums" style={{ color: item.color }}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                      {ws.discount > 0 && (
                        <div className="text-[11px] text-amber-400/60">Discount: {formatCurrency(ws.discount)}/mo</div>
                      )}
                      <MiniMonthGrid completions={ws.completions} />
                    </div>
                  </motion.div>
                );
              })
            )}
            <Link href="/monthly-services">
              <div className="text-center text-[11px] font-medium text-muted-foreground/40 hover:text-muted-foreground pt-1 transition-colors cursor-pointer">
                Manage all monthly services →
              </div>
            </Link>
          </div>
        </motion.div>
      )}

      {customerTab === "monthly" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-2xl border border-white/[0.06] bg-card overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(168,85,247,0.35),transparent)" }} />
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.2)" }}>
                <Briefcase className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <div>
                <div className="text-sm font-semibold">Service History</div>
                <div className="text-[10.5px] text-muted-foreground/40 mt-0.5">{services?.length ?? 0} service{services?.length === 1 ? "" : "s"} delivered</div>
              </div>
            </div>
            <button
              onClick={() => setServiceOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-white/[0.07] text-muted-foreground/50 hover:text-foreground hover:border-white/[0.14] bg-white/[0.02] hover:bg-white/[0.04] transition-all"
            >
              <Plus className="w-3 h-3" /> Add service
            </button>
          </div>
          <div className="px-5 pb-5 space-y-2">
            {!services || services.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground/40">No services yet for this customer.</div>
            ) : (
              <div className="space-y-2">
                {services.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-xl border border-white/[0.07] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    style={{ background: "rgba(168,85,247,0.02)", boxShadow: "0 0 20px rgba(168,85,247,0.03)" }}
                  >
                    <div className="space-y-0.5">
                      <div className="font-medium text-sm">{s.serviceName}</div>
                      <div className="text-[11px] text-muted-foreground/60">{formatDate(s.date)} · Profit {formatCurrency(Number(s.profit ?? 0))}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline" className={paymentBadge(s.paymentStatus)}>{s.paymentStatus}</Badge>
                      <div className="text-right">
                        <div className="text-sm font-semibold tabular-nums">{formatCurrency(Number(s.priceSold))}</div>
                        <div className="text-[10px] text-muted-foreground/60">Paid {formatCurrency(Number(s.amountPaid ?? 0))}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* DM Reports Card — Monthly Tab */}
      {customerTab === "monthly" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-2xl border border-white/[0.06] bg-card overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(168,85,247,0.4),transparent)" }} />
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.2)" }}>
                <Megaphone className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <div>
                <div className="text-sm font-semibold">Digital Marketing Reports</div>
                <div className="text-[10.5px] text-muted-foreground/40 mt-0.5">Social media &amp; DM monthly reports</div>
              </div>
            </div>
            <button
              onClick={() => { setDmForm(blankDm()); setDmDialog(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-white/[0.07] text-muted-foreground/50 hover:text-foreground hover:border-white/[0.14] bg-white/[0.02] hover:bg-white/[0.04] transition-all"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="px-5 pb-5">
            {dmReports.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground/40">No DM reports yet.</div>
            ) : (
              <div className="space-y-2">
                {dmReports
                  .slice()
                  .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)
                  .map((r) => {
                    const total = (r.uploadedVideos ?? 0) + (r.uploadedPosts ?? 0) + (r.uploadedReels ?? 0) + (r.uploadedStories ?? 0);
                    const target = (r.targetVideos ?? 0) + (r.targetPosts ?? 0) + (r.targetReels ?? 0) + (r.targetStories ?? 0);
                    return (
                      <div key={r.id} className="rounded-xl border border-white/[0.07] p-3 text-sm" style={{ background: "rgba(168,85,247,0.02)" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-[13px]">{MONTHS[r.month - 1]} {r.year}</div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground/60 mt-0.5">
                              {r.platforms && <span>{r.platforms}</span>}
                              {r.plan && <span className="capitalize">{r.plan} plan</span>}
                              <span>Content: {total}/{target}</span>
                              <span>+{r.followersGained ?? 0} followers</span>
                              <span>{r.leadsGenerated ?? 0} leads</span>
                              {r.engagementGrowth && <span>Engagement: {r.engagementGrowth}</span>}
                            </div>
                            {r.summaryNotes && (
                              <div className="text-[11px] text-muted-foreground/50 italic mt-1 line-clamp-2">{r.summaryNotes}</div>
                            )}
                          </div>
                          <button
                            className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-white/[0.04] transition-all"
                            onClick={() => {
                              setDmForm({
                                year: String(r.year), month: String(r.month),
                                platforms: r.platforms ?? "", plan: r.plan ?? "",
                                targetVideos: String(r.targetVideos ?? 0),
                                targetPosts: String(r.targetPosts ?? 0),
                                targetReels: String(r.targetReels ?? 0),
                                targetStories: String(r.targetStories ?? 0),
                                uploadedVideos: String(r.uploadedVideos ?? 0),
                                uploadedPosts: String(r.uploadedPosts ?? 0),
                                uploadedReels: String(r.uploadedReels ?? 0),
                                uploadedStories: String(r.uploadedStories ?? 0),
                                followersGained: String(r.followersGained ?? 0),
                                engagementGrowth: r.engagementGrowth ?? "",
                                leadsGenerated: String(r.leadsGenerated ?? 0),
                                adSpend: r.adSpend ?? "0",
                                summaryNotes: r.summaryNotes ?? "",
                              });
                              setDmDialog(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* SEO Reports Card — Monthly Tab */}
      {customerTab === "monthly" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-2xl border border-white/[0.06] bg-card overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(0,231,255,0.35),transparent)" }} />
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,231,255,0.10)", border: "1px solid rgba(0,231,255,0.18)" }}>
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div>
                <div className="text-sm font-semibold">Web / SEO Reports</div>
                <div className="text-[10.5px] text-muted-foreground/40 mt-0.5">Search performance &amp; SEO monthly reports</div>
              </div>
            </div>
            <button
              onClick={() => { setSeoForm(blankSeo()); setSeoDialog(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-white/[0.07] text-muted-foreground/50 hover:text-foreground hover:border-white/[0.14] bg-white/[0.02] hover:bg-white/[0.04] transition-all"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="px-5 pb-5">
            {seoReports.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground/40">No SEO reports yet.</div>
            ) : (
              <div className="space-y-2">
                {seoReports
                  .slice()
                  .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)
                  .map((r) => (
                    <div key={r.id} className="rounded-xl border border-white/[0.07] p-3 text-sm" style={{ background: "rgba(0,231,255,0.015)" }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-[13px]">{MONTHS[r.month - 1]} {r.year}</div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground/60 mt-0.5">
                            <span>{r.blogsPosted} blogs posted</span>
                            <span>{r.keywordsRanked} keywords</span>
                            {r.trafficGrowth && <span>Traffic: {r.trafficGrowth}</span>}
                            {r.backlinksAdded > 0 && <span>{r.backlinksAdded} backlinks</span>}
                            {r.seoScore != null && <span>Score: {r.seoScore}/100</span>}
                          </div>
                          {r.notes && (
                            <div className="text-[11px] text-muted-foreground/50 italic mt-1 line-clamp-2">{r.notes}</div>
                          )}
                        </div>
                        <button
                          className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-white/[0.04] transition-all"
                          onClick={() => {
                            setSeoForm({
                              year: String(r.year), month: String(r.month),
                              blogsPosted: String(r.blogsPosted ?? 0),
                              keywordsRanked: String(r.keywordsRanked ?? 0),
                              trafficGrowth: r.trafficGrowth ?? "",
                              backlinksAdded: String(r.backlinksAdded ?? 0),
                              seoScore: r.seoScore != null ? String(r.seoScore) : "",
                              notes: r.notes ?? "",
                            });
                            setSeoDialog(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Activity View More Dialog */}
      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4" /> All Activity
            </DialogTitle>
            <DialogDescription>{filteredActivityEvents.length} events{customerTab !== "overview" ? ` in ${customerTab} category` : " with this client"}, newest first</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1 min-h-0">
            {filteredActivityEvents.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">No activity yet.</div>
            ) : (
              <div className="relative">
                <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-0">
                  {filteredActivityEvents.map((ev, i) => (
                    <div key={i} className="relative flex gap-4 pb-4">
                      <div className={cn("relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5", activityKindColor(ev.kind))}>
                        {activityKindIcon(ev.kind)}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="text-sm font-medium leading-snug">{ev.label}</div>
                        {ev.sublabel && <div className="text-xs text-muted-foreground mt-0.5">{ev.sublabel}</div>}
                        {ev.dateStr && ev.dateStr !== "2000-01-01" && (
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">{formatDate(ev.dateStr)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <Dialog open={pwDialog} onOpenChange={setPwDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{portal ? "Change Client Password" : "Activate Client Portal"}</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              Set a password for <strong>{customer.name}</strong>. They will use this password (no username needed) to log into their dashboard at <code className="text-xs bg-muted px-1 rounded">/portal</code>.
            </p>
            <div>
              <Label className="text-xs">Password</Label>
              <Input
                className="mt-1"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="e.g. YuvaLab2026"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwDialog(false)}>Cancel</Button>
            <Button
              onClick={() => activatePortal.mutate()}
              disabled={!newPassword || activatePortal.isPending}
            >
              {activatePortal.isPending ? "Saving…" : portal ? "Update Password" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProjectFormDialog
        open={projectDialog}
        onOpenChange={setProjectDialog}
        customerId={id}
        project={editProject}
      />

      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customerId={customer.id}
      />
      <ServiceFormDialog
        open={serviceOpen}
        onOpenChange={(open) => {
          setServiceOpen(open);
          if (!open) setEditService(undefined);
        }}
        presetCustomerId={customer.id}
        service={editService}
      />

      {/* DM Report Dialog */}
      <Dialog open={dmDialog} onOpenChange={setDmDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Digital Marketing Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Year</Label>
                <Input className="mt-1" type="number" value={dmForm.year}
                  onChange={e => setDmForm(f => ({ ...f, year: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Month</Label>
                <Select value={dmForm.month} onValueChange={v => setDmForm(f => ({ ...f, month: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Platforms (e.g. Instagram, Facebook)</Label>
                <Input className="mt-1" value={dmForm.platforms}
                  onChange={e => setDmForm(f => ({ ...f, platforms: e.target.value }))}
                  placeholder="Instagram, Facebook" />
              </div>
              <div>
                <Label className="text-xs">Plan</Label>
                <Select value={dmForm.plan} onValueChange={v => setDmForm(f => ({ ...f, plan: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select plan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Content Targets</div>
              <div className="grid grid-cols-4 gap-2">
                {(["Videos","Posts","Reels","Stories"] as const).map((label) => {
                  const key = `target${label}` as keyof DMFormData;
                  return (
                    <div key={label}>
                      <Label className="text-[10px]">Target {label}</Label>
                      <Input className="mt-0.5 h-8 text-sm" type="number" value={dmForm[key]}
                        onChange={e => setDmForm(f => ({ ...f, [key]: e.target.value }))} />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="border rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Delivered</div>
              <div className="grid grid-cols-4 gap-2">
                {(["Videos","Posts","Reels","Stories"] as const).map((label) => {
                  const key = `uploaded${label}` as keyof DMFormData;
                  return (
                    <div key={label}>
                      <Label className="text-[10px]">Done {label}</Label>
                      <Input className="mt-0.5 h-8 text-sm" type="number" value={dmForm[key]}
                        onChange={e => setDmForm(f => ({ ...f, [key]: e.target.value }))} />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Followers Gained</Label>
                <Input className="mt-1" type="number" value={dmForm.followersGained}
                  onChange={e => setDmForm(f => ({ ...f, followersGained: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Engagement Growth</Label>
                <Input className="mt-1" value={dmForm.engagementGrowth} placeholder="e.g. +12%"
                  onChange={e => setDmForm(f => ({ ...f, engagementGrowth: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Leads Generated</Label>
                <Input className="mt-1" type="number" value={dmForm.leadsGenerated}
                  onChange={e => setDmForm(f => ({ ...f, leadsGenerated: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Summary Notes</Label>
              <Textarea className="mt-1" rows={3} value={dmForm.summaryNotes} placeholder="Client-visible summary..."
                onChange={e => setDmForm(f => ({ ...f, summaryNotes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDmDialog(false)}>Cancel</Button>
            <Button onClick={() => saveDmReport.mutate(dmForm)} disabled={saveDmReport.isPending}>
              {saveDmReport.isPending ? "Saving…" : "Save Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SEO Report Dialog */}
      <Dialog open={seoDialog} onOpenChange={setSeoDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>SEO Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Year</Label>
                <Input className="mt-1" type="number" value={seoForm.year}
                  onChange={e => setSeoForm(f => ({ ...f, year: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Month</Label>
                <Select value={seoForm.month} onValueChange={v => setSeoForm(f => ({ ...f, month: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Blogs Posted</Label>
                <Input className="mt-1" type="number" value={seoForm.blogsPosted}
                  onChange={e => setSeoForm(f => ({ ...f, blogsPosted: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Keywords Ranked</Label>
                <Input className="mt-1" type="number" value={seoForm.keywordsRanked}
                  onChange={e => setSeoForm(f => ({ ...f, keywordsRanked: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Traffic Growth (e.g. +18%)</Label>
                <Input className="mt-1" value={seoForm.trafficGrowth} placeholder="+18%"
                  onChange={e => setSeoForm(f => ({ ...f, trafficGrowth: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Backlinks Added</Label>
                <Input className="mt-1" type="number" value={seoForm.backlinksAdded}
                  onChange={e => setSeoForm(f => ({ ...f, backlinksAdded: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">SEO Score (0–100)</Label>
              <Input className="mt-1" type="number" value={seoForm.seoScore} placeholder="e.g. 78"
                onChange={e => setSeoForm(f => ({ ...f, seoScore: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea className="mt-1" rows={3} value={seoForm.notes} placeholder="Client-visible notes..."
                onChange={e => setSeoForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeoDialog(false)}>Cancel</Button>
            <Button onClick={() => saveSeoReport.mutate(seoForm)} disabled={saveSeoReport.isPending}>
              {saveSeoReport.isPending ? "Saving…" : "Save Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
