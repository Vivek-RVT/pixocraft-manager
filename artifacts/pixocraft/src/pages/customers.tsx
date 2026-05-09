import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, Download,
  Users, Mail, Phone, Building2, MapPin, CalendarDays, ChevronRight,
} from "lucide-react";
import {
  useListCustomers,
  getListCustomersQueryKey,
  useDeleteCustomer,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CustomerFormDialog } from "@/components/customer-form-dialog";
import { formatDate } from "@/lib/format";
import {
  DateRangeFilter,
  getDefaultDateFilter,
  isInDateRange,
  type DateFilter,
} from "@/components/date-range-filter";

const AVATAR_PALETTES = [
  ["#00E7FF", "#0ea5e9"],
  ["#a855f7", "#7c3aed"],
  ["#10B981", "#059669"],
  ["#F59E0B", "#d97706"],
  ["#EC4899", "#db2777"],
  ["#38bdf8", "#0284c7"],
  ["#34d399", "#10b981"],
  ["#f472b6", "#ec4899"],
];

function avatarPalette(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx];
}

function exportCustomersCsv(customers: any[]) {
  if (!customers.length) { toast.error("Nothing to export"); return; }
  const rows = [
    ["ID", "Name", "Business", "Email", "Phone", "Address", "Notes", "Added"],
    ...customers.map((c) => [
      c.id, c.name, c.businessName ?? "", c.email ?? "", c.phone ?? "",
      c.address ?? "", (c.notes ?? "").replace(/"/g, '""'),
      c.createdAt ? c.createdAt.slice(0, 10) : "",
    ]),
  ];
  const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Customers exported");
}

function CustomerCard({
  customer,
  index,
  onEdit,
  onDelete,
  onClick,
}: {
  customer: any;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [colors] = useState(() => avatarPalette(customer.name));
  const initials = customer.name.slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative group rounded-2xl border bg-card overflow-hidden cursor-pointer"
      style={{
        borderColor: hovered ? `${colors[0]}28` : "rgba(255,255,255,0.06)",
        transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        boxShadow: hovered ? `0 0 40px ${colors[0]}12, 0 8px 24px rgba(0,0,0,0.3)` : "0 2px 8px rgba(0,0,0,0.2)",
      }}
      onClick={onClick}
    >
      {/* Hover gradient */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: `radial-gradient(ellipse at 0% 0%, ${colors[0]}10 0%, transparent 65%)`,
        }}
      />

      {/* Top strip with avatar */}
      <div className="relative px-5 pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-sm font-bold shadow-lg ring-1 ring-white/10"
                style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
              >
                {initials}
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card"
                style={{ background: "#10B981" }}
              />
            </div>
            <div className="min-w-0">
              <div
                className="font-semibold text-[14px] leading-tight truncate transition-colors duration-200"
                style={{ color: hovered ? colors[0] : undefined }}
              >
                {customer.name}
              </div>
              {customer.businessName && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Building2 className="w-2.5 h-2.5 text-muted-foreground/50 shrink-0" />
                  <span className="text-[11px] text-muted-foreground/60 truncate">{customer.businessName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-white/[0.08] bg-card/95 backdrop-blur-xl">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Divider */}
        <div className="mt-4 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />

        {/* Contact info */}
        <div className="mt-3.5 space-y-2">
          {customer.email && (
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                style={{ background: `${colors[0]}18` }}
              >
                <Mail className="w-2.5 h-2.5" style={{ color: colors[0] }} />
              </div>
              <span className="text-[11.5px] text-muted-foreground/70 truncate">{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                style={{ background: `${colors[0]}18` }}
              >
                <Phone className="w-2.5 h-2.5" style={{ color: colors[0] }} />
              </div>
              <span className="text-[11.5px] text-muted-foreground/70 truncate">{customer.phone}</span>
            </div>
          )}
          {customer.address && (
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                style={{ background: `${colors[0]}18` }}
              >
                <MapPin className="w-2.5 h-2.5" style={{ color: colors[0] }} />
              </div>
              <span className="text-[11.5px] text-muted-foreground/70 truncate">{customer.address}</span>
            </div>
          )}
          {!customer.email && !customer.phone && !customer.address && (
            <div className="text-[11px] text-muted-foreground/30 italic">No contact info</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-3 h-3 text-muted-foreground/35" />
          <span className="text-[10.5px] text-muted-foreground/40 font-medium">
            {customer.contactedAt
              ? formatDate(customer.contactedAt)
              : customer.createdAt
                ? formatDate(customer.createdAt)
                : "—"}
          </span>
        </div>
        <motion.div
          animate={{ x: hovered ? 2 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-0.5"
          style={{ color: hovered ? colors[0] : "rgba(255,255,255,0.25)" }}
        >
          <span className="text-[11px] font-semibold">View</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [customerToDelete, setCustomerToDelete] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>(getDefaultDateFilter());
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = debouncedSearch ? { search: debouncedSearch } : undefined;
  const { data: allCustomers, isLoading } = useListCustomers(params, {
    query: { queryKey: getListCustomersQueryKey(params) },
  });

  const customers = useMemo(() => {
    if (!allCustomers) return [];
    return allCustomers.filter((c) => {
      if (!c.createdAt) return true;
      return isInDateRange(c.createdAt, dateFilter);
    });
  }, [allCustomers, dateFilter]);

  const deleteMutation = useDeleteCustomer();
  const handleDelete = async () => {
    if (!customerToDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: customerToDelete });
      toast.success("Customer deleted");
      queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
    } catch {
      toast.error("Failed to delete customer");
    } finally {
      setCustomerToDelete(null);
    }
  };

  const isEmpty = !isLoading && customers.length === 0;

  return (
    <div className="space-y-7 pb-10">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,231,255,0.1)" }}>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
            {customers.length > 0 && (
              <span
                className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: "rgba(0,231,255,0.1)", color: "#00E7FF" }}
              >
                {customers.length}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground/50 font-medium">
            Manage your client relationships and contact information.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCustomersCsv(customers)}
            disabled={customers.length === 0}
            className="border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-white/20 gap-1.5 h-9 rounded-xl"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white border-0 shadow-lg shadow-cyan-500/20 h-9 rounded-xl font-semibold"
          >
            <Plus className="h-4 w-4" /> Add Client
          </Button>
        </div>
      </motion.div>

      {/* ── Search + Filter ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
          <Input
            type="search"
            placeholder="Search by name, business, email…"
            className="pl-10 h-10 rounded-xl bg-white/[0.03] border-white/[0.07] placeholder:text-muted-foreground/30 focus:border-cyan-400/40 focus:bg-white/[0.05] transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <AnimatePresence>
            {search && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-white/20 transition-colors"
              >
                <span className="text-[10px] leading-none">✕</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
      </motion.div>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.06] bg-card p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-11 h-11 rounded-2xl shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-28 mb-2 rounded-full" />
                    <Skeleton className="h-2.5 w-20 rounded-full" />
                  </div>
                </div>
                <div className="h-px bg-white/[0.04]" />
                <div className="space-y-2">
                  <Skeleton className="h-2.5 w-full rounded-full" />
                  <Skeleton className="h-2.5 w-3/4 rounded-full" />
                </div>
              </div>
            ))}
          </motion.div>
        ) : isEmpty ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-dashed border-white/[0.07] bg-white/[0.01] p-20 text-center"
          >
            <div
              className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "rgba(0,231,255,0.07)" }}
            >
              <Users className="w-7 h-7 text-cyan-400/60" />
            </div>
            <div className="font-semibold text-lg tracking-tight mb-1">
              {search ? "No matching clients" : "No clients yet"}
            </div>
            <p className="text-sm text-muted-foreground/50 mb-6">
              {search
                ? "Try a different search term."
                : "Add your first client to get started."}
            </p>
            {search ? (
              <Button
                variant="outline"
                onClick={() => setSearch("")}
                className="border-white/[0.08] rounded-xl"
              >
                Clear search
              </Button>
            ) : (
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white border-0 rounded-xl"
              >
                <Plus className="mr-2 h-4 w-4" /> Add your first client
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {customers.map((customer, idx) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                index={idx}
                onEdit={() => setCustomerToEdit(customer.id)}
                onDelete={() => setCustomerToDelete(customer.id)}
                onClick={() => setLocation(`/customers/${customer.id}`)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dialogs ── */}
      <CustomerFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      {customerToEdit && (
        <CustomerFormDialog
          open={!!customerToEdit}
          onOpenChange={(open) => !open && setCustomerToEdit(null)}
          customerId={customerToEdit}
        />
      )}

      <AlertDialog
        open={!!customerToDelete}
        onOpenChange={(open) => !open && setCustomerToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the client and all their service entries. This cannot be undone.
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
