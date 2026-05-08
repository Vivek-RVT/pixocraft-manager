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
} from "lucide-react";
import { motion } from "framer-motion";
import { getYear, getMonth } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
    <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-gray-900">{project.projectName}</div>
          <div className="text-xs text-gray-500 capitalize">{project.projectType === "webapp" ? "Web App" : "Website"}</div>
        </div>
        <Badge variant="outline" className={cn("text-xs text-white border-transparent", STAGE_COLORS[project.stage])}>
          {STAGE_LABELS[project.stage] ?? project.stage}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-gray-500">Progress</div>
          <div className="font-semibold text-gray-900">{progress}%</div>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-gray-500">Expected delivery</div>
          <div className="font-semibold text-gray-900">{project.expectedDelivery ? formatDate(project.expectedDelivery) : "—"}</div>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-gray-500">Live URL</div>
          <div className="font-semibold text-blue-600 truncate">{project.liveUrl || "—"}</div>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-gray-500">Stage</div>
          <div className="font-semibold text-gray-900 capitalize">{project.stage.replace("-", " ")}</div>
        </div>
      </div>
      <div className="grid gap-2 text-xs">
        <div className="rounded-xl border bg-muted/20 p-3">
          <div className="text-gray-500 mb-1">Completed</div>
          <div className="text-gray-900 whitespace-pre-wrap">{project.completedNotes || "—"}</div>
        </div>
        <div className="rounded-xl border bg-muted/20 p-3">
          <div className="text-gray-500 mb-1">Pending</div>
          <div className="text-gray-900 whitespace-pre-wrap">{project.pendingNotes || "—"}</div>
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
        "rounded-full px-4 py-2 text-sm font-medium transition",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted text-muted-foreground hover:text-foreground",
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/customers">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground flex items-center justify-center text-xl font-semibold shadow-md shadow-primary/20">
                {customer.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="text-xl font-semibold">{customer.name}</div>
                {customer.businessName && (
                  <div className="text-sm text-muted-foreground">
                    {customer.businessName}
                  </div>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => setInfoOpen(true)}
                    title="More info"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-muted-foreground hover:text-blue-600"
                    onClick={() => setPortalOpen(true)}
                    title="Client Portal"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Revenue</div>
                <div className="font-semibold tabular-nums">
                  {formatCurrency(totals.revenue)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Profit</div>
                <div className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totals.profit)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Paid</div>
                <div className="font-semibold tabular-nums">
                  {formatCurrency(totals.paid)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Pending</div>
                <div className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                  {formatCurrency(totals.pending)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-6 mt-4">
            <TabButton active={customerTab === "overview"} onClick={() => setCustomerTab("overview")}>Overview</TabButton>
            <TabButton active={customerTab === "digital"} onClick={() => setCustomerTab("digital")}>Digital</TabButton>
            <TabButton active={customerTab === "web"} onClick={() => setCustomerTab("web")}>Web</TabButton>
            <TabButton active={customerTab === "monthly"} onClick={() => setCustomerTab("monthly")}>Monthly</TabButton>
          </div>

          {customerTab === "monthly" && (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">Monthly Progress Reports</div>
                  <div className="text-xs text-muted-foreground">
                    {dmReports.length} DM · {seoReports.length} SEO saved
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => { setDmForm(blankDm()); setDmDialog(true); }}
                  >
                    <Megaphone className="h-3.5 w-3.5" />
                    Add DM
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => { setSeoForm(blankSeo()); setSeoDialog(true); }}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Add SEO
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Context Stats Strip — always visible, content varies by tab */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {customerTab === "overview" && <>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> Total Revenue</div>
            <div className="text-base font-bold mt-0.5">{formatCurrency(totals.revenue)}</div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="w-3 h-3" /> Outstanding</div>
            <div className="text-base font-bold mt-0.5 text-amber-600 dark:text-amber-400">{formatCurrency(totals.pending)}</div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Zap className="w-3 h-3" /> Monthly MRR</div>
            <div className="text-base font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">{formatCurrency(webMRR + digitalMRR)}</div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Activity className="w-3 h-3" /> Reports</div>
            <div className="text-base font-bold mt-0.5">{dmReports.length + seoReports.length}</div>
          </div>
        </>}
        {customerTab === "digital" && <>
          <div className="rounded-xl border bg-purple-50 dark:bg-purple-950/20 p-3">
            <div className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1.5"><Megaphone className="w-3 h-3" /> Digital MRR</div>
            <div className="text-base font-bold mt-0.5 text-purple-700 dark:text-purple-300">{formatCurrency(digitalMRR)}</div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Zap className="w-3 h-3" /> Active Services</div>
            <div className="text-base font-bold mt-0.5">{digitalServices.filter(s => s.status === "active").length}</div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><FileText className="w-3 h-3" /> DM Reports</div>
            <div className="text-base font-bold mt-0.5">{dmReports.length}</div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> Total Leads</div>
            <div className="text-base font-bold mt-0.5">{dmReports.reduce((acc, r) => acc + (r.leadsGenerated ?? 0), 0)}</div>
          </div>
        </>}
        {customerTab === "web" && <>
          <div className="rounded-xl border bg-blue-50 dark:bg-blue-950/20 p-3">
            <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5"><Globe className="w-3 h-3" /> Web MRR</div>
            <div className="text-base font-bold mt-0.5 text-blue-700 dark:text-blue-300">{formatCurrency(webMRR)}</div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Zap className="w-3 h-3" /> Active Services</div>
            <div className="text-base font-bold mt-0.5">{webServices.filter(s => s.status === "active").length}</div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Layers className="w-3 h-3" /> Projects</div>
            <div className="text-base font-bold mt-0.5">{projects.length}</div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><FileText className="w-3 h-3" /> SEO Reports</div>
            <div className="text-base font-bold mt-0.5">{seoReports.length}</div>
          </div>
        </>}
        {customerTab === "monthly" && <>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Zap className="w-3 h-3" /> Total MRR</div>
            <div className="text-base font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">{formatCurrency(webMRR + digitalMRR)}</div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Megaphone className="w-3 h-3" /> DM Reports</div>
            <div className="text-base font-bold mt-0.5">{dmReports.length}</div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Globe className="w-3 h-3" /> SEO Reports</div>
            <div className="text-base font-bold mt-0.5">{seoReports.length}</div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> Total Leads</div>
            <div className="text-base font-bold mt-0.5">{dmReports.reduce((acc, r) => acc + (r.leadsGenerated ?? 0), 0)}</div>
          </div>
        </>}
      </div>

      {/* Recent Activity — always visible, compact with View More popup */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 shrink-0" /> Recent Activity
            </CardTitle>
            <CardDescription>Latest events with this client</CardDescription>
          </div>
          {filteredActivityEvents.length > 5 && (
            <Button size="sm" variant="outline" onClick={() => setActivityOpen(true)} className="shrink-0 text-xs">
              View all {filteredActivityEvents.length}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {filteredActivityEvents.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No activity yet for this category.
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
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
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground pt-1 pb-0.5 border-t transition-colors"
                >
                  + {filteredActivityEvents.length - 5} more activities — View all
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service History — Overview tab only */}
      {customerTab === "overview" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4 shrink-0" /> Service History
              </CardTitle>
              <CardDescription>All one-time services delivered to this client</CardDescription>
            </div>
            <Button size="sm" onClick={() => setServiceOpen(true)} className="shrink-0">
              <Plus className="sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </CardHeader>
          <CardContent>
            {oneTimeServices.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">No one-time services yet.</div>
            ) : (
              <div className="space-y-2">
                {oneTimeServices.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-lg border bg-muted/10 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.serviceName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {s.serviceType === "web" ? "Web" : s.serviceType === "digital" ? "Digital" : "Other"}
                        {s.date ? ` · ${formatDate(s.date)}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-sm font-semibold tabular-nums">{formatCurrency(s.priceSold)}</div>
                      <Badge variant="outline" className={cn("text-[10px] capitalize", s.paymentStatus === "paid" && "border-emerald-400 text-emerald-600", s.paymentStatus === "pending" && "border-amber-400 text-amber-600", s.paymentStatus === "partial" && "border-blue-400 text-blue-600")}>
                        {s.paymentStatus}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[10px] capitalize", s.deliveryStatus === "delivered" && "border-emerald-400 text-emerald-600", s.deliveryStatus === "pending" && "border-amber-400 text-amber-600")}>
                        {s.deliveryStatus}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Project Progress */}
      {customerTab === "web" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 shrink-0" /> Project Progress
              </CardTitle>
              <CardDescription>Website & web app projects visible in client dashboard</CardDescription>
            </div>
            <Button size="sm" onClick={() => { setEditProject(undefined); setProjectDialog(true); }} className="shrink-0">
              <Plus className="sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No projects yet. Add one to show progress in the client dashboard.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {projects.map((proj) => (
                  <div key={proj.id} className="space-y-2">
                    <ServiceDetailCard project={proj} />
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-xs gap-1.5"
                      onClick={() => { setEditProject(proj); setProjectDialog(true); }}
                    >
                      <Pencil className="w-3 h-3" /> Edit Project
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {customerTab === "digital" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">Digital services</CardTitle>
                <CardDescription>Digital marketing subscriptions and monthly performance</CardDescription>
              </div>
              <Button size="sm" onClick={() => setServiceOpen(true)} className="shrink-0">
                <Plus className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Add service</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-purple-50 dark:bg-purple-950/20 p-3">
                <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-medium">
                  <Megaphone className="w-3.5 h-3.5" /> Digital MRR
                </div>
                <div className="text-lg font-bold text-purple-700 dark:text-purple-300 mt-0.5">
                  {formatCurrency(digitalMRR)}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Services</div>
                <div className="text-lg font-bold">{digitalServiceCards.length}</div>
              </div>
            </div>
            {digitalServiceCards.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No digital services yet.
              </div>
            ) : (
              <div className="space-y-3">
                {digitalServiceCards.map((ds) => {
                  const isEditing = dsEditId === ds.id;
                  const isSaving = updateMonthlyDigital.isPending || updateOneTimeService.isPending;
                  return (
                    <div key={ds.id} className="rounded-2xl border bg-muted/20 p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-sm leading-tight">{ds.serviceName}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{ds.serviceType === "web" ? "Web" : "Digital"} · {ds.billingType === "monthly" ? "Monthly" : "One time"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-xs", ds.status === "active" && "border-emerald-400 text-emerald-600", ds.status === "paused" && "border-amber-400 text-amber-600", ds.status === "cancelled" && "border-slate-400 text-slate-500", ds.status === "delivered" && "border-blue-400 text-blue-600")}>
                            {dsStatusLabel(ds.status)}
                          </Badge>
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

                      {isEditing ? (
                        <div className="rounded-lg border bg-white p-2.5 space-y-2.5">
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
                          <div className="rounded-lg border bg-white dark:bg-muted/10 p-3">
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
                        <div className="rounded-lg bg-white p-3 border">
                          <div className="text-muted-foreground">Charge</div>
                          <div className="font-semibold">{formatCurrency(ds.charge)}{ds.billingType === "monthly" ? "/mo" : ""}</div>
                        </div>
                        <div className="rounded-lg bg-white p-3 border">
                          <div className="text-muted-foreground">Cost</div>
                          <div className="font-semibold">{formatCurrency(ds.cost)}{ds.billingType === "monthly" ? "/mo" : ""}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {ds.discount > 0 && <span>Discount: {formatCurrency(ds.discount)}</span>}
                        <span>Since: {formatDate(ds.startDate)}</span>
                      </div>
                      {ds.billingType === "monthly" ? <MiniMonthGrid completions={ds.completions} /> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {customerTab === "monthly" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Monthly services</CardTitle>
            <CardDescription>Recurring website services and maintenance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-3">
                <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <Globe className="w-3.5 h-3.5" /> Website MRR
                </div>
                <div className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                  {formatCurrency(webMRR)}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Services</div>
                <div className="text-lg font-bold">{webServices.length}</div>
              </div>
            </div>
            {webServices.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No monthly website services yet.
              </div>
            ) : (
              <div className="space-y-3">
                {webServices.map((ws) => (
                  <div key={ws.id} className="rounded-2xl border bg-muted/20 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-sm">{ws.websiteName}</div>
                        <div className="text-xs text-muted-foreground">Website service</div>
                      </div>
                      <Badge variant="outline" className={cn("text-xs capitalize", ws.status === "active" && "border-emerald-400 text-emerald-600", ws.status === "paused" && "border-amber-400 text-amber-600", ws.status === "cancelled" && "border-red-400 text-red-500")}>
                        {ws.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-white p-3 border">
                        <div className="text-muted-foreground">Charge</div>
                        <div className="font-semibold">{formatCurrency(ws.monthlyCharge)}/mo</div>
                      </div>
                      <div className="rounded-lg bg-white p-3 border">
                        <div className="text-muted-foreground">Cost</div>
                        <div className="font-semibold">{formatCurrency(ws.monthlyCost)}/mo</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {ws.discount > 0 && <span>Discount: {formatCurrency(ws.discount)}</span>}
                      <span>Since: {formatDate(ws.startDate)}</span>
                    </div>
                    <MiniMonthGrid completions={ws.completions} />
                  </div>
                ))}
              </div>
            )}
            <div className="pt-2 border-t">
              <Link href="/monthly-services">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  Manage monthly services →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {customerTab === "monthly" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4 shrink-0" /> Service history
            </CardTitle>
            <CardDescription>
              {services?.length ?? 0} service
              {services?.length === 1 ? "" : "s"} delivered
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setServiceOpen(true)} className="shrink-0">
            <Plus className="sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add service</span>
          </Button>
        </CardHeader>
        <CardContent>
          {!services || services.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No services yet for this customer.
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover-elevate"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{s.serviceName}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(s.date)} · Profit{" "}
                      {formatCurrency(Number(s.profit ?? 0))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={paymentBadge(s.paymentStatus)}
                    >
                      {s.paymentStatus}
                    </Badge>
                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums">
                        {formatCurrency(Number(s.priceSold))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Paid {formatCurrency(Number(s.amountPaid ?? 0))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
        </Card>
      )}

      {/* DM Reports Card — Monthly Tab */}
      {customerTab === "monthly" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Megaphone className="w-4 h-4 shrink-0" /> Digital Marketing Reports
              </CardTitle>
              <CardDescription>Social media & DM monthly reports</CardDescription>
            </div>
            <Button size="sm" onClick={() => { setDmForm(blankDm()); setDmDialog(true); }} className="shrink-0">
              <Plus className="sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </CardHeader>
          <CardContent>
            {dmReports.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No DM reports yet.</div>
            ) : (
              <div className="space-y-2">
                {dmReports
                  .slice()
                  .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)
                  .map((r) => {
                    const total = (r.uploadedVideos ?? 0) + (r.uploadedPosts ?? 0) + (r.uploadedReels ?? 0) + (r.uploadedStories ?? 0);
                    const target = (r.targetVideos ?? 0) + (r.targetPosts ?? 0) + (r.targetReels ?? 0) + (r.targetStories ?? 0);
                    return (
                      <div key={r.id} className="border rounded-lg p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold">{MONTHS[r.month - 1]} {r.year}</div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                              {r.platforms && <span>{r.platforms}</span>}
                              {r.plan && <span className="capitalize">{r.plan} plan</span>}
                              <span>Content: {total}/{target}</span>
                              <span>+{r.followersGained ?? 0} followers</span>
                              <span>{r.leadsGenerated ?? 0} leads</span>
                              {r.engagementGrowth && <span>Engagement: {r.engagementGrowth}</span>}
                            </div>
                            {r.summaryNotes && (
                              <div className="text-xs text-muted-foreground italic mt-1 line-clamp-2">{r.summaryNotes}</div>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
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
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SEO Reports Card — Monthly Tab */}
      {customerTab === "monthly" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4 shrink-0" /> Web / SEO Reports
              </CardTitle>
              <CardDescription>Search performance & SEO monthly reports</CardDescription>
            </div>
            <Button size="sm" onClick={() => { setSeoForm(blankSeo()); setSeoDialog(true); }} className="shrink-0">
              <Plus className="sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </CardHeader>
          <CardContent>
            {seoReports.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No SEO reports yet.</div>
            ) : (
              <div className="space-y-2">
                {seoReports
                  .slice()
                  .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)
                  .map((r) => (
                    <div key={r.id} className="border rounded-lg p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">{MONTHS[r.month - 1]} {r.year}</div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                            <span>{r.blogsPosted} blogs posted</span>
                            <span>{r.keywordsRanked} keywords</span>
                            {r.trafficGrowth && <span>Traffic: {r.trafficGrowth}</span>}
                            {r.backlinksAdded > 0 && <span>{r.backlinksAdded} backlinks</span>}
                            {r.seoScore != null && <span>Score: {r.seoScore}/100</span>}
                          </div>
                          {r.notes && (
                            <div className="text-xs text-muted-foreground italic mt-1 line-clamp-2">{r.notes}</div>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
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
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
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
