import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useClientAuth } from "@/hooks/use-client-auth";
import { formatCurrency } from "@/lib/format";
import {
  Globe,
  Megaphone,
  Search,
  Code2,
  LogOut,
  CheckCircle2,
  Clock,
  ExternalLink,
  Phone,
  MessageCircle,
  TrendingUp,
  Users,
  Target,
  Zap,
  Paintbrush,
  Bot,
  BarChart3,
  Star,
  ArrowLeft,
  ChevronRight,
  Play,
  FileText,
  Layers,
  Activity,
} from "lucide-react";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Types ────────────────────────────────────────────────────────────────────

type Completion = { id: number; serviceId: number; year: number; month: number; completed: boolean };

type ServiceProject = {
  id: number; projectType: string; projectName: string; stage: string;
  progress: number; completedNotes: string | null; pendingNotes: string | null;
  liveUrl: string | null; expectedDelivery: string | null;
};

type WebService = {
  id: number; websiteName: string; monthlyCharge: string; monthlyCost: string;
  discount: string; startDate: string; status: string; completions: Completion[];
};

type OneTimeWebProject = {
  id: number;
  serviceName: string;
  serviceType: string;
  priceSold: string;
  paymentStatus: string;
  deliveryStatus: string;
  date: string;
};

type DigitalService = {
  id: number; serviceName: string; platform: string | null; monthlyCharge: string;
  startDate: string; status: string; completions: Completion[];
};

type DMReport = {
  id: number; year: number; month: number; platforms: string | null; plan: string | null;
  targetVideos: number; targetPosts: number; targetReels: number; targetStories: number;
  uploadedVideos: number; uploadedPosts: number; uploadedReels: number; uploadedStories: number;
  followersGained: number; engagementGrowth: string | null; leadsGenerated: number;
  adSpend: string; summaryNotes: string | null;
};

type SeoReport = {
  id: number; year: number; month: number; blogsPosted: number; keywordsRanked: number;
  trafficGrowth: string | null; backlinksAdded: number; seoScore: number | null; notes: string | null;
};

type OneTimeService = {
  id: number; serviceName: string; serviceType: string; priceSold: string;
  paymentStatus: string; deliveryStatus: string; date: string;
};

type DashboardData = {
  customer: { id: number; name: string; businessName: string | null; phone: string | null; email: string | null };
  services: OneTimeService[];
  webProjects: OneTimeWebProject[];
  projects: ServiceProject[];
  dmReports: DMReport[];
  seoReports: SeoReport[];
  webServices: WebService[];
  digitalServices: DigitalService[];
};

type View =
  | { screen: "tabs"; tab: "web" | "digital" | "services" }
  | { screen: "project-detail"; project: ServiceProject }
  | { screen: "web-service-detail"; service: WebService }
  | { screen: "digital-detail"; service: DigitalService; reports: DMReport[] };

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES: Record<string, { label: string; color: string; gradient: string; pct: number }> = {
  planning:    { label: "Planning",    color: "bg-slate-400",  gradient: "from-slate-400 to-slate-500",   pct: 10 },
  "ui-design": { label: "UI Design",   color: "bg-purple-500", gradient: "from-purple-400 to-purple-600", pct: 25 },
  development: { label: "Development", color: "bg-blue-500",   gradient: "from-blue-400 to-blue-600",     pct: 55 },
  testing:     { label: "Testing",     color: "bg-amber-500",  gradient: "from-amber-400 to-amber-600",   pct: 80 },
  seo:         { label: "SEO",         color: "bg-green-500",  gradient: "from-green-400 to-green-600",   pct: 92 },
  completed:   { label: "Completed",   color: "bg-emerald-600",gradient: "from-emerald-400 to-emerald-600",pct: 100 },
};
const STAGE_KEYS = Object.keys(STAGES);

const PLATFORM_CONFIG: Record<string, { emoji: string; gradient: string; label: string }> = {
  instagram:  { emoji: "📸", gradient: "from-pink-500 to-rose-600",   label: "Instagram" },
  facebook:   { emoji: "👥", gradient: "from-blue-500 to-blue-700",   label: "Facebook" },
  youtube:    { emoji: "▶️", gradient: "from-red-500 to-red-700",     label: "YouTube" },
  google:     { emoji: "🔍", gradient: "from-blue-400 to-blue-600",   label: "Google" },
  linkedin:   { emoji: "💼", gradient: "from-blue-600 to-blue-800",   label: "LinkedIn" },
  whatsapp:   { emoji: "💬", gradient: "from-green-500 to-green-700", label: "WhatsApp" },
};

