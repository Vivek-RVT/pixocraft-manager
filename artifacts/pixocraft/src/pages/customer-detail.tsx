import { useState } from "react";
import { Link, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useGetCustomer,
  getGetCustomerQueryKey,
  useListServices,
  getListServicesQueryKey,
} from "@workspace/api-client-react";
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

const STAGES = ["planning", "ui-design", "development", "testing", "seo", "completed"] as const;
const STAGE_LABELS: Record<string, string> = {
  planning: "Planning",
  "ui-design": "UI Design",
  development: "Development",
  testing: "Testing",
  seo: "SEO",
  completed: "Completed",
};
const STAGE_COLORS: Record<string, string> = {
  planning: "bg-slate-500",
  "ui-design": "bg-purple-500",
  development: "bg-blue-500",
  testing: "bg-amber-500",
  seo: "bg-green-500",
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

  const [editOpen, setEditOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [pwDialog, setPwDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [projectDialog, setProjectDialog] = useState(false);
  const [editProject, setEditProject] = useState<ServiceProject | undefined>();
  const [showReports, setShowReports] = useState(false);
  const [reportTab, setReportTab] = useState<"dm" | "seo">("dm");
  const [dmDialog, setDmDialog] = useState(false);
  const [seoDialog, setSeoDialog] = useState(false);
  const [editDm, setEditDm] = useState<DMReport | undefined>();
  const [editSeo, setEditSeo] = useState<SeoReport | undefined>();

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

  const { data: detail, isLoading } = useGetCustomer(id, {
    query: { queryKey: getGetCustomerQueryKey(id), enabled: Number.isFinite(id) },
  });
  const customer = detail?.customer;

  const { data: services } = useListServices(
    { customerId: id },
    {
      query: {
        queryKey: getListServicesQueryKey({ customerId: id }),
        enabled: Number.isFinite(id),
      },
    },
  );

  const { data: webServices = [] } = useQuery<MonthlyWebService[]>({
    queryKey: ["monthly-website", id],
    queryFn: () => apiFetch(`/monthly-website?customerId=${id}`),
    enabled: Number.isFinite(id),
  });

  const { data: digitalServices = [] } = useQuery<MonthlyDigitalService[]>({
    queryKey: ["monthly-digital", id],
    queryFn: () => apiFetch(`/monthly-digital?customerId=${id}`),
    enabled: Number.isFinite(id),
  });

  const { data: portal } = useQuery<ClientPortal | null>({
    queryKey: ["portal", id],
    queryFn: () => apiFetch(`/admin/portal/${id}`),
    enabled: Number.isFinite(id),
  });

  const { data: projects = [] } = useQuery<ServiceProject[]>({
    queryKey: ["projects", id],
    queryFn: () => apiFetch(`/admin/projects/${id}`),
    enabled: Number.isFinite(id),
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

  const totals = (services ?? []).reduce(
    (acc, s) => {
      acc.revenue += Number(s.priceSold);
      acc.profit += Number(s.profit ?? 0);
      acc.paid += Number(s.amountPaid ?? 0);
      acc.pending += Number(s.priceSold) - Number(s.amountPaid ?? 0);
      return acc;
    },
    { revenue: 0, profit: 0, paid: 0, pending: 0 },
  );

  const webMRR = webServices
    .filter((s) => s.status === "active")
    .reduce((acc, s) => acc + s.monthlyCharge, 0);
  const digitalMRR = digitalServices
    .filter((s) => s.status === "active")
    .reduce((acc, s) => acc + s.monthlyCharge, 0);

  const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const portalLink = `${window.location.origin}${BASE}/portal`;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Customer not found.</p>
        <Link href="/customers">
          <Button variant="ghost" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to customers
          </Button>
        </Link>
      </div>
    );
  }

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
        <CardContent className="pt-6">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm pt-6 border-t mt-6">
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{customer.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="w-4 h-4" />
              <span>
                First contact:{" "}
                <span className="text-foreground font-medium">
                  {customer.contactedAt
                    ? formatDate(customer.contactedAt)
                    : formatDate(customer.createdAt)}
                </span>
              </span>
            </div>
          </div>
          {customer.notes && (
            <div className="mt-4 text-sm text-muted-foreground italic">
              "{customer.notes}"
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Portal Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-base font-semibold">Client Portal</CardTitle>
            </div>
            {portal ? (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  portal.isActive
                    ? "border-emerald-400 text-emerald-600"
                    : "border-red-400 text-red-500",
                )}
              >
                {portal.isActive ? "Active" : "Inactive"}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Not set up
              </Badge>
            )}
          </div>
          <CardDescription>
            Give {customer.name.split(" ")[0]} password-only access to their project dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
              <a href={portalLink} target="_blank" rel="noopener noreferrer">
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => { setNewPassword(""); setPwDialog(true); }}
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
        </CardContent>
      </Card>

      {/* Project Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 shrink-0" /> Project Progress
            </CardTitle>
            <CardDescription>Website & web app projects visible in client dashboard</CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => { setEditProject(undefined); setProjectDialog(true); }}
            className="shrink-0"
          >
            <Plus className="sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No projects yet. Add one to show progress in the client dashboard.
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((proj) => {
                const stageIdx = STAGES.indexOf(proj.stage as typeof STAGES[number]);
                const stagePct = stageIdx >= 0 ? Math.round(((stageIdx + 1) / STAGES.length) * 100) : 0;
                const displayPct = proj.progress > 0 ? proj.progress : stagePct;
                return (
                  <div key={proj.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div>
                        <div className="font-medium text-sm">{proj.projectName}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {proj.projectType === "webapp" ? "Web App" : "Website"}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge
                          variant="outline"
                          className={cn("text-xs text-white border-transparent", STAGE_COLORS[proj.stage])}
                        >
                          {STAGE_LABELS[proj.stage] ?? proj.stage}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => { setEditProject(proj); setProjectDialog(true); }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteProject.mutate(proj.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                          style={{ width: `${displayPct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground tabular-nums w-9 text-right">
                        {displayPct}%
                      </span>
                    </div>
                    {proj.expectedDelivery && (
                      <div className="text-xs text-muted-foreground mt-1.5">
                        Est. delivery: {formatDate(proj.expectedDelivery)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {(webServices.length > 0 || digitalServices.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Monthly services
            </CardTitle>
            <CardDescription>
              Recurring website and digital marketing subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(webMRR > 0 || digitalMRR > 0) && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {webMRR > 0 && (
                  <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                      <Globe className="w-3.5 h-3.5" /> Website MRR
                    </div>
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                      {formatCurrency(webMRR)}
                    </div>
                  </div>
                )}
                {digitalMRR > 0 && (
                  <div className="rounded-lg border bg-purple-50 dark:bg-purple-950/20 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-medium">
                      <Megaphone className="w-3.5 h-3.5" /> Digital MRR
                    </div>
                    <div className="text-lg font-bold text-purple-700 dark:text-purple-300 mt-0.5">
                      {formatCurrency(digitalMRR)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {webServices.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                  <Globe className="w-3.5 h-3.5" /> Website services
                </div>
                <div className="space-y-3">
                  {webServices.map((ws) => (
                    <div key={ws.id} className="border rounded-lg p-3 bg-muted/20">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm">{ws.websiteName}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs capitalize",
                            ws.status === "active" && "border-emerald-400 text-emerald-600",
                            ws.status === "paused" && "border-amber-400 text-amber-600",
                            ws.status === "cancelled" && "border-red-400 text-red-500",
                          )}
                        >
                          {ws.status}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                        <span>Charge: {formatCurrency(ws.monthlyCharge)}/mo</span>
                        <span>Cost: {formatCurrency(ws.monthlyCost)}/mo</span>
                        {ws.discount > 0 && <span>Discount: {formatCurrency(ws.discount)}</span>}
                        <span>Since: {formatDate(ws.startDate)}</span>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        {currentYear} completion
                      </div>
                      <MiniMonthGrid completions={ws.completions} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {digitalServices.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2">
                  <Megaphone className="w-3.5 h-3.5" /> Digital marketing services
                </div>
                <div className="space-y-3">
                  {digitalServices.map((ds) => (
                    <div key={ds.id} className="border rounded-lg p-3 bg-muted/20">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm">{ds.serviceName}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs capitalize",
                            ds.status === "active" && "border-emerald-400 text-emerald-600",
                            ds.status === "paused" && "border-amber-400 text-amber-600",
                            ds.status === "cancelled" && "border-red-400 text-red-500",
                          )}
                        >
                          {ds.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-2">
                        {ds.platform && <span>Platform: {ds.platform}</span>}
                        <span>Charge: {formatCurrency(ds.monthlyCharge)}/mo</span>
                        <span>Cost: {formatCurrency(ds.monthlyCost)}/mo</span>
                        {ds.discount > 0 && <span>Discount: {formatCurrency(ds.discount)}</span>}
                        <span>Since: {formatDate(ds.startDate)}</span>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        {currentYear} completion
                      </div>
                      <MiniMonthGrid completions={ds.completions} />
                    </div>
                  ))}
                </div>
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

      {/* Monthly Reports Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Megaphone className="w-4 h-4 shrink-0" /> Monthly Reports
              </CardTitle>
              <CardDescription>DM and SEO reports visible in client portal</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={reportTab === "dm" ? "default" : "outline"}
                onClick={() => setReportTab("dm")}
              >
                DM
              </Button>
              <Button
                size="sm"
                variant={reportTab === "seo" ? "default" : "outline"}
                onClick={() => setReportTab("seo")}
              >
                SEO
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reportTab === "dm" && (
            <div className="space-y-3">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setDmForm(blankDm());
                  setDmDialog(true);
                }}
              >
                <Plus className="mr-2 h-3.5 w-3.5" /> Add / Update DM Report
              </Button>
              {dmReports.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">No DM reports yet.</div>
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
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="font-semibold">{MONTHS[r.month - 1]} {r.year}</div>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span>📦 {total}/{target}</span>
                              <span>👥 +{r.followersGained ?? 0}</span>
                              <span>🎯 {r.leadsGenerated ?? 0} leads</span>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 shrink-0"
                              onClick={() => {
                                const platforms = r.platforms ?? "";
                                setDmForm({
                                  year: String(r.year), month: String(r.month),
                                  platforms, plan: r.plan ?? "",
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
                          {r.summaryNotes && (
                            <div className="text-xs text-muted-foreground italic truncate">{r.summaryNotes}</div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
          {reportTab === "seo" && (
            <div className="space-y-3">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSeoForm(blankSeo());
                  setSeoDialog(true);
                }}
              >
                <Plus className="mr-2 h-3.5 w-3.5" /> Add / Update SEO Report
              </Button>
              {seoReports.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">No SEO reports yet.</div>
              ) : (
                <div className="space-y-2">
                  {seoReports
                    .slice()
                    .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)
                    .map((r) => (
                      <div key={r.id} className="border rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="font-semibold">{MONTHS[r.month - 1]} {r.year}</div>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span>📝 {r.blogsPosted} blogs</span>
                            <span>🔑 {r.keywordsRanked} kw</span>
                            {r.seoScore != null && <span>⭐ {r.seoScore}/100</span>}
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
                        {r.notes && (
                          <div className="text-xs text-muted-foreground italic truncate">{r.notes}</div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
        onOpenChange={setServiceOpen}
        presetCustomerId={customer.id}
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
