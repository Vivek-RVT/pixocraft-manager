import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Download, Users } from "lucide-react";
import {
  useListCustomers,
  getListCustomersQueryKey,
  useDeleteCustomer,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

function exportCustomersCsv(customers: any[]) {
  if (!customers.length) {
    toast.error("Nothing to export");
    return;
  }
  const rows = [
    ["ID", "Name", "Business", "Email", "Phone", "Address", "Notes", "Added"],
    ...customers.map((c) => [
      c.id,
      c.name,
      c.businessName ?? "",
      c.email ?? "",
      c.phone ?? "",
      c.address ?? "",
      (c.notes ?? "").replace(/"/g, '""'),
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
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-600/20 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm leading-tight">
              Manage your clients and their relationships.
            </p>
            {customers.length > 0 && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-white/[0.08] text-white/50">
                  {customers.length} {customers.length === 1 ? "client" : "clients"}
                </Badge>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCustomersCsv(customers)}
            disabled={customers.length === 0}
            className="border-white/[0.08] text-white/60 hover:text-white hover:border-white/20 gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white border-0 shadow-lg shadow-cyan-500/20"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
        <Input
          type="search"
          placeholder="Search by name, business, email..."
          className="pl-10 h-11 rounded-xl bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus:border-cyan-400/40 focus:bg-white/[0.06] transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <DateRangeFilter value={dateFilter} onChange={setDateFilter} />

      {isEmpty ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-16 text-center"
        >
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-violet-600/10 flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-cyan-400/60" />
          </div>
          <div className="font-semibold text-base">
            {search ? "No matching customers" : "No customers in this period"}
          </div>
          <p className="text-sm text-muted-foreground mb-5 mt-1">
            {search
              ? "Try adjusting your search."
              : "Try changing the date range or add your first customer."}
          </p>
          {search ? (
            <Button variant="outline" onClick={() => setSearch("")} className="border-white/[0.08]">
              Clear search
            </Button>
          ) : (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white border-0"
            >
              Add your first customer
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="rounded-xl border border-white/[0.07] bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06]">
                <TableHead className="text-white/50 font-medium text-xs uppercase tracking-wide">Customer</TableHead>
                <TableHead className="hidden md:table-cell text-white/50 font-medium text-xs uppercase tracking-wide">Business</TableHead>
                <TableHead className="hidden lg:table-cell text-white/50 font-medium text-xs uppercase tracking-wide">Contact</TableHead>
                <TableHead className="hidden md:table-cell text-white/50 font-medium text-xs uppercase tracking-wide">First Contact</TableHead>
                <TableHead className="w-[52px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-white/[0.04]">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-4">
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell py-4">
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-4">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell className="py-4">
                        <Skeleton className="h-7 w-7 rounded-md" />
                      </TableCell>
                    </TableRow>
                  ))
                : customers?.map((customer, idx) => (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.2 }}
                      className="cursor-pointer group border-white/[0.04] hover:bg-cyan-400/[0.03] transition-colors"
                      onClick={() => setLocation(`/customers/${customer.id}`)}
                    >
                      <TableCell className="font-medium py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white ring-1 ring-white/10 shadow-lg"
                            style={{
                              background: `linear-gradient(135deg, hsl(${(customer.name.charCodeAt(0) * 37) % 360} 70% 55%), hsl(${(customer.name.charCodeAt(0) * 37 + 40) % 360} 70% 45%))`,
                            }}
                          >
                            {customer.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium group-hover:text-cyan-400 transition-colors duration-200">
                              {customer.name}
                            </div>
                            <div className="text-xs text-muted-foreground md:hidden mt-0.5">
                              {customer.businessName ?? customer.email ?? ""}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-4 text-muted-foreground">
                        {customer.businessName ?? <span className="text-white/20">—</span>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell py-4">
                        <div className="flex flex-col text-sm">
                          {customer.email && <span className="text-foreground/80">{customer.email}</span>}
                          {customer.phone && (
                            <span className="text-muted-foreground text-xs mt-0.5">
                              {customer.phone}
                            </span>
                          )}
                          {!customer.email && !customer.phone && <span className="text-white/20">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-4 text-sm text-muted-foreground">
                        {customer.contactedAt
                          ? formatDate(customer.contactedAt)
                          : customer.createdAt
                            ? formatDate(customer.createdAt)
                            : <span className="text-white/20">—</span>}
                      </TableCell>
                      <TableCell
                        className="py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setCustomerToEdit(customer.id)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setCustomerToDelete(customer.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
            </TableBody>
          </Table>
        </div>
      )}

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
            <AlertDialogTitle>Delete this customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the customer and all their service
              entries. This cannot be undone.
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
