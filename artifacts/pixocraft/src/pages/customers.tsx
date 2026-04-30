import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Plus, Search, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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

export default function Customers() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [customerToDelete, setCustomerToDelete] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<number | null>(null);

  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const params = debouncedSearch ? { search: debouncedSearch } : undefined;

  const { data: customers, isLoading } = useListCustomers(params, {
    query: { queryKey: getListCustomersQueryKey(params) },
  });

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

  const isEmpty = !isLoading && (customers?.length ?? 0) === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-muted-foreground text-sm">
            Manage your clients and their relationships.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, business, email..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isEmpty ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-dashed bg-card/50 p-12 text-center"
        >
          <div className="mx-auto w-12 h-12 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Plus className="w-5 h-5" />
          </div>
          <div className="font-medium">
            {search ? "No matching customers" : "No customers yet"}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {search
              ? "Try adjusting your search."
              : "Add your first customer to start tracking work and revenue."}
          </p>
          {search ? (
            <Button variant="outline" onClick={() => setSearch("")}>
              Clear search
            </Button>
          ) : (
            <Button onClick={() => setIsCreateOpen(true)}>
              Add your first customer
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Business</TableHead>
                <TableHead className="hidden lg:table-cell">Contact</TableHead>
                <TableHead className="hidden md:table-cell">Added</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-7 w-7 rounded-md" />
                      </TableCell>
                    </TableRow>
                  ))
                : customers?.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer"
                      onClick={() => setLocation(`/customers/${customer.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div>{customer.name}</div>
                        <div className="text-xs text-muted-foreground md:hidden">
                          {customer.businessName ?? customer.email ?? ""}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {customer.businessName ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-col text-sm">
                          {customer.email && <span>{customer.email}</span>}
                          {customer.phone && (
                            <span className="text-muted-foreground text-xs">
                              {customer.phone}
                            </span>
                          )}
                          {!customer.email && !customer.phone && "—"}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {customer.createdAt
                          ? formatDate(customer.createdAt)
                          : "—"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
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
                    </TableRow>
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
