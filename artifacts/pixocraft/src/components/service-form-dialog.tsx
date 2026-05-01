import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Star } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

type FormValues = {
  customerId: string;
  serviceType: "web" | "digital" | "other";
  serviceName: string;
  priceSold: string;
  costPrice: string;
  amountPaid: string;
  paymentStatus: "paid" | "pending" | "partial";
  deliveryStatus: "pending" | "in_progress" | "delivered";
  date: string;
  notes: string;
  satisfactionRating: number | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service;
  presetCustomerId?: number;
}

const today = () => new Date().toISOString().slice(0, 10);

function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value ?? 0;
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="p-0.5 focus:outline-none"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onChange(value === star ? null : star)}
        >
          <Star
            className={cn(
              "w-5 h-5 transition-colors",
              star <= display
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted-foreground",
            )}
          />
        </button>
      ))}
      {value !== null && (
        <span className="text-xs text-muted-foreground ml-1">{value}/5</span>
      )}
    </div>
  );
}

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

  const { data: serviceNames } = useQuery<string[]>({
    queryKey: ["service-names"],
    queryFn: async () => {
      const res = await fetch("/api/service-names");
      return res.json();
    },
  });

  const { register, handleSubmit, reset, watch, control, setValue, formState } =
    useForm<FormValues>({
      defaultValues: {
        customerId: "",
        serviceType: "other",
        serviceName: "",
        priceSold: "",
        costPrice: "",
        amountPaid: "",
        paymentStatus: "pending",
        deliveryStatus: "pending",
        date: today(),
        notes: "",
        satisfactionRating: null,
      },
    });

  useEffect(() => {
    if (!open) return;
    if (service) {
      reset({
        customerId: String(service.customerId),
        serviceType: (service.serviceType as "web" | "digital" | "other") ?? "other",
        serviceName: service.serviceName,
        priceSold: String(service.priceSold),
        costPrice: String(service.costPrice),
        amountPaid: String(service.amountPaid ?? 0),
        paymentStatus: service.paymentStatus,
        deliveryStatus: service.deliveryStatus,
        date: service.date,
        notes: service.notes ?? "",
        satisfactionRating: (service as any).satisfactionRating ?? null,
      });
    } else {
      reset({
        customerId: presetCustomerId ? String(presetCustomerId) : "",
        serviceType: "other",
        serviceName: "",
        priceSold: "",
        costPrice: "",
        amountPaid: "",
        paymentStatus: "pending",
        deliveryStatus: "pending",
        date: today(),
        notes: "",
        satisfactionRating: null,
      });
    }
  }, [open, service, presetCustomerId, reset]);

  const priceSold = Number(watch("priceSold") || 0);
  const costPrice = Number(watch("costPrice") || 0);
  const profit = useMemo(() => priceSold - costPrice, [priceSold, costPrice]);

  const dateValue = watch("date");
  const [calOpen, setCalOpen] = useState(false);

  const [nameInput, setNameInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const serviceName = watch("serviceName");

  const filteredNames = useMemo(() => {
    if (!nameInput || !serviceNames) return [];
    return serviceNames.filter((n) =>
      n.toLowerCase().includes(nameInput.toLowerCase()),
    );
  }, [nameInput, serviceNames]);

  const createMutation = useCreateService();
  const updateMutation = useUpdateService();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRevenueTrendQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTopServicesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTopCustomersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
    queryClient.invalidateQueries({ queryKey: ["service-names"] });
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      customerId: Number(values.customerId),
      serviceType: values.serviceType,
      serviceName: values.serviceName.trim(),
      priceSold: Number(values.priceSold),
      costPrice: Number(values.costPrice),
      amountPaid: Number(values.amountPaid || 0),
      paymentStatus: values.paymentStatus,
      deliveryStatus: values.deliveryStatus,
      satisfactionRating: values.satisfactionRating,
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
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
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

            {/* Customer */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Customer *</Label>
              <Controller
                control={control}
                name="customerId"
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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

            {/* Service Type */}
            <div className="space-y-2">
              <Label>Service type</Label>
              <Controller
                control={control}
                name="serviceType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">Pixocraft Web</SelectItem>
                      <SelectItem value="digital">Pixocraft Digital</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Date picker */}
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateValue && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateValue
                      ? format(new Date(dateValue + "T00:00:00"), "dd MMM yyyy")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateValue ? new Date(dateValue + "T00:00:00") : undefined}
                    onSelect={(d) => {
                      if (d) {
                        setValue("date", d.toISOString().slice(0, 10));
                      }
                      setCalOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Service Name with autocomplete */}
            <div className="space-y-2 sm:col-span-2 relative">
              <Label htmlFor="serviceName">Service name *</Label>
              <Input
                id="serviceName"
                autoComplete="off"
                value={serviceName}
                placeholder="Brand identity, retainer, SEO..."
                {...register("serviceName", { required: true })}
                onChange={(e) => {
                  register("serviceName").onChange(e);
                  setNameInput(e.target.value);
                  setShowSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => setShowSuggestions(true)}
              />
              {showSuggestions && filteredNames.length > 0 && (
                <div className="absolute z-50 w-full bg-popover border rounded-md shadow-md mt-1 max-h-40 overflow-y-auto">
                  {filteredNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                      onMouseDown={() => {
                        setValue("serviceName", name);
                        setNameInput(name);
                        setShowSuggestions(false);
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
              {formState.errors.serviceName && (
                <p className="text-xs text-destructive">Service name is required</p>
              )}
            </div>

            {/* Price sold */}
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

            {/* Cost price */}
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

            {/* Profit display */}
            <div className="sm:col-span-2 rounded-md border bg-muted/40 p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Profit</span>
              <span
                className={cn(
                  "text-base font-semibold tabular-nums",
                  profit >= 0 ? "text-emerald-500" : "text-red-500",
                )}
              >
                {formatCurrency(profit)}
              </span>
            </div>

            {/* Amount paid */}
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

            {/* Payment status */}
            <div className="space-y-2">
              <Label>Payment status</Label>
              <Controller
                control={control}
                name="paymentStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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

            {/* Delivery status */}
            <div className="space-y-2">
              <Label>Delivery status</Label>
              <Controller
                control={control}
                name="deliveryStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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

            {/* Satisfaction rating */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Customer satisfaction</Label>
              <Controller
                control={control}
                name="satisfactionRating"
                render={({ field }) => (
                  <StarRating
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Notes */}
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
