import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  useListTransactions,
  getListTransactionsQueryKey,
  useDeleteTransaction,
  getGetDashboardSummaryQueryKey,
  getGetRecentActivityQueryKey,
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
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
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
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { TransactionFormDialog } from "@/components/transaction-form-dialog";
import { formatCurrency, formatDate } from "@/lib/format";

export default function Transactions() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [tab, setTab] = useState<"all" | "credit" | "debit">("all");

  const params = tab !== "all" ? { type: tab } : undefined;
  const { data: transactions, isLoading } = useListTransactions(params, {
    query: { queryKey: getListTransactionsQueryKey(params) },
  });

  const deleteMutation = useDeleteTransaction();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteId });
      toast.success("Transaction removed");
      queryClient.invalidateQueries({
        queryKey: getListTransactionsQueryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: getGetDashboardSummaryQueryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: getGetRecentActivityQueryKey(),
      });
    } catch {
      toast.error("Could not delete transaction");
    } finally {
      setDeleteId(null);
    }
  };

  const credits = (transactions ?? [])
    .filter((t) => t.type === "credit")
    .reduce((s, t) => s + Number(t.amount), 0);
  const debits = (transactions ?? [])
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + Number(t.amount), 0);
  const net = credits - debits;
  const isEmpty = !isLoading && (transactions?.length ?? 0) === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-muted-foreground text-sm">
          A clean ledger of money in and out.
        </p>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Transaction
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Total in
            </div>
            <div className="text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 flex items-center gap-2 mt-1">
              <ArrowUpRight className="w-4 h-4" />
              {formatCurrency(credits)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Total out
            </div>
            <div className="text-xl font-semibold tabular-nums text-rose-600 dark:text-rose-400 flex items-center gap-2 mt-1">
              <ArrowDownRight className="w-4 h-4" />
              {formatCurrency(debits)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Net flow
            </div>
            <div
              className={`text-xl font-semibold tabular-nums mt-1 ${
                net >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatCurrency(net)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="credit">Credits</TabsTrigger>
          <TabsTrigger value="debit">Debits</TabsTrigger>
        </TabsList>
      </Tabs>

      {isEmpty ? (
        <div className="rounded-lg border border-dashed bg-card/50 p-12 text-center">
          <div className="font-medium">No transactions logged</div>
          <p className="text-sm text-muted-foreground mb-4">
            Add a credit or debit to start your ledger.
          </p>
          <Button onClick={() => setCreateOpen(true)}>Add a transaction</Button>
        </div>
      ) : (
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="hidden md:table-cell">Account</TableHead>
                <TableHead className="hidden md:table-cell">Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : transactions?.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            t.type === "credit"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          }
                        >
                          {t.type === "credit" ? "In" : "Out"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {t.source}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {t.accountName}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground capitalize">
                        {t.method}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(t.date)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-semibold ${
                          t.type === "credit"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {t.type === "credit" ? "+" : "-"}
                        {formatCurrency(Number(t.amount))}
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
                              className="text-destructive"
                              onClick={() => setDeleteId(t.id)}
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

      <TransactionFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the entry from your ledger.
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
