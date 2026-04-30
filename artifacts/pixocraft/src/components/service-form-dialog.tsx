import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useCreateService,
  useUpdateService,
  useListCustomers,
  getListCustomersQueryKey,
  getListServicesQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetRevenueTrendQueryKey,
  getGetTopServicesQueryKey,
  getGetTopCustomersQueryKey,
  getGetRecentActivityQueryKey,
  type Service,
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
import { formatCurrency } from "@/lib/format";

type FormValues = {
  customerId: string;
  serviceName: string;
  priceSold: string;
  costPrice: string;
  amountPaid: string;
  paymentStatus: "paid" | "pending" | "partial";
  deliveryStatus: "pending" | "in_progress" | "delivered";
  date: string;
  notes: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service;
  presetCustomerId?: number;
}

const today = () => new Date().toISOString().slice(0, 10);

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  presetCustomerId,
}: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!service;

  const { data: customers } = useListCustomers(undefined, {
    query: { queryKey: getListCustomersQueryKey() },
  });

  const { register, handleSubmit, reset, watch, control, formState } =
    useForm<FormValues>({
      defaultValues: {
        customerId: "",
        serviceName: "",
        priceSold: "",
        costPrice: "",
        amountPaid: "",
        paymentStatus: "pending",
        deliveryStatus: "pending",
        date: today(),
        notes: "",
      },
    });

  useEffect(() => {
    if (!open) return;
    if (service) {
      reset({
        customerId: String(service.customerId),
        serviceName: service.serviceName,
        priceSold: String(service.priceSold),
        costPrice: String(service.costPrice),
        amountPaid: String(service.amountPaid ?? 0),
        paymentStatus: service.paymentStatus,
        deliveryStatus: service.deliveryStatus,
        date: service.date,
        notes: service.notes ?? "",
      });
    } else {
      reset({
        customerId: presetCustomerId ? String(presetCustomerId) : "",
        serviceName: "",
        priceSold: "",
        costPrice: "",
        amountPaid: "",
        paymentStatus: "pending",
        deliveryStatus: "pending",
        date: today(),
        notes: "",
      });
    }
  }, [open, service, presetCustomerId, reset]);

  const priceSold = Number(watch("priceSold") || 0);
  const costPrice = Number(watch("costPrice") || 0);
  const profit = useMemo(() => priceSold - costPrice, [priceSold, costPrice]);

  const createMutation = useCreateService();
  const updateMutation = useUpdateService();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
    queryClient.invalidateQueries({
      queryKey: getGetDashboardSummaryQueryKey(),
    });
    queryClient.invalidateQueries({ queryKey: getGetRevenueTrendQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTopServicesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTopCustomersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      customerId: Number(values.customerId),
      serviceName: values.serviceName.trim(),
      priceSold: Number(values.priceSold),
      costPrice: Number(values.costPrice),
      amountPaid: Number(values.amountPaid || 0),
      paymentStatus: values.paymentStatus,
      deliveryStatus: values.deliveryStatus,
      date: new Date(values.date).toISOString(),
      notes: values.notes.trim() || undefined,
    };
    try {
      if (isEdit && service) {
        await updateMutation.mutateAsync({ id: service.id, data: payload });
        toast.success("Service updated");
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast.success("Service added");
      }
      invalidateAll();
      onOpenChange(false);
    } catch {
      toast.error("Could not save service");
    }
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit service" : "New service"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this service entry."
              : "Log a service you sold to a customer."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Customer *</Label>
              <Controller
                control={control}
                name="customerId"
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                          {c.businessName ? ` — ${c.businessName}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {formState.errors.customerId && (
                <p className="text-xs text-destructive">Customer is required</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="serviceName">Service *</Label>
              <Input
                id="serviceName"
                {...register("serviceName", { required: true })}
                placeholder="Brand identity, retainer, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceSold">Price sold (₹) *</Label>
              <Input
                id="priceSold"
                type="number"
                inputMode="decimal"
                {...register("priceSold", { required: true })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPrice">Cost price (₹) *</Label>
              <Input
                id="costPrice"
                type="number"
                inputMode="decimal"
                {...register("costPrice", { required: true })}
                placeholder="0"
              />
            </div>
            <div className="sm:col-span-2 rounded-md border bg-muted/40 p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Profit</span>
              <span
                className={`text-base font-semibold tabular-nums ${
                  profit >= 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {formatCurrency(profit)}
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amountPaid">Amount paid (₹)</Label>
              <Input
                id="amountPaid"
                type="number"
                inputMode="decimal"
                {...register("amountPaid")}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" {...register("date", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Payment status</Label>
              <Controller
                control={control}
                name="paymentStatus"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Delivery status</Label>
              <Controller
                control={control}
                name="deliveryStatus"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
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
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save changes" : "Add service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
