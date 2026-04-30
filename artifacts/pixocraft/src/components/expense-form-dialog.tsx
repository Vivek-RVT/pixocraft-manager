import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useCreateExpense,
  useUpdateExpense,
  getListExpensesQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetRevenueTrendQueryKey,
  getGetExpenseBreakdownQueryKey,
  getGetRecentActivityQueryKey,
  type Expense,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  { value: "ads", label: "Ads & Marketing" },
  { value: "salary", label: "Salary & Payroll" },
  { value: "hosting", label: "Hosting & Domains" },
  { value: "tools", label: "Tools & Software" },
  { value: "travel", label: "Travel" },
  { value: "office", label: "Office" },
  { value: "misc", label: "Miscellaneous" },
] as const;

type FormValues = {
  category: (typeof CATEGORIES)[number]["value"];
  amount: string;
  date: string;
  notes: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense;
}

const today = () => new Date().toISOString().slice(0, 10);

export function ExpenseFormDialog({ open, onOpenChange, expense }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!expense;

  const { register, handleSubmit, reset, control, formState } =
    useForm<FormValues>({
      defaultValues: {
        category: "ads",
        amount: "",
        date: today(),
        notes: "",
      },
    });

  useEffect(() => {
    if (!open) return;
    if (expense) {
      reset({
        category: expense.category,
        amount: String(expense.amount),
        date: expense.date,
        notes: expense.notes ?? "",
      });
    } else {
      reset({ category: "ads", amount: "", date: today(), notes: "" });
    }
  }, [open, expense, reset]);

  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
    queryClient.invalidateQueries({
      queryKey: getGetDashboardSummaryQueryKey(),
    });
    queryClient.invalidateQueries({ queryKey: getGetRevenueTrendQueryKey() });
    queryClient.invalidateQueries({
      queryKey: getGetExpenseBreakdownQueryKey(),
    });
    queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      category: values.category,
      amount: Number(values.amount),
      date: new Date(values.date).toISOString(),
      notes: values.notes.trim() || undefined,
    };
    try {
      if (isEdit && expense) {
        await updateMutation.mutateAsync({ id: expense.id, data: payload });
        toast.success("Expense updated");
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast.success("Expense logged");
      }
      invalidateAll();
      onOpenChange(false);
    } catch {
      toast.error("Could not save expense");
    }
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit expense" : "New expense"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this expense entry."
              : "Log a business expense."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                {...register("amount", { required: true })}
                placeholder="0"
              />
              {formState.errors.amount && (
                <p className="text-xs text-destructive">Amount is required</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" {...register("date", { required: true })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register("notes")} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
