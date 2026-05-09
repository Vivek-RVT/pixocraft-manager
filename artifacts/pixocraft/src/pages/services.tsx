import { useState, useMemo } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, Download, Star, Globe, Megaphone, RefreshCw } from "lucide-react";
import {
  useListServices,
  getListServicesQueryKey,
  useDeleteService,
  useListCustomers,
  getListCustomersQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetTopServicesQueryKey,
  getGetTopCustomersQueryKey,
  getGetRecentActivityQueryKey,
  getGetRevenueTrendQueryKey,
  type Service,
} from "@workspace/api-client-react";
import {
  DateRangeFilter,
  getAllTimeDateFilter,
  isInDateRange,
  type DateFilter,
} from "@/components/date-range-filter";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ServiceFormDialog } from "@/components/service-form-dialog";
import { formatCurrency, formatDate } from "@/lib/format";

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

const deliveryLabel = (s: string) =>
  s === "in_progress" ? "In progress" : s.charAt(0).toUpperCase() + s.slice(1);

function ServiceTypeIcon({ type }: { type?: string }) {
  if (type === "web") return <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
  if (type === "digital") return <Megaphone className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
  return null;
}

function StarDisplay({ rating }: { rating?: number | null }) {
  if (!rating) return null;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={cn("w-3 h-3", s <= rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/20")} />
      ))}
    </div>
  );
}

function exportToCsv(services: Service[]) {
  const rows = [
    ["Date","Customer","Service","Type","Price","Cost","Profit","Payment","Delivery","Rating","Notes"],
    ...services.map((s) => [s.date, s.customerName, s.serviceName, (s as any).serviceType ?? "", s.priceSold, s.costPrice, s.profit ?? 0, s.paymentStatus, s.deliveryStatus, (s as any).satisfactionRating ?? "", (s.notes ?? "").replace(/"/g, '""')]),
  ];
  const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `services-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Services() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>(getAllTimeDateFilter());

  const { data: allServices, isLoading } = useListServices(undefined, {
    query: { queryKey: getListServicesQueryKey() },
  });

  const apiFetch = (path: string) =>
    fetch(path).then((r) => (r.ok ? r.json() : Promise.reject()));

  const { data: monthlyWebsite = [] } = useQuery<any[]>({
    queryKey: ["monthly-website"],
    queryFn: () => apiFetch("/api/monthly-website"),
  });
  const { data: monthlyDigital = [] } = useQuery<any[]>({
    queryKey: ["monthly-digital"],
    queryFn: () => apiFetch("/api/monthly-digital"),
  });

  const services = useMemo(() => {
    if (!allServices) return [];
    return allServices.filter((s) => {
      if (customerFilter !== "all" && String(s.customerId) !== customerFilter) return false;
      if (paymentFilter !== "all" && s.paymentStatus !== paymentFilter) return false;
      if (typeFilter !== "all" && (s as any).serviceType !== typeFilter) return false;
      if (!isInDateRange(s.date, dateFilter)) return false;
      return true;
    });
  }, [allServices, customerFilter, paymentFilter, typeFilter, dateFilter]);

  const { data: customers } = useListCustomers(undefined, {
    query: { queryKey: getListCustomersQueryKey() },
  });

  const deleteMutation = useDeleteService();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteId });
      toast.success("Service deleted");
      queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
      queryClient.invalidateQueries({
        queryKey: getGetDashboardSummaryQueryKey(),
      });
      queryClient.invalidateQueries({ queryKey: getGetRevenueTrendQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetTopServicesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetTopCustomersQueryKey() });
      queryClient.invalidateQueries({
        queryKey: getGetRecentActivityQueryKey(),
      });
    } catch {
      toast.error("Could not delete service");
    } finally {
      setDeleteId(null);
    }
  };

  const isEmpty = !isLoading && services.length === 0;
  const totalRevenue = services.reduce((s, x) => s + Number(x.priceSold), 0);
  const totalProfit = services.reduce((s, x) => s + Number(x.profit ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track every service you've sold, with profit and payment status.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCsv(services)} disabled={services.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Service
          </Button>
        </div>
      </div>

      {services.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <SpotlightCard spotlightColor="rgba(0,231,255,0.06)" className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Services</p>
            <p className="text-2xl font-bold mt-1">{services.length}</p>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(0,231,255,0.06)" className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Revenue</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</p>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(139,92,246,0.08)" className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Profit</p>
            <p className={cn("text-2xl font-bold mt-1", totalProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {formatCurrency(totalProfit)}
            </p>
          </SpotlightCard>
        </div>
      )}

      <DateRangeFilter value={dateFilter} onChange={setDateFilter} />

      <div className="flex flex-wrap gap-2">
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All customers</SelectItem>
            {customers?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="web">Pixocraft Web</SelectItem>
            <SelectItem value="digital">Pixocraft Digital</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Any payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any payment</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] bg-card/50 p-12 text-center">
          <div className="font-medium">No services match these filters</div>
          <p className="text-sm text-muted-foreground mb-4">
            Add a service or adjust your filters.
          </p>
          <Button onClick={() => setCreateOpen(true)}>Add a service</Button>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.07] bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="hidden md:table-cell">Customer</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right hidden lg:table-cell">Profit</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="hidden md:table-cell">Delivery</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead className="hidden xl:table-cell">Rating</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : services.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          <ServiceTypeIcon type={(s as any).serviceType} />
                          <span>{s.serviceName}</span>
                        </div>
                        <div className="text-xs text-muted-foreground md:hidden">{s.customerName}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{s.customerName}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(Number(s.priceSold))}</TableCell>
                      <TableCell className="text-right tabular-nums hidden lg:table-cell text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(Number(s.profit ?? 0))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={paymentBadge(s.paymentStatus)}>
                          {s.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {deliveryLabel(s.deliveryStatus)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(s.date)}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <StarDisplay rating={(s as any).satisfactionRating} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditService(s)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(s.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      )}

      {(monthlyWebsite.length > 0 || monthlyDigital.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Monthly Retainers</h2>
            <Badge variant="secondary">{monthlyWebsite.length + monthlyDigital.length}</Badge>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead className="hidden md:table-cell">Customer</TableHead>
                  <TableHead className="text-right">Monthly charge</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Total collected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Start date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ...monthlyWebsite.map((s: any) => ({ ...s, kind: "web" as const })),
                  ...monthlyDigital.map((s: any) => ({ ...s, kind: "digital" as const })),
                ].map((s) => {
                  const totalCollected = (s.completions ?? []).reduce(
                    (sum: number, c: any) => sum + Number(c.paidAmount ?? 0),
                    0,
                  );
                  return (
                    <TableRow key={`${s.kind}-${s.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          {s.kind === "web"
                            ? <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            : <Megaphone className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                          <span>{s.websiteName ?? s.serviceName}</span>
                        </div>
                        <div className="text-xs text-muted-foreground md:hidden">{s.customerName}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{s.customerName}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(Number(s.monthlyCharge))}</TableCell>
                      <TableCell className="text-right tabular-nums hidden lg:table-cell text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(totalCollected)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            s.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : s.status === "paused"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                          }
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {s.startDate ? formatDate(s.startDate) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ServiceFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editService && (
        <ServiceFormDialog
          open={!!editService}
          onOpenChange={(o) => !o && setEditService(null)}
          service={editService}
        />
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this service?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the service entry and its impact on
              revenue calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
