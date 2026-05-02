import { useEffect } from "react";
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
  ShoppingCart,
  Paintbrush,
  Bot,
  BarChart3,
  Star,
} from "lucide-react";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STAGES: Record<string, { label: string; color: string; pct: number }> = {
  planning:    { label: "Planning",    color: "from-slate-400 to-slate-500",   pct: 10 },
  "ui-design": { label: "UI Design",   color: "from-purple-400 to-purple-600", pct: 25 },
  development: { label: "Development", color: "from-blue-400 to-blue-600",     pct: 55 },
  testing:     { label: "Testing",     color: "from-amber-400 to-amber-600",   pct: 80 },
  seo:         { label: "SEO",         color: "from-green-400 to-green-600",   pct: 92 },
  completed:   { label: "Completed",   color: "from-emerald-400 to-emerald-600", pct: 100 },
};

const UPSELLS = [
  { icon: BarChart3, title: "Google Ads", desc: "Drive targeted traffic with paid search", color: "from-blue-500 to-blue-700" },
  { icon: Megaphone, title: "Social Media Growth", desc: "Build your audience across all platforms", color: "from-pink-500 to-rose-600" },
  { icon: Search, title: "SEO Domination", desc: "Rank #1 on Google with proven strategies", color: "from-green-500 to-emerald-600" },
  { icon: MessageCircle, title: "WhatsApp Automation", desc: "Automate your client communications", color: "from-green-400 to-teal-600" },
  { icon: Bot, title: "Smart CRM", desc: "Manage leads and customers efficiently", color: "from-violet-500 to-purple-700" },
  { icon: Globe, title: "Website Upgrade", desc: "Refresh your website with modern design", color: "from-sky-500 to-blue-600" },
  { icon: Paintbrush, title: "Branding Package", desc: "Complete brand identity for your business", color: "from-orange-400 to-red-500" },
];

type DashboardData = {
  customer: { id: number; name: string; businessName: string | null; phone: string | null; email: string | null };
  services: Array<{ id: number; serviceName: string; serviceType: string; priceSold: string; paymentStatus: string; deliveryStatus: string; date: string }>;
  projects: Array<{
    id: number; projectType: string; projectName: string; stage: string;
    progress: number; completedNotes: string | null; pendingNotes: string | null;
    liveUrl: string | null; expectedDelivery: string | null;
  }>;
  dmReports: Array<{
    id: number; year: number; month: number; platforms: string | null; plan: string | null;
    targetVideos: number; targetPosts: number; targetReels: number; targetStories: number;
    uploadedVideos: number; uploadedPosts: number; uploadedReels: number; uploadedStories: number;
    followersGained: number; engagementGrowth: string | null; leadsGenerated: number;
    adSpend: string; summaryNotes: string | null;
  }>;
  seoReports: Array<{
    id: number; year: number; month: number; blogsPosted: number; keywordsRanked: number;
    trafficGrowth: string | null; backlinksAdded: number; seoScore: number | null; notes: string | null;
  }>;
  webServices: Array<{ id: number; websiteName: string; monthlyCharge: string; status: string }>;
  digitalServices: Array<{ id: number; serviceName: string; monthlyCharge: string; status: string }>;
};

