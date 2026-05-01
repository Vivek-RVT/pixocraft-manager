import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { CalendarDatePicker } from "@/components/ui/calendar-date-picker";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useCreateTransaction,
  getListTransactionsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetRecentActivityQueryKey,
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

type FormValues = {
  type: "credit" | "debit";
  amount: string;
  source: string;
  accountName: string;
  method: "upi" | "bank" | "cash";
  date: string;
  notes: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function TransactionFormDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, control, formState } =
    useForm<FormValues>({
      defaultValues: {
        type: "credit",
        amount: "",
        source: "",
        accountName: "HDFC Current",
        method: "bank",
        date: today(),
        notes: "",
      },
    });

  useEffect(() => {
    if (open) {
      reset({
        type: "credit",
        amount: "",
        source: "",
        accountName: "HDFC Current",
        method: "bank",
        date: today(),
        notes: "",
      });
    }
  }, [open, reset]);

  const createMutation = useCreateTransaction();

  const onSubmit = async (values: FormValues) => {
    const payload = {
      type: values.type,
      amount: Number(values.amount),
      source: values.source.trim(),
      accountName: values.accountName.trim(),
      method: values.method,
      date: (values.date + "T00:00:00.000Z" as unknown as Date),
      notes: values.notes.trim() || undefined,
    };
    try {
      await createMutation.mutateAsync({ data: payload });
      toast.success("Transaction recorded");
      queryClient.invalidateQueries({
        queryKey: getListTransactionsQueryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: getGetDashboardSummaryQueryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: getGetRecentActivityQueryKey(),
      });
      onOpenChange(false);
    } catch {
      toast.error("Could not save transaction");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>New transaction</DialogTitle>
          <DialogDescription>
            Record money in or out of your account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Credit (money in)</SelectItem>
                      <SelectItem value="debit">Debit (money out)</SelectItem>
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
              <Label htmlFor="source">Source / counter-party *</Label>
              <Input
                id="source"
                {...register("source", { required: true })}
                placeholder="Customer name or vendor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountName">Account</Label>
              <Input id="accountName" {...register("accountName")} />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Controller
                control={control}
                name="method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Date *</Label>
              <Controller
                control={control}
                name="date"
                rules={{ required: true }}
                render={({ field }) => (
                  <CalendarDatePicker value={field.value} onChange={field.onChange} />
                )}
              />
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
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
