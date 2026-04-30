import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  useListExpenses,
  getListExpensesQueryKey,
  useDeleteExpense,
  useGetExpenseBreakdown,
  getGetExpenseBreakdownQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetRevenueTrendQueryKey,
  getGetRecentActivityQueryKey,
  type Expense,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpenseFormDialog } from "@/components/expense-form-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const CATEGORIES = [
  { value: "ads", label: "Ads & Marketing" },
  { value: "salary", label: "Salary & Payroll" },
  { value: "hosting", label: "Hosting & Domains" },
  { value: "tools", label: "Tools & Software" },
  { value: "travel", label: "Travel" },
  { value: "office", label: "Office" },
  { value: "misc", label: "Miscellaneous" },
];

const labelFor = (cat: string) =>
  CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

export default function Expenses() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const params =
    filter !== "all"
      ? {
          category: filter as
            | "ads"
            | "salary"
            | "hosting"
            | "tools"
            | "travel"
            | "office"
            | "misc",
        }
      : undefined;
  const { data: expenses, isLoading } = useListExpenses(params, {
    query: { queryKey: getListExpensesQueryKey(params) },
  });
  const { data: breakdown } = useGetExpenseBreakdown({
    query: { queryKey: getGetExpenseBreakdownQueryKey() },
  });

  const deleteMutation = useDeleteExpense();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteId });
      toast.success("Expense deleted");
      queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      queryClient.invalidateQueries({
        queryKey: getGetExpenseBreakdownQueryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: getGetDashboardSummaryQueryKey(),
      });
      queryClient.invalidateQueries({ queryKey: getGetRevenueTrendQueryKey() });
      queryClient.invalidateQueries({
        queryKey: getGetRecentActivityQueryKey(),
      });
    } catch {
      toast.error("Could not delete expense");
    } finally {
      setDeleteId(null);
    }
  };

  const totalExpenses = (expenses ?? []).reduce(
    (sum, e) => sum + Number(e.amount),
    0,
  );
  const isEmpty = !isLoading && (expenses?.length ?? 0) === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-muted-foreground text-sm">
          Track where your studio is spending its money.
        </p>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Spending by category
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[260px]">
          {breakdown && breakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={breakdown.map((b) => ({
                  ...b,
                  category: labelFor(b.category),
                }))}
                margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="category"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => formatCurrency(Number(value))}
                />
                <Bar
                  dataKey="amount"
                  fill="hsl(var(--chart-4))"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">
              Add expenses to see your category breakdown.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          Total:{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {formatCurrency(totalExpenses)}
          </span>
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-lg border border-dashed bg-card/50 p-12 text-center">
          <div className="font-medium">No expenses logged</div>
          <p className="text-sm text-muted-foreground mb-4">
            Start tracking what your studio is spending on.
          </p>
          <Button onClick={() => setCreateOpen(true)}>Add an expense</Button>
        </div>
      ) : (
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="hidden md:table-cell">Notes</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : expenses?.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {labelFor(e.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {e.notes ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(e.date)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatCurrency(Number(e.amount))}
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
                            <DropdownMenuItem onClick={() => setEditExpense(e)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(e.id)}
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

      <ExpenseFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editExpense && (
        <ExpenseFormDialog
          open={!!editExpense}
          onOpenChange={(o) => !o && setEditExpense(null)}
          expense={editExpense}
        />
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the expense entry.
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
