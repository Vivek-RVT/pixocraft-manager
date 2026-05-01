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
} from "lucide-react";
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
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-6">
        <div className="flex items-center gap-2.5 font-semibold text-base text-sidebar-foreground tracking-tight">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center text-primary-foreground font-bold shadow-md shadow-primary/20">
            P
          </div>
          <span className="text-foreground">Pixocraft</span>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href} onClick={onNavigate}>
              <a
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </a>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  const initials = (username ?? "U").slice(0, 1).toUpperCase();

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
      <aside className="hidden md:flex w-60 flex-col shrink-0">
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <header className="h-14 sm:h-16 flex items-center justify-between gap-2 px-3 sm:px-4 md:px-8 border-b border-border bg-card/40 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-9 w-9">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="font-semibold text-base sm:text-lg tracking-tight truncate">
              {titleFor(location)}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 hidden sm:flex shadow-sm"
              onClick={() => setQuickAddOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Quick Add
            </Button>
            <Button
              variant="default"
              size="icon"
              className="sm:hidden h-9 w-9"
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
                  className="h-9 px-1.5 sm:px-2 gap-2 rounded-full"
                >
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                    {initials}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium">{username ?? "User"}</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    Studio owner
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
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

        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto w-full p-3 sm:p-4 md:p-8">{children}</div>
        </div>
      </main>

      <QuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </div>
  );
}
