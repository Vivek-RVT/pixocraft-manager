import { useEffect } from "react";
import { useForm } from "react-hook-form";
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

type FormValues = {
  name: string;
  phone: string;
  email: string;
  businessName: string;
  address: string;
  notes: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: number;
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

  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      businessName: "",
      address: "",
      notes: "",
    },
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
      });
    } else if (open && !isEdit) {
      reset({
        name: "",
        phone: "",
        email: "",
        businessName: "",
        address: "",
        notes: "",
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
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register("notes")}
                rows={3}
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
