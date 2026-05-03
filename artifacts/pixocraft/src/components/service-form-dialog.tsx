import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Plus, Trash2 } from "lucide-react";
import { CalendarDatePicker } from "@/components/ui/calendar-date-picker";
import { useFormDraft } from "@/hooks/use-form-draft";
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
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

type ServiceRowValues = {
  serviceType: "web" | "digital" | "other";
  billingType: "one_time" | "monthly";
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

type FormValues = {
  customerId: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service;
  presetCustomerId?: number;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const defaultRow = (): ServiceRowValues => ({
  serviceType: "other",
  billingType: "one_time",
  serviceName: "",
  priceSold: "",
  costPrice: "",
  amountPaid: "",
  paymentStatus: "pending",
  deliveryStatus: "pending",
  date: todayStr(),
  notes: "",
  satisfactionRating: null,
});

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


function ServiceRow({
  idx,
  row,
  onChange,
  onRemove,
  canRemove,
  serviceNames,
}: {
  idx: number;
  row: ServiceRowValues;
  onChange: (updates: Partial<ServiceRowValues>) => void;
  onRemove: () => void;
  canRemove: boolean;
  serviceNames: string[];
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filteredNames = useMemo(() => {
    if (!row.serviceName || !serviceNames) return [];
    return serviceNames.filter((n) =>
      n.toLowerCase().includes(row.serviceName.toLowerCase()),
    );
  }, [row.serviceName, serviceNames]);

  const priceSold = Number(row.priceSold || 0);
  const costPrice = Number(row.costPrice || 0);
  const profit = priceSold - costPrice;

  return (
    <div className="border rounded-lg p-4 space-y-3 relative bg-muted/20">
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pr-6">
        Service {idx + 1}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Service type</Label>
          <Select
            value={row.serviceType}
            onValueChange={(v) =>
              onChange({ serviceType: v as "web" | "digital" | "other" })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="web">Pixocraft Web</SelectItem>
              <SelectItem value="digital">Pixocraft Digital</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Billing type</Label>
          <Select
            value={row.billingType}
            onValueChange={(v) =>
              onChange({ billingType: v as "one_time" | "monthly" })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one_time">One time</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Date *</Label>
          <CalendarDatePicker
            value={row.date}
            onChange={(v) => onChange({ date: v })}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2 relative">
          <Label className="text-xs">Service name *</Label>
          <Input
            autoComplete="off"
            value={row.serviceName}
            placeholder="Website design, SEO, Brand identity..."
            onChange={(e) => {
              onChange({ serviceName: e.target.value });
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
                    onChange({ serviceName: name });
                    setShowSuggestions(false);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Price sold (₹) *</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={row.priceSold}
            placeholder="0"
            onChange={(e) => onChange({ priceSold: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Cost price (₹) *</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={row.costPrice}
            placeholder="0"
            onChange={(e) => onChange({ costPrice: e.target.value })}
          />
        </div>

        <div className="sm:col-span-2 rounded-md border bg-muted/40 px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Profit</span>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              profit >= 0 ? "text-emerald-500" : "text-red-500",
            )}
          >
            {formatCurrency(profit)}
          </span>
        </div>

        {row.billingType === "monthly" && (
          <div className="sm:col-span-2 rounded-md border bg-blue-50 dark:bg-blue-950/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                Monthly tracking
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-300">
                tick + progress
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m) => (
                <div key={m} className="rounded-lg border bg-white/80 px-2 py-2 text-center text-[10px] font-medium text-muted-foreground">
                  <div>{m}</div>
                  <div className="mt-1 flex justify-center">
                    <div className="h-3 w-3 rounded-full border-2 border-blue-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Amount paid (₹)</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={row.amountPaid}
            placeholder="0"
            onChange={(e) => onChange({ amountPaid: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Payment status</Label>
          <Select
            value={row.paymentStatus}
            onValueChange={(v) =>
              onChange({ paymentStatus: v as "paid" | "pending" | "partial" })
            }
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
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Delivery status</Label>
          <Select
            value={row.deliveryStatus}
            onValueChange={(v) =>
              onChange({
                deliveryStatus: v as "pending" | "in_progress" | "delivered",
              })
            }
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
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Customer satisfaction (expected)</Label>
          <StarRating
            value={row.satisfactionRating}
            onChange={(v) => onChange({ satisfactionRating: v })}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Notes</Label>
          <Textarea
            rows={2}
            value={row.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </div>
      </div>
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

  const { data: serviceNames = [] } = useQuery<string[]>({
    queryKey: ["service-names"],
    queryFn: async () => {
      const res = await fetch("/api/service-names");
      return res.json();
    },
  });

  const form = useForm<FormValues>({
    defaultValues: { customerId: "" },
  });
  const { control, handleSubmit, reset, formState } = form;

  const { clearDraft: clearFormDraft, loadDraft: loadFormDraft } = useFormDraft(
    "new-service",
    form,
    { enabled: !isEdit },
  );

  const ROWS_DRAFT_KEY = "pixocraft_draft_new-service-rows";

  const [rows, setRows] = useState<ServiceRowValues[]>([defaultRow()]);

  useEffect(() => {
    if (!isEdit) {
      try {
        localStorage.setItem(ROWS_DRAFT_KEY, JSON.stringify(rows));
      } catch {}
    }
  }, [rows, isEdit]);

  useEffect(() => {
    if (!open) return;
    if (service) {
      reset({ customerId: String(service.customerId) });
      setRows([
        {
          serviceType:
            (service.serviceType as "web" | "digital" | "other") ?? "other",
          billingType: "one_time",
          serviceName: service.serviceName,
          priceSold: String(service.priceSold),
          costPrice: String(service.costPrice),
          amountPaid: String(service.amountPaid ?? 0),
          paymentStatus: service.paymentStatus as "paid" | "pending" | "partial",
          deliveryStatus: service.deliveryStatus as
            | "pending"
            | "in_progress"
            | "delivered",
          date: service.date,
          notes: service.notes ?? "",
          satisfactionRating: (service as any).satisfactionRating ?? null,
        },
      ]);
    } else {
      const formDraft = loadFormDraft();
      reset({
        customerId: presetCustomerId ? String(presetCustomerId) : "",
        ...formDraft,
      });
      try {
        const savedRows = localStorage.getItem(ROWS_DRAFT_KEY);
        setRows(savedRows ? JSON.parse(savedRows) : [defaultRow()]);
      } catch {
        setRows([defaultRow()]);
      }
    }
  }, [open, service, presetCustomerId, reset]);

  const updateRow = (idx: number, updates: Partial<ServiceRowValues>) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...updates } : r)),
    );
  };

  const addRow = () => setRows((prev) => [...prev, defaultRow()]);
  const removeRow = (idx: number) =>
    setRows((prev) => prev.filter((_, i) => i !== idx));

  const createMutation = useCreateService();
  const updateMutation = useUpdateService();
  const [submitting, setSubmitting] = useState(false);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
    queryClient.invalidateQueries({
      queryKey: getGetDashboardSummaryQueryKey(),
    });
    queryClient.invalidateQueries({ queryKey: getGetRevenueTrendQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTopServicesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTopCustomersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
    queryClient.invalidateQueries({ queryKey: ["service-names"] });
    queryClient.invalidateQueries({ queryKey: ["service-type-breakdown"] });
  };

  const onSubmit = async (values: FormValues) => {
    if (!values.customerId) {
      toast.error("Please select a customer");
      return;
    }
    for (const row of rows) {
      if (!row.serviceName.trim()) {
        toast.error("Please fill in all service names");
        return;
      }
      if (!row.priceSold) {
        toast.error("Please fill in price for all services");
        return;
      }
      if (!row.costPrice) {
        toast.error("Please fill in cost for all services");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isEdit && service) {
        const row = rows[0];
        await updateMutation.mutateAsync({
          id: service.id,
          data: {
            serviceType: row.serviceType,
            serviceName: row.serviceName.trim(),
            priceSold: Number(row.priceSold),
            costPrice: Number(row.costPrice),
            amountPaid: Number(row.amountPaid || 0),
            paymentStatus: row.paymentStatus,
            deliveryStatus: row.deliveryStatus,
            satisfactionRating: row.satisfactionRating,
            date: row.date,
            notes: row.notes.trim() || undefined,
          },
        });
        toast.success("Service updated");
      } else {
        for (const row of rows) {
          await createMutation.mutateAsync({
            data: {
              customerId: Number(values.customerId),
              serviceType: row.serviceType,
              serviceName: row.serviceName.trim(),
              priceSold: Number(row.priceSold),
              costPrice: Number(row.costPrice),
              amountPaid: Number(row.amountPaid || 0),
              paymentStatus: row.paymentStatus,
              deliveryStatus: row.deliveryStatus,
              satisfactionRating: row.satisfactionRating,
              date: row.date,
              notes: row.notes.trim() || undefined,
            },
          });
        }
        clearFormDraft();
        try { localStorage.removeItem(ROWS_DRAFT_KEY); } catch {}
        toast.success(
          rows.length === 1
            ? "Service added"
            : `${rows.length} services added`,
        );
      }
      invalidateAll();
      onOpenChange(false);
    } catch {
      toast.error("Could not save service");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[660px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit service" : "New service"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this service entry."
              : "Log one or more services sold to a customer."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
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

          <div className="space-y-3">
            {rows.map((row, idx) => (
              <ServiceRow
                key={idx}
                idx={idx}
                row={row}
                onChange={(updates) => updateRow(idx, updates)}
                onRemove={() => removeRow(idx)}
                canRemove={rows.length > 1}
                serviceNames={serviceNames}
              />
            ))}
          </div>

          {!isEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add another service
            </Button>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : isEdit
                  ? "Save changes"
                  : rows.length > 1
                    ? `Add ${rows.length} services`
                    : "Add service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
