import { useState } from "react";
import { Users, Briefcase, Receipt, ArrowLeftRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomerFormDialog } from "@/components/customer-form-dialog";
import { ServiceFormDialog } from "@/components/service-form-dialog";
import { ExpenseFormDialog } from "@/components/expense-form-dialog";
import { TransactionFormDialog } from "@/components/transaction-form-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const choices = [
  {
    key: "customer" as const,
    title: "Customer",
    description: "Add a new client to your studio",
    icon: Users,
  },
  {
    key: "service" as const,
    title: "Service",
    description: "Log a service you sold",
    icon: Briefcase,
  },
  {
    key: "expense" as const,
    title: "Expense",
    description: "Record a business expense",
    icon: Receipt,
  },
  {
    key: "transaction" as const,
    title: "Transaction",
    description: "Money in or out of your bank",
    icon: ArrowLeftRight,
  },
];

export function QuickAddDialog({ open, onOpenChange }: Props) {
  const [active, setActive] = useState<
    "customer" | "service" | "expense" | "transaction" | null
  >(null);

  const close = () => {
    onOpenChange(false);
    setActive(null);
  };

  return (
    <>
      <Dialog
        open={open && active === null}
        onOpenChange={(o) => {
          if (!o) close();
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Quick add</DialogTitle>
            <DialogDescription>
              Pick what you'd like to record.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {choices.map((choice) => (
              <button
                key={choice.key}
                onClick={() => setActive(choice.key)}
                className="text-left rounded-lg border bg-card p-4 transition hover-elevate active-elevate-2 group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition">
                    <choice.icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-sm">{choice.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {choice.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <CustomerFormDialog
        open={active === "customer"}
        onOpenChange={(o) => {
          if (!o) close();
        }}
      />
      <ServiceFormDialog
        open={active === "service"}
        onOpenChange={(o) => {
          if (!o) close();
        }}
      />
      <ExpenseFormDialog
        open={active === "expense"}
        onOpenChange={(o) => {
          if (!o) close();
        }}
      />
      <TransactionFormDialog
        open={active === "transaction"}
        onOpenChange={(o) => {
          if (!o) close();
        }}
      />
    </>
  );
}
