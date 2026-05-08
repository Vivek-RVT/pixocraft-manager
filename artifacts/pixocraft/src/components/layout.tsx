import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Receipt,
  ArrowLeftRight,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Plus,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuickAddDialog } from "@/components/quick-add-dialog";
import { NotificationsPopover } from "@/components/notifications-popover";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Services", href: "/services", icon: Briefcase },
  { name: "Monthly", href: "/monthly-services", icon: CalendarDays },
  { name: "Expenses", href: "/expenses", icon: Receipt },
  { name: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

const titleFor = (location: string) => {
  if (location === "/") return "Dashboard";
  if (location.startsWith("/customers/")) return "Customer";
  const slug = location.split("/")[1] ?? "";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, username } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full relative overflow-hidden" style={{ background: "hsl(232 52% 3%)" }}>
      {/* Subtle dot grid */}
      <div className="absolute inset-0 dot-grid pointer-events-none" />

      {/* Ambient glow top */}
      <div className="absolute -top-16 -left-8 w-48 h-48 rounded-full bg-cyan-500/8 blur-[60px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-8 w-48 h-48 rounded-full bg-violet-500/8 blur-[60px] pointer-events-none" />

      {/* Logo */}
      <div className="px-5 pt-6 pb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-cyan-400/20 blur-md" />
            <img
              src="/logo.webp"
              alt="Pixocraft"
              className="relative w-9 h-9 rounded-xl shadow-lg ring-1 ring-white/10"
            />
          </div>
          <div>
            <div className="text-white font-bold text-base tracking-tight leading-none">Pixocraft</div>
            <div className="text-white/30 text-[10px] font-medium tracking-widest uppercase mt-0.5">Studio</div>
          </div>
        </div>
      </div>

      {/* Nav label */}
      <div className="px-5 mb-2 relative z-10">
        <span className="text-[9px] font-semibold text-white/20 tracking-[0.18em] uppercase">Navigation</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto relative z-10">
        {navItems.map((item) => {
          const isActive =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 relative group",
                isActive
                  ? "text-white"
                  : "text-white/40 hover:text-white/75 hover:bg-white/[0.04]",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active-bg"
                  className="absolute inset-0 rounded-xl border border-cyan-500/20"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,231,255,0.12) 0%, rgba(155,89,245,0.08) 100%)",
                  }}
                  initial={false}
                  transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
                />
              )}
              {isActive && (
                <motion.div
                  layoutId="nav-active-bar"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-5 rounded-r-full"
                  style={{
                    background: "linear-gradient(to bottom, #00e7ff, #a855f7)",
                    boxShadow: "0 0 10px rgba(0,231,255,0.7), 0 0 20px rgba(0,231,255,0.3)",
                  }}
                  initial={false}
                  transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
                />
              )}
              <item.icon
                className={cn(
                  "w-4 h-4 relative z-10 shrink-0 transition-colors duration-200",
                  isActive ? "text-cyan-400" : "text-white/35 group-hover:text-white/60",
                )}
              />
              <span className="relative z-10">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom user section */}
      <div className="p-3 border-t border-white/[0.06] relative z-10 mt-2">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/35 hover:text-white/65 hover:bg-white/[0.04] transition-colors duration-200 group"
        >
          <LogOut className="w-4 h-4 shrink-0 transition-colors group-hover:text-rose-400/80" />
          Sign Out
        </button>
      </div>
    </div>
  );

  const initials = (username ?? "U").slice(0, 1).toUpperCase();
  const pageTitle = titleFor(location);

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden relative">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[500px] h-[400px] rounded-full bg-cyan-500/[0.03] blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-violet-500/[0.04] blur-[120px]" />
      </div>

      {/* Sidebar */}
      <aside className="hidden md:flex w-[220px] flex-col shrink-0 border-r border-white/[0.05] relative z-10">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative z-10">
        {/* Header */}
        <header className="h-14 sm:h-16 flex items-center justify-between gap-2 px-3 sm:px-4 md:px-8 border-b border-white/[0.05] bg-background/70 backdrop-blur-xl z-20 shrink-0 relative">
          {/* Gradient bottom line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent" />

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-9 w-9">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[220px] border-r border-white/[0.05]">
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            <AnimatePresence mode="wait">
              <motion.div
                key={pageTitle}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="font-semibold text-base sm:text-lg tracking-tight truncate"
              >
                {pageTitle}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 hidden sm:flex shadow-lg shadow-cyan-500/20 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white border-0 font-medium"
              onClick={() => setQuickAddOpen(true)}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Quick Add
            </Button>
            <Button
              variant="default"
              size="icon"
              className="sm:hidden h-9 w-9 bg-gradient-to-r from-cyan-500 to-violet-600 border-0 text-white"
              onClick={() => setQuickAddOpen(true)}
            >
              <Plus className="w-4 h-4" />
            </Button>

            <NotificationsPopover />
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 px-1.5 sm:px-2 gap-2 rounded-full hover:bg-white/5"
                >
                  <div
                    className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-md ring-1 ring-white/10"
                    style={{
                      background: "linear-gradient(135deg, #00e7ff 0%, #a855f7 100%)",
                    }}
                  >
                    {initials}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-white/[0.08] bg-card/95 backdrop-blur-xl">
                <DropdownMenuLabel>
                  <div className="font-medium">{username ?? "User"}</div>
                  <div className="text-xs text-muted-foreground font-normal">Studio owner</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <Link href="/settings">
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                </Link>
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="mr-2 w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto w-full p-3 sm:p-5 md:p-8">
            {children}
          </div>
        </div>
      </main>

      <QuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </div>
  );
}