function ProgressBar({ pct, colorClass }: { pct: number; colorClass: string }) {
  return (
    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${colorClass} transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ServiceIcon({ type }: { type: string }) {
  const t = (type ?? "").toLowerCase();
  if (t.includes("website") || t.includes("web")) return <Globe className="w-5 h-5" />;
  if (t.includes("app")) return <Code2 className="w-5 h-5" />;
  if (t.includes("digital") || t.includes("social") || t.includes("marketing")) return <Megaphone className="w-5 h-5" />;
  if (t.includes("seo") || t.includes("blog")) return <Search className="w-5 h-5" />;
  return <Zap className="w-5 h-5" />;
}

export default function PortalDashboard() {
  const { isLoggedIn, isChecking, customer, logout, getToken } = useClientAuth();
  const [, navigate] = useLocation();

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

  function handleLogout() {
    logout();
    navigate("/portal");
  }

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

  const clientName = data.customer.name;
  const businessName = data.customer.businessName;
  const hasProjects = data.projects.length > 0;
  const hasDmReports = data.dmReports.length > 0;
  const hasSeoReports = data.seoReports.length > 0;
  const latestDm = data.dmReports[0];
  const latestSeo = data.seoReports[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 pt-8 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-2xl mx-auto relative">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2.5">
              <img src="/logo.webp" alt="Pixocraft" className="w-8 h-8 rounded-lg object-cover" />
              <span className="text-white/70 text-sm font-medium">Pixocraft</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-xs transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-full mb-3 border border-emerald-500/30">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Client
              </div>
              <h1 className="text-2xl font-bold text-white leading-tight">
                Welcome, {clientName.split(" ")[0]} 👋
              </h1>
              {businessName && (
                <p className="text-blue-300/70 text-sm mt-1">{businessName}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-8 pb-12 space-y-4">

        {/* Active Services */}
        {data.services.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Your Services</h2>
            <div className="grid gap-3">
              {data.services.map((svc) => (
                <div key={svc.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shrink-0">
                    <ServiceIcon type={svc.serviceType ?? svc.serviceName} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">{svc.serviceName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{formatCurrency(Number(svc.priceSold))}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      svc.deliveryStatus === "completed"
                        ? "bg-emerald-100 text-emerald-700"
                        : svc.deliveryStatus === "in_progress"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {svc.deliveryStatus === "in_progress" ? "In Progress" : svc.deliveryStatus ?? "Pending"}
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
              ))}
            </div>
          </section>
        )}

        {/* Monthly Retainers */}
        {(data.webServices.filter(w => w.status === "active").length > 0 || data.digitalServices.filter(d => d.status === "active").length > 0) && (
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Monthly Plans</h2>
            <div className="grid gap-3">
              {data.webServices.filter(w => w.status === "active").map((ws) => (
                <div key={ws.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-sm">{ws.websiteName}</div>
                    <div className="text-xs text-gray-500">Website Maintenance</div>
                  </div>
                  <div className="text-sm font-bold text-blue-700">{formatCurrency(Number(ws.monthlyCharge))}<span className="text-xs font-normal text-gray-400">/mo</span></div>
                </div>
              ))}
              {data.digitalServices.filter(d => d.status === "active").map((ds) => (
                <div key={ds.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white shrink-0">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-sm">{ds.serviceName}</div>
                    <div className="text-xs text-gray-500">Digital Marketing</div>
                  </div>
                  <div className="text-sm font-bold text-violet-700">{formatCurrency(Number(ds.monthlyCharge))}<span className="text-xs font-normal text-gray-400">/mo</span></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Project Progress */}
        {hasProjects && (
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Project Progress</h2>
            <div className="space-y-3">
              {data.projects.map((proj) => {
                const stageInfo = STAGES[proj.stage] ?? { label: proj.stage, color: "from-blue-400 to-blue-600", pct: proj.progress };
                const displayPct = proj.progress > 0 ? proj.progress : stageInfo.pct;
                const allStageKeys = Object.keys(STAGES);
                const currentIdx = allStageKeys.indexOf(proj.stage);
                return (
                  <div key={proj.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-gray-900">{proj.projectName}</div>
                        <div className="text-xs text-gray-500 capitalize">{proj.projectType === "webapp" ? "Web App" : "Website"} Development</div>
                      </div>
                      <div className={`text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${stageInfo.color} text-white shadow-sm`}>
                        {stageInfo.label}
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                        <span>Overall Progress</span>
                        <span className="font-bold text-gray-900">{displayPct}%</span>
                      </div>
                      <ProgressBar pct={displayPct} colorClass={stageInfo.color} />
                    </div>

                    {/* Stage dots */}
                    <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
                      {allStageKeys.map((key, idx) => {
                        const s = STAGES[key];
                        const done = idx <= currentIdx;
                        const current = idx === currentIdx;
                        return (
                          <div key={key} className="flex items-center gap-1 shrink-0">
                            <div className={`flex items-center justify-center rounded-full text-[9px] font-bold transition-all ${
                              current
                                ? `w-5 h-5 bg-gradient-to-r ${stageInfo.color} text-white shadow`
                                : done
                                ? "w-4 h-4 bg-emerald-500 text-white"
                                : "w-4 h-4 bg-gray-100 text-gray-400"
                            }`}>
                              {done && !current ? <CheckCircle2 className="w-2.5 h-2.5" /> : idx + 1}
                            </div>
                            {idx < allStageKeys.length - 1 && (
                              <div className={`h-0.5 w-3 rounded ${done ? "bg-emerald-400" : "bg-gray-200"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {proj.completedNotes && (
                        <div className="bg-emerald-50 rounded-xl p-2.5">
                          <div className="flex items-center gap-1 text-emerald-700 font-semibold mb-1">
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </div>
                          <p className="text-emerald-800 leading-relaxed">{proj.completedNotes}</p>
                        </div>
                      )}
                      {proj.pendingNotes && (
                        <div className="bg-amber-50 rounded-xl p-2.5">
                          <div className="flex items-center gap-1 text-amber-700 font-semibold mb-1">
                            <Clock className="w-3 h-3" /> Pending
                          </div>
                          <p className="text-amber-800 leading-relaxed">{proj.pendingNotes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                      {proj.expectedDelivery && (
                        <span>🗓 Est. {new Date(proj.expectedDelivery).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      )}
                      {proj.liveUrl && (
                        <a href={proj.liveUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 font-semibold hover:underline ml-auto">
                          <ExternalLink className="w-3 h-3" /> View Live
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Digital Marketing Report */}
        {hasDmReports && latestDm && (
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
              Digital Marketing — {MONTHS[latestDm.month - 1]} {latestDm.year}
            </h2>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white">
                    <Megaphone className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">Monthly Report</div>
                    {latestDm.plan && <div className="text-xs text-gray-500 capitalize">{latestDm.plan} Plan</div>}
                  </div>
                </div>
                {latestDm.platforms && (
                  <div className="text-xs text-gray-500 text-right">
                    {JSON.parse(latestDm.platforms).join(" · ")}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: "Videos", target: latestDm.targetVideos ?? 0, done: latestDm.uploadedVideos ?? 0, color: "from-red-400 to-red-600" },
                  { label: "Posts", target: latestDm.targetPosts ?? 0, done: latestDm.uploadedPosts ?? 0, color: "from-blue-400 to-blue-600" },
                  { label: "Reels", target: latestDm.targetReels ?? 0, done: latestDm.uploadedReels ?? 0, color: "from-purple-400 to-purple-600" },
                  { label: "Stories", target: latestDm.targetStories ?? 0, done: latestDm.uploadedStories ?? 0, color: "from-pink-400 to-pink-600" },
                ].filter(item => item.target > 0).map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-600 font-medium">{item.label}</span>
                      <span className="font-bold text-gray-900">{item.done}/{item.target}</span>
                    </div>
                    <ProgressBar pct={item.target > 0 ? Math.min(100, Math.round((item.done / item.target) * 100)) : 0} colorClass={item.color} />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-700 mb-1">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-bold text-blue-900 text-lg">+{latestDm.followersGained ?? 0}</div>
                  <div className="text-xs text-blue-600">Followers</div>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-green-700 mb-1">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-bold text-green-900 text-lg">{latestDm.leadsGenerated ?? 0}</div>
                  <div className="text-xs text-green-600">Leads</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-purple-700 mb-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-bold text-purple-900 text-sm">{latestDm.engagementGrowth ?? "—"}</div>
                  <div className="text-xs text-purple-600">Engagement</div>
                </div>
              </div>

              {latestDm.summaryNotes && (
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 leading-relaxed">
                  📝 {latestDm.summaryNotes}
                </div>
              )}
            </div>
          </section>
        )}

        {/* SEO Report */}
        {hasSeoReports && latestSeo && (
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
              SEO Report — {MONTHS[latestSeo.month - 1]} {latestSeo.year}
            </h2>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white">
                  <Search className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">SEO Performance</div>
                  {latestSeo.seoScore != null && (
                    <div className="text-xs text-gray-500">Score: <span className="font-bold text-green-700">{latestSeo.seoScore}/100</span></div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  { label: "Blogs Posted", value: latestSeo.blogsPosted ?? 0, icon: "📝", color: "blue" },
                  { label: "Keywords Ranked", value: latestSeo.keywordsRanked ?? 0, icon: "🔑", color: "green" },
                  { label: "Backlinks Added", value: latestSeo.backlinksAdded ?? 0, icon: "🔗", color: "purple" },
                  { label: "Traffic Growth", value: latestSeo.trafficGrowth ?? "—", icon: "📈", color: "orange" },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                    <div className="text-lg mb-0.5">{item.icon}</div>
                    <div className="font-bold text-gray-900">{item.value}</div>
                    <div className="text-xs text-gray-500">{item.label}</div>
                  </div>
                ))}
              </div>

              {latestSeo.notes && (
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 leading-relaxed">
                  📝 {latestSeo.notes}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Recommended Services */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Recommended for Your Growth</h2>
          <div className="grid grid-cols-1 gap-3">
            {UPSELLS.map((u) => {
              const Icon = u.icon;
              return (
                <div key={u.title} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${u.color} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{u.title}</div>
                    <div className="text-xs text-gray-500 truncate">{u.desc}</div>
                  </div>
                  <a
                    href={`https://wa.me/91${data.customer.phone?.replace(/\D/g, "") ?? ""}?text=Hi Pixocraft, I'm interested in ${u.title}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-xl shadow-sm hover:from-blue-500 hover:to-blue-600 transition-all whitespace-nowrap"
                  >
                    Request
                  </a>
                </div>
              );
            })}
          </div>
        </section>

        {/* Support */}
        <section className="pb-4">
          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-5 text-center">
            <div className="text-2xl mb-2">💬</div>
            <div className="font-bold text-white mb-1">Need help?</div>
            <div className="text-white/60 text-xs mb-4">Our team is available Mon–Sat, 10am–7pm</div>
            <a
              href="https://wa.me/91XXXXXXXXXX?text=Hi Pixocraft, I need support"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-green-500/25 text-sm"
            >
              <Phone className="w-4 h-4" />
              Contact Support
            </a>
          </div>
        </section>

        {/* Stars / branding */}
        <div className="flex items-center justify-center gap-1 pb-4">
          {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
          <span className="text-xs text-gray-400 ml-2">Powered by Pixocraft</span>
        </div>
      </div>
    </div>
  );
}
