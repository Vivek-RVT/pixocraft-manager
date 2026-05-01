import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useFormDraft } from "@/hooks/use-form-draft";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useCreateCustomer,
  useUpdateCustomer,
  useGetCustomer,
  getListCustomersQueryKey,
  getGetCustomerQueryKey,
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
import { CalendarDatePicker } from "@/components/ui/calendar-date-picker";

type FormValues = {
  name: string;
  phone: string;
  email: string;
  businessName: string;
  address: string;
  notes: string;
  contactedAt: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: number;
}

const today = () => new Date().toISOString().slice(0, 10);

function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function CustomerFormDialog({ open, onOpenChange, customerId }: Props) {
  const queryClient = useQueryClient();
  const isEdit = typeof customerId === "number";

  const { data: existing } = useGetCustomer(customerId ?? 0, {
    query: {
      enabled: isEdit && open,
      queryKey: getGetCustomerQueryKey(customerId ?? 0),
    },
  });

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      businessName: "",
      address: "",
      notes: "",
      contactedAt: today(),
    },
  });
  const { register, handleSubmit, reset, control, formState } = form;

  const { clearDraft, loadDraft } = useFormDraft("new-customer", form, {
    enabled: !isEdit,
  });

  useEffect(() => {
    if (open && isEdit && existing) {
      const c = existing.customer;
      reset({
        name: c.name ?? "",
        phone: c.phone ?? "",
        email: c.email ?? "",
        businessName: c.businessName ?? "",
        address: c.address ?? "",
        notes: c.notes ?? "",
        contactedAt: toDateInput(c.contactedAt) || today(),
      });
    } else if (open && !isEdit) {
      const draft = loadDraft();
      reset({
        name: "",
        phone: "",
        email: "",
        businessName: "",
        address: "",
        notes: "",
        contactedAt: today(),
        ...draft,
      });
    }
  }, [open, isEdit, existing, reset]);

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name.trim(),
      phone: values.phone.trim() || undefined,
      email: values.email.trim() || undefined,
      businessName: values.businessName.trim() || undefined,
      address: values.address.trim() || undefined,
      notes: values.notes.trim() || undefined,
      contactedAt: values.contactedAt
        ? (values.contactedAt + "T00:00:00.000Z" as unknown as Date)
        : undefined,
    };
    try {
      if (isEdit && customerId) {
        await updateMutation.mutateAsync({ id: customerId, data: payload });
        toast.success("Customer updated");
        queryClient.invalidateQueries({
          queryKey: getGetCustomerQueryKey(customerId),
        });
      } else {
        await createMutation.mutateAsync({ data: payload });
        clearDraft();
        toast.success("Customer added");
      }
      queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      onOpenChange(false);
    } catch {
      toast.error("Could not save customer");
    }
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit customer" : "New customer"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the customer's profile details."
              : "Add a new customer to your studio."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register("name", { required: true })}
                placeholder="Aarav Mehta"
              />
              {formState.errors.name && (
                <p className="text-xs text-destructive">Name is required</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessName">Business</Label>
              <Input
                id="businessName"
                {...register("businessName")}
                placeholder="Northlight Studio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} placeholder="+91 ..." />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="hello@studio.in"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...register("address")}
                placeholder="City, area"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>First contact date</Label>
              <Controller
                control={control}
                name="contactedAt"
                render={({ field }) => (
                  <CalendarDatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Pick a date"
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">When did you first connect with this customer?</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register("notes")}
                rows={2}
                placeholder="Anything worth remembering"
              />
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
              {pending ? "Saving..." : isEdit ? "Save changes" : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
