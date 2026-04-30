import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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

import { Button } from "@/components/ui/button";
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

export default function Services() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const params: { customerId?: number; paymentStatus?: "paid" | "pending" | "partial" } = {};
  if (customerFilter !== "all") params.customerId = Number(customerFilter);
  if (paymentFilter !== "all")
    params.paymentStatus = paymentFilter as "paid" | "pending" | "partial";
  const queryArg = Object.keys(params).length ? params : undefined;

  const { data: services, isLoading } = useListServices(queryArg, {
    query: { queryKey: getListServicesQueryKey(queryArg) },
  });

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

  const isEmpty = !isLoading && (services?.length ?? 0) === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-muted-foreground text-sm">
          Track every service you've sold, with profit and payment status.
        </p>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Service
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All customers</SelectItem>
            {customers?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
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
        <div className="rounded-lg border border-dashed bg-card/50 p-12 text-center">
          <div className="font-medium">No services match these filters</div>
          <p className="text-sm text-muted-foreground mb-4">
            Add a service or clear your filters.
          </p>
          <Button onClick={() => setCreateOpen(true)}>Add a service</Button>
        </div>
      ) : (
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="hidden md:table-cell">Customer</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right hidden lg:table-cell">
                  Profit
                </TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="hidden md:table-cell">Delivery</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : services?.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        <div>{s.serviceName}</div>
                        <div className="text-xs text-muted-foreground md:hidden">
                          {s.customerName}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {s.customerName}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(Number(s.priceSold))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums hidden lg:table-cell text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(Number(s.profit ?? 0))}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={paymentBadge(s.paymentStatus)}
                        >
                          {s.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {deliveryLabel(s.deliveryStatus)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(s.date)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setEditService(s)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(s.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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