const UPSELLS = [
  { icon: BarChart3,    title: "Google Ads",            desc: "Drive targeted traffic with paid search",  color: "from-blue-500 to-blue-700" },
  { icon: Megaphone,    title: "Social Media Growth",   desc: "Build your audience across all platforms", color: "from-pink-500 to-rose-600" },
  { icon: Search,       title: "SEO Domination",        desc: "Rank #1 on Google with proven strategies", color: "from-green-500 to-emerald-600" },
  { icon: MessageCircle,title: "WhatsApp Automation",   desc: "Automate your client communications",      color: "from-green-400 to-teal-600" },
  { icon: Bot,          title: "Smart CRM",             desc: "Manage leads and customers efficiently",   color: "from-violet-500 to-purple-700" },
  { icon: Globe,        title: "Website Upgrade",       desc: "Refresh your website with modern design",  color: "from-sky-500 to-blue-600" },
  { icon: Paintbrush,   title: "Branding Package",      desc: "Complete brand identity for your business",color: "from-orange-400 to-red-500" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPlatformConfig(platform: string | null | undefined) {
  if (!platform) return { emoji: "📊", gradient: "from-gray-400 to-gray-600", label: "Digital" };
  const key = platform.toLowerCase();
  return PLATFORM_CONFIG[key] ?? { emoji: "📊", gradient: "from-gray-400 to-gray-600", label: platform };
}

function completionsThisYear(completions: Completion[]) {
  const year = new Date().getFullYear();
  const done = completions.filter(c => c.year === year && c.completed);
  return done.length;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function ProgressBar({ pct, gradient }: { pct: number; gradient: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

function MonthGrid({ completions, year }: { completions: Completion[]; year: number }) {
  const map = new Map<number, boolean>();
  for (const c of completions) {
    if (c.year === year) map.set(c.month, c.completed);
  }
  const now = new Date();
  const currentMonth = now.getFullYear() === year ? now.getMonth() + 1 : 12;

  return (
    <div className="grid grid-cols-12 gap-0.5">
      {MONTHS.map((m, i) => {
        const monthNum = i + 1;
        const done = map.get(monthNum) ?? false;
        const future = monthNum > currentMonth;
        return (
          <div key={m} className="flex flex-col items-center gap-0.5">
            <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold transition-all ${
              done ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200"
              : future ? "bg-gray-100 text-gray-300"
              : "bg-gray-200 text-gray-400"
            }`}>
              {done ? "✓" : m.slice(0, 1)}
            </div>
            <span className="text-[7px] text-gray-400">{m.slice(0,1)}</span>
          </div>
        );
      })}
    </div>
  );
}

function BackButton({ onBack, label = "Back" }: { onBack: () => void; label?: string }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-1.5 text-blue-600 font-semibold text-sm mb-4"
    >
      <ArrowLeft className="w-4 h-4" /> {label}
    </button>
  );
}

// ─── Project Detail ───────────────────────────────────────────────────────────

function ProjectDetail({ project, onBack }: { project: ServiceProject; onBack: () => void }) {
  const stageInfo = STAGES[project.stage] ?? STAGES.planning;
  const stageIdx = STAGE_KEYS.indexOf(project.stage);
  const displayPct = project.progress > 0 ? project.progress : stageInfo.pct;

  return (
    <div className="px-4 pb-10">
      <BackButton onBack={onBack} label="All Projects" />

      {/* Hero */}
      <div className={`rounded-2xl p-5 bg-gradient-to-br ${stageInfo.gradient} text-white mb-4 shadow-lg`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-xs font-semibold opacity-80 uppercase tracking-wider mb-1">
              {project.projectType === "webapp" ? "Web App" : "Website"} Project
            </div>
            <div className="text-xl font-bold leading-tight">{project.projectName}</div>
          </div>
          <div className="bg-white/20 rounded-xl px-2.5 py-1 text-xs font-bold">
            {stageInfo.label}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm font-semibold">
            <span className="opacity-80">Overall Progress</span>
            <span>{displayPct}%</span>
          </div>
          <div className="bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-white/90 rounded-full transition-all duration-1000"
              style={{ width: `${displayPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stage Tracker */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Project Stages</div>
        <div className="space-y-2">
          {STAGE_KEYS.map((key, idx) => {
            const s = STAGES[key];
            const done = idx < stageIdx;
            const current = idx === stageIdx;
            const upcoming = idx > stageIdx;
            return (
              <div key={key} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                current ? `bg-gradient-to-r ${s.gradient} text-white shadow-sm`
                : done ? "bg-emerald-50"
                : "bg-gray-50"
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  current ? "bg-white/30 text-white"
                  : done ? "bg-emerald-500 text-white"
                  : "bg-gray-200 text-gray-400"
                }`}>
                  {done ? "✓" : idx + 1}
                </div>
                <span className={`text-sm font-semibold ${
                  current ? "text-white"
                  : done ? "text-emerald-700"
                  : "text-gray-400"
                }`}>{s.label}</span>
                {current && <span className="ml-auto text-white/80 text-xs font-medium">In Progress</span>}
                {done && <CheckCircle2 className="ml-auto w-4 h-4 text-emerald-500" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Work Notes */}
      {(project.completedNotes || project.pendingNotes) && (
        <div className="grid grid-cols-1 gap-3 mb-4">
          {project.completedNotes && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
                <CheckCircle2 className="w-4 h-4" /> Completed Work
              </div>
              <p className="text-sm text-emerald-800 leading-relaxed">{project.completedNotes}</p>
            </div>
          )}
          {project.pendingNotes && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-sm mb-2">
                <Clock className="w-4 h-4" /> Pending Work
              </div>
              <p className="text-sm text-amber-800 leading-relaxed">{project.pendingNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Info Row */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        {project.expectedDelivery && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-2"><Clock className="w-4 h-4" /> Expected Delivery</span>
            <span className="font-bold text-gray-900">
              {new Date(project.expectedDelivery + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        )}
        {project.liveUrl && (
          <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-100">
            <span className="text-gray-500 flex items-center gap-2"><Globe className="w-4 h-4" /> Live Website</span>
            <a
              href={project.liveUrl.startsWith("http") ? project.liveUrl : `https://${project.liveUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-600 font-bold hover:underline"
            >
              View Site <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Web Service Detail ────────────────────────────────────────────────────────

function WebServiceDetail({ service, onBack }: { service: WebService; onBack: () => void }) {
  const year = new Date().getFullYear();
  const doneThisYear = service.completions.filter(c => c.year === year && c.completed).length;
  const totalDone = service.completions.filter(c => c.completed).length;

  return (
    <div className="px-4 pb-10">
      <BackButton onBack={onBack} label="All Web Services" />

      {/* Hero */}
      <div className="bg-gradient-to-br from-sky-500 to-blue-700 rounded-2xl p-5 text-white mb-4 shadow-lg">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-xs font-semibold opacity-80 uppercase tracking-wider mb-1">Website Maintenance</div>
            <div className="text-xl font-bold">{service.websiteName}</div>
          </div>
          <div className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
            service.status === "active" ? "bg-emerald-400/30 text-emerald-100" : "bg-white/20"
          }`}>
            {service.status}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-white/15 rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold">{doneThisYear}</div>
            <div className="text-xs opacity-80">Done {year}</div>
          </div>
          <div className="bg-white/15 rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold">{totalDone}</div>
            <div className="text-xs opacity-80">Total Done</div>
          </div>
          <div className="bg-white/15 rounded-xl p-2.5 text-center">
            <div className="text-sm font-bold">{formatCurrency(Number(service.monthlyCharge))}</div>
            <div className="text-xs opacity-80">/month</div>
          </div>
        </div>
      </div>

      {/* Year grid */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Monthly Delivery — {year}</div>
          <div className="text-xs text-emerald-600 font-bold">{doneThisYear}/12 completed</div>
        </div>
        <MonthGrid completions={service.completions} year={year} />
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500" /> Delivered</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-200" /> Pending</div>
        </div>
      </div>

      {/* Service since */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="text-sm text-gray-500">
          Service started: <span className="font-bold text-gray-900">
            {new Date(service.startDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Digital Service Detail ───────────────────────────────────────────────────

function DigitalDetail({
  service,
  reports,
  onBack,
}: {
  service: DigitalService;
  reports: DMReport[];
  onBack: () => void;
}) {
  const year = new Date().getFullYear();
  const pc = getPlatformConfig(service.platform);
  const doneThisYear = service.completions.filter(c => c.year === year && c.completed).length;

  return (
    <div className="px-4 pb-10">
      <BackButton onBack={onBack} label="All Platforms" />

      {/* Hero */}
      <div className={`bg-gradient-to-br ${pc.gradient} rounded-2xl p-5 text-white mb-4 shadow-lg`}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-3xl mb-2">{pc.emoji}</div>
            <div className="text-xl font-bold">{service.serviceName}</div>
            <div className="text-sm opacity-80 mt-0.5">{pc.label} Marketing</div>
          </div>
          <div className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
            service.status === "active" ? "bg-white/30" : "bg-white/20"
          }`}>
            {service.status}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="bg-white/15 rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold">{doneThisYear}/12</div>
            <div className="text-xs opacity-80">Delivered {year}</div>
          </div>
          <div className="bg-white/15 rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold">{reports.reduce((a, r) => a + (r.followersGained ?? 0), 0)}</div>
            <div className="text-xs opacity-80">Total Followers</div>
          </div>
          <div className="bg-white/15 rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold">{reports.reduce((a, r) => a + (r.leadsGenerated ?? 0), 0)}</div>
            <div className="text-xs opacity-80">Total Leads</div>
          </div>
        </div>
      </div>

      {/* Monthly completion grid */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Content Delivered — {year}</div>
          <div className="text-xs text-emerald-600 font-bold">{doneThisYear}/12 months</div>
        </div>
        <MonthGrid completions={service.completions} year={year} />
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500" /> Content Delivered</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-200" /> Pending</div>
        </div>
      </div>

      {/* Monthly Reports */}
      {reports.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Monthly Performance Reports</div>
          {reports.map((r) => {
            const platforms = r.platforms ? (() => { try { return JSON.parse(r.platforms!); } catch { return [r.platforms]; } })() : [];
            const totalTarget = (r.targetVideos ?? 0) + (r.targetPosts ?? 0) + (r.targetReels ?? 0) + (r.targetStories ?? 0);
            const totalDone = (r.uploadedVideos ?? 0) + (r.uploadedPosts ?? 0) + (r.uploadedReels ?? 0) + (r.uploadedStories ?? 0);
            const deliveryPct = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;

            return (
              <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-bold text-gray-900">{MONTHS[r.month - 1]} {r.year}</div>
                    {r.plan && <div className="text-xs text-gray-500 capitalize">{r.plan} Plan</div>}
                  </div>
                  {platforms.length > 0 && (
                    <div className="flex gap-1">
                      {(platforms as string[]).map((p) => {
                        const pConfig = getPlatformConfig(p);
                        return <span key={p} title={p} className="text-base">{pConfig.emoji}</span>;
                      })}
                    </div>
                  )}
                </div>

                {/* Content Delivery */}
                {totalTarget > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Content Delivery</span>
                      <span className="font-bold text-gray-800">{totalDone}/{totalTarget} pieces</span>
                    </div>
                    <ProgressBar pct={deliveryPct} gradient={pc.gradient} />
                    <div className="grid grid-cols-4 gap-1 mt-2">
                      {[
                        { label: "Videos", t: r.targetVideos ?? 0, d: r.uploadedVideos ?? 0 },
                        { label: "Posts",  t: r.targetPosts  ?? 0, d: r.uploadedPosts  ?? 0 },
                        { label: "Reels",  t: r.targetReels  ?? 0, d: r.uploadedReels  ?? 0 },
                        { label: "Stories",t: r.targetStories?? 0, d: r.uploadedStories?? 0 },
                      ].filter(x => x.t > 0).map((x) => (
                        <div key={x.label} className="bg-gray-50 rounded-lg p-1.5 text-center">
                          <div className="text-xs font-bold text-gray-900">{x.d}/{x.t}</div>
                          <div className="text-[9px] text-gray-500">{x.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                  <div className="text-center">
                    <div className="text-sm font-bold text-blue-700">+{r.followersGained ?? 0}</div>
                    <div className="text-[10px] text-gray-500">Followers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-green-700">{r.leadsGenerated ?? 0}</div>
                    <div className="text-[10px] text-gray-500">Leads</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-purple-700">{r.engagementGrowth ?? "—"}</div>
                    <div className="text-[10px] text-gray-500">Engagement</div>
                  </div>
                </div>

                {r.summaryNotes && (
                  <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-600 italic leading-relaxed">
                    📝 {r.summaryNotes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reports.length === 0 && (
        <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm shadow-sm border border-gray-100">
          Monthly reports will appear here as your Pixocraft manager adds them.
        </div>
      )}
    </div>
  );
}

// ─── Web Tab ──────────────────────────────────────────────────────────────────

function WebTab({ data, onView }: { data: DashboardData; onView: (v: View) => void }) {
  const hasProjects = data.projects.length > 0;
  const hasWebServices = data.webServices.length > 0;
  const webProjects = data.webProjects ?? [];
  const hasWebProjects = webProjects.length > 0;

  if (!hasProjects && !hasWebServices && !hasWebProjects) {
    return (
      <div className="px-4 py-12 text-center text-gray-400">
        <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No web projects yet. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-10 space-y-6">

      {hasWebProjects && (
        <section>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Website Development</div>
          <div className="space-y-3">
            {webProjects.map((svc) => (
              <div key={svc.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 text-sm">{svc.serviceName}</div>
                    <div className="text-xs text-gray-500 mt-1">One-time website development</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      svc.deliveryStatus === "completed"
                        ? "bg-emerald-100 text-emerald-700"
                        : svc.deliveryStatus === "in_progress"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                    }`}>
                      {svc.deliveryStatus === "in_progress" ? "In Progress" : svc.deliveryStatus}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      svc.paymentStatus === "paid"
                        ? "bg-green-100 text-green-700"
                        : svc.paymentStatus === "partial"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-rose-100 text-rose-700"
                    }`}>
                      {svc.paymentStatus}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-gray-500">Sold on {new Date(svc.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className="font-bold text-gray-900">{formatCurrency(Number(svc.priceSold))}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {hasProjects && (
        <section>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Active Projects</div>
          <div className="space-y-3">
            {data.projects.map((proj) => {
              const stageInfo = STAGES[proj.stage] ?? STAGES.planning;
              const displayPct = proj.progress > 0 ? proj.progress : stageInfo.pct;
              return (
                <button
                  key={proj.id}
                  onClick={() => onView({ screen: "project-detail", project: proj })}
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stageInfo.gradient} flex items-center justify-center shrink-0`}>
                        {proj.projectType === "webapp"
                          ? <Code2 className="w-4.5 h-4.5 text-white" />
                          : <Globe className="w-4.5 h-4.5 text-white" />}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{proj.projectName}</div>
                        <div className="text-xs text-gray-500 capitalize">
                          {proj.projectType === "webapp" ? "Web App" : "Website"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${stageInfo.color}`}>
                        {stageInfo.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Progress</span>
                      <span className="font-bold text-gray-900">{displayPct}%</span>
                    </div>
                    <ProgressBar pct={displayPct} gradient={stageInfo.gradient} />
                  </div>
                  {proj.expectedDelivery && (
                    <div className="mt-2.5 text-xs text-gray-500">
                      🗓 Est. {new Date(proj.expectedDelivery + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Website Maintenance Services */}
      {hasWebServices && (
        <section>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Website Maintenance</div>
          <div className="space-y-3">
            {data.webServices.map((ws) => {
              const year = new Date().getFullYear();
              const done = ws.completions.filter(c => c.year === year && c.completed).length;
              return (
                <button
                  key={ws.id}
                  onClick={() => onView({ screen: "web-service-detail", service: ws })}
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-sm truncate">{ws.websiteName}</div>
                      <div className="text-xs text-gray-500">Monthly Maintenance • {done}/12 done this year</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        ws.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}>{ws.status}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <MonthGrid completions={ws.completions} year={new Date().getFullYear()} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Digital Tab ──────────────────────────────────────────────────────────────

function DigitalTab({ data, onView }: { data: DashboardData; onView: (v: View) => void }) {
  const hasServices = data.digitalServices.length > 0;
  const hasSeo = data.seoReports.length > 0;

  if (!hasServices && data.dmReports.length === 0 && !hasSeo) {
    return (
      <div className="px-4 py-12 text-center text-gray-400">
        <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No digital marketing services yet.</p>
      </div>
    );
  }

  const latestSeo = data.seoReports[0];

  return (
    <div className="px-4 pb-10 space-y-6">

      {/* Active Platforms / Accounts */}
      {hasServices && (
        <section>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Active Platforms</div>
          <div className="space-y-3">
            {data.digitalServices.map((ds) => {
              const pc = getPlatformConfig(ds.platform);
              const year = new Date().getFullYear();
              const done = ds.completions.filter(c => c.year === year && c.completed).length;
              const totalFollowers = data.dmReports.reduce((a, r) => a + (r.followersGained ?? 0), 0);
              return (
                <button
                  key={ds.id}
                  onClick={() => onView({ screen: "digital-detail", service: ds, reports: data.dmReports })}
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pc.gradient} flex items-center justify-center text-2xl shrink-0 shadow-sm`}>
                      {pc.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-sm truncate">{ds.serviceName}</div>
                      <div className="text-xs text-gray-500">{pc.label} • {formatCurrency(Number(ds.monthlyCharge))}/mo</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        ds.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}>{ds.status}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                    <div className="text-center">
                      <div className="text-sm font-bold text-gray-900">{done}/12</div>
                      <div className="text-[10px] text-gray-500">Months Done</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-blue-700">+{totalFollowers}</div>
                      <div className="text-[10px] text-gray-500">Followers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-green-700">
                        {data.dmReports.reduce((a, r) => a + (r.leadsGenerated ?? 0), 0)}
                      </div>
                      <div className="text-[10px] text-gray-500">Leads</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <MonthGrid completions={ds.completions} year={new Date().getFullYear()} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* SEO Summary */}
      {hasSeo && latestSeo && (
        <section>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            SEO — {MONTHS[latestSeo.month - 1]} {latestSeo.year}
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm">SEO Performance</div>
                {latestSeo.seoScore != null && (
                  <div className="text-xs text-gray-500">Score: <span className="font-bold text-green-700">{latestSeo.seoScore}/100</span></div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Blogs Posted",    value: latestSeo.blogsPosted ?? 0,    icon: "📝" },
                { label: "Keywords Ranked", value: latestSeo.keywordsRanked ?? 0, icon: "🔑" },
                { label: "Backlinks Added", value: latestSeo.backlinksAdded ?? 0, icon: "🔗" },
                { label: "Traffic Growth",  value: latestSeo.trafficGrowth ?? "—", icon: "📈" },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-base mb-0.5">{item.icon}</div>
                  <div className="font-bold text-gray-900">{item.value}</div>
                  <div className="text-[10px] text-gray-500">{item.label}</div>
                </div>
              ))}
            </div>
            {latestSeo.notes && (
              <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-600 italic">{latestSeo.notes}</div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Services Tab ─────────────────────────────────────────────────────────────

function ServicesTab({ data }: { data: DashboardData }) {
  return (
    <div className="px-4 pb-10 space-y-6">

      {/* One-time services */}
      {data.services.length > 0 && (
        <section>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Your Services</div>
          <div className="space-y-2">
            {data.services.map((svc) => (
              <div key={svc.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{svc.serviceName}</div>
                    <div className="text-xs text-gray-500">{formatCurrency(Number(svc.priceSold))}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      svc.deliveryStatus === "completed" ? "bg-emerald-100 text-emerald-700"
                      : svc.deliveryStatus === "in_progress" ? "bg-blue-100 text-blue-700"
                      : "bg-amber-100 text-amber-700"
                    }`}>{svc.deliveryStatus === "in_progress" ? "In Progress" : svc.deliveryStatus ?? "Pending"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      svc.paymentStatus === "paid" ? "bg-green-100 text-green-700"
                      : svc.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-700"
                      : "bg-rose-100 text-rose-700"
                    }`}>{svc.paymentStatus}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommended */}
      <section>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Recommended for Growth</div>
        <div className="space-y-2">
          {UPSELLS.map((u) => {
            const Icon = u.icon;
            return (
              <div key={u.title} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${u.color} flex items-center justify-center text-white shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">{u.title}</div>
                  <div className="text-xs text-gray-500 truncate">{u.desc}</div>
                </div>
                <a
                  href={`https://wa.me/?text=Hi Pixocraft, I'm interested in ${u.title}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-xl hover:bg-blue-500 transition-all"
                >
                  Request
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* Support */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-5 text-center">
        <div className="text-2xl mb-2">💬</div>
        <div className="font-bold text-white mb-1">Need help?</div>
        <div className="text-white/60 text-xs mb-4">Our team is available Mon–Sat, 10am–7pm</div>
        <a
          href="https://wa.me/?text=Hi Pixocraft, I need support"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
        >
          <Phone className="w-4 h-4" /> Contact Support
        </a>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PortalDashboard() {
  const { isLoggedIn, isChecking, customer, logout, getToken } = useClientAuth();
  const [, navigate] = useLocation();
  const [view, setView] = useState<View>({ screen: "tabs", tab: "web" });

  useEffect(() => {
    if (!isChecking && !isLoggedIn) navigate("/portal");
  }, [isChecking, isLoggedIn, navigate]);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["client-dashboard"],
    queryFn: async () => {
      const token = getToken();
      const res = await fetch(`${BASE}/api/client/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Auto-select best default tab
  useEffect(() => {
    if (!data) return;
    if (view.screen !== "tabs") return;
    const hasWeb = data.projects.length > 0 || data.webServices.length > 0;
    const hasDigital = data.digitalServices.length > 0 || data.dmReports.length > 0;
    if (!hasWeb && hasDigital) setView({ screen: "tabs", tab: "digital" });
  }, [data]);

  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.webp" alt="Pixocraft" className="w-14 h-14 rounded-xl animate-pulse" />
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const activeTab = view.screen === "tabs" ? view.tab : "web";

  // ── Render detail views ──
  if (view.screen === "project-detail") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header customer={data.customer} onLogout={() => { logout(); navigate("/portal"); }} />
        <div className="max-w-xl mx-auto pt-4">
          <ProjectDetail project={view.project} onBack={() => setView({ screen: "tabs", tab: "web" })} />
        </div>
      </div>
    );
  }

  if (view.screen === "web-service-detail") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header customer={data.customer} onLogout={() => { logout(); navigate("/portal"); }} />
        <div className="max-w-xl mx-auto pt-4">
          <WebServiceDetail service={view.service} onBack={() => setView({ screen: "tabs", tab: "web" })} />
        </div>
      </div>
    );
  }

  if (view.screen === "digital-detail") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header customer={data.customer} onLogout={() => { logout(); navigate("/portal"); }} />
        <div className="max-w-xl mx-auto pt-4">
          <DigitalDetail
            service={view.service}
            reports={view.reports}
            onBack={() => setView({ screen: "tabs", tab: "digital" })}
          />
        </div>
      </div>
    );
  }

  // ── Tabbed layout ──
  return (
    <div className="min-h-screen bg-gray-50">
      <Header customer={data.customer} onLogout={() => { logout(); navigate("/portal"); }} />

      {/* Tab Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {[
              { key: "web",      icon: Globe,     label: "Web" },
              { key: "digital",  icon: Megaphone, label: "Digital" },
              { key: "services", icon: Layers,    label: "Services" },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setView({ screen: "tabs", tab: key as "web" | "digital" | "services" })}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-xl mx-auto pt-4">
        {activeTab === "web" && <WebTab data={data} onView={setView} />}
        {activeTab === "digital" && <DigitalTab data={data} onView={setView} />}
        {activeTab === "services" && <ServicesTab data={data} />}
      </div>
    </div>
  );
}

// ─── Header (shared) ─────────────────────────────────────────────────────────

function Header({
  customer,
  onLogout,
}: {
  customer: DashboardData["customer"];
  onLogout: () => void;
}) {
  return (
    <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 pt-6 pb-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img src="/logo.webp" alt="Pixocraft" className="w-7 h-7 rounded-lg object-cover" />
            <span className="text-white/70 text-sm font-medium">Pixocraft</span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-lg font-bold text-white">
            {customer.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-white font-bold">{customer.name}</div>
              <div className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </div>
            </div>
            {customer.businessName && (
              <div className="text-blue-300/70 text-xs">{customer.businessName}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
