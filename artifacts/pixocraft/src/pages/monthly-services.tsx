import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, getYear, getMonth } from "date-fns";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  Globe,
  Megaphone,
  ChevronDown,
  ChevronUp,
  CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { useListCustomers } from "@workspace/api-client-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

function DatePickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value
            ? format(new Date(value + "T00:00:00"), "dd MMM yyyy")
            : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? new Date(value + "T00:00:00") : undefined}
          onSelect={(d) => {
            if (d) onChange(d.toISOString().slice(0, 10));
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

const BASE_PATH = import.meta.env.BASE_URL ?? "/pixocraft/";

async function apiFetch(path: string, options?: RequestInit) {
  const base = BASE_PATH.endsWith("/") ? BASE_PATH.slice(0, -1) : BASE_PATH;
  const res = await fetch(`${base}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type MonthlyCompletion = {
  id: number;
  serviceId: number;
  year: number;
  month: number;
  completed: boolean;
  paidAmount: number;
  notes: string | null;
  completedAt: string | null;
};

type MonthlyWebsiteService = {
  id: number;
  customerId: number;
  customerName: string;
  websiteName: string;
  monthlyCost: number;
  monthlyCharge: number;
  discount: number;
  startDate: string;
  status: "active" | "paused" | "cancelled";
  notes: string | null;
  completions: MonthlyCompletion[];
};

type MonthlyDigitalService = {
  id: number;
  customerId: number;
  customerName: string;
  serviceName: string;
  platform: string | null;
  monthlyCost: number;
  monthlyCharge: number;
  discount: number;
  startDate: string;
  status: "active" | "paused" | "cancelled";
  notes: string | null;
  completions: MonthlyCompletion[];
};

const currentYear = getYear(new Date());
const currentMonth = getMonth(new Date()) + 1;

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs capitalize",
        status === "active" && "border-emerald-400 text-emerald-600",
        status === "paused" && "border-amber-400 text-amber-600",
        status === "cancelled" && "border-red-400 text-red-500",
      )}
    >
      {status}
    </Badge>
  );
}

function MonthGrid({
  completions,
  year,
  serviceId,
  endpoint,
  monthlyCharge,
}: {
  completions: MonthlyCompletion[];
  year: number;
  serviceId: number;
  endpoint: "monthly-website" | "monthly-digital";
  monthlyCharge: number;
}) {
  const qc = useQueryClient();
  const toggleMutation = useMutation({
    mutationFn: async ({
      month,
      completed,
    }: {
      month: number;
      completed: boolean;
    }) =>
      apiFetch(`/${endpoint}/${serviceId}/completion`, {
        method: "POST",
        body: JSON.stringify({
          year,
          month,
          completed,
          paidAmount: completed ? monthlyCharge : 0,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [endpoint] });
    },
    onError: () => toast.error("Could not update completion"),
  });

  const completionMap = useMemo(() => {
    const map = new Map<number, MonthlyCompletion>();
    for (const c of completions) {
      if (c.year === year) map.set(c.month, c);
    }
    return map;
  }, [completions, year]);

  return (
    <div className="grid grid-cols-6 gap-1.5 mt-2">
      {MONTHS.map((m, i) => {
        const monthNum = i + 1;
        const comp = completionMap.get(monthNum);
        const done = comp?.completed ?? false;
        const isFuture =
          year > currentYear ||
          (year === currentYear && monthNum > currentMonth);
        return (
          <button
            key={m}
            disabled={isFuture || toggleMutation.isPending}
            onClick={() =>
              toggleMutation.mutate({ month: monthNum, completed: !done })
            }
            className={cn(
              "flex flex-col items-center justify-center rounded-md border py-1.5 text-xs font-medium transition-colors gap-0.5",
              isFuture
                ? "opacity-30 cursor-not-allowed border-dashed"
                : done
                  ? "bg-emerald-50 border-emerald-400 text-emerald-700 hover:bg-emerald-100"
                  : "hover:bg-accent cursor-pointer",
            )}
          >
            <span>{m}</span>
            {done ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            ) : (
              <Circle className="w-3 h-3 text-muted-foreground/40" />
            )}
          </button>
        );
      })}
    </div>
  );
}

type WebsiteFormData = {
  customerId: string;
  websiteName: string;
  monthlyCost: string;
  monthlyCharge: string;
  discount: string;
  startDate: string;
  status: "active" | "paused" | "cancelled";
  notes: string;
};

type DigitalFormData = {
  customerId: string;
  serviceName: string;
  platform: string;
  monthlyCost: string;
  monthlyCharge: string;
  discount: string;
  startDate: string;
  status: "active" | "paused" | "cancelled";
  notes: string;
};

function WebsiteServiceDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: MonthlyWebsiteService;
  onSaved: () => void;
}) {
  const { data: customers } = useListCustomers();
  const [form, setForm] = useState<WebsiteFormData>({
    customerId: "",
    websiteName: "",
    monthlyCost: "",
    monthlyCharge: "",
    discount: "0",
    startDate: new Date().toISOString().slice(0, 10),
    status: "active",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  useMemo(() => {
    if (!open) return;
    if (editing) {
      setForm({
        customerId: String(editing.customerId),
        websiteName: editing.websiteName,
        monthlyCost: String(editing.monthlyCost),
        monthlyCharge: String(editing.monthlyCharge),
        discount: String(editing.discount),
        startDate: editing.startDate,
        status: editing.status,
        notes: editing.notes ?? "",
      });
    } else {
      setForm({
        customerId: "",
        websiteName: "",
        monthlyCost: "",
        monthlyCharge: "",
        discount: "0",
        startDate: new Date().toISOString().slice(0, 10),
        status: "active",
        notes: "",
      });
    }
  }, [open, editing]);

  const set = (k: keyof WebsiteFormData, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        customerId: Number(form.customerId),
        websiteName: form.websiteName,
        monthlyCost: Number(form.monthlyCost),
        monthlyCharge: Number(form.monthlyCharge),
        discount: Number(form.discount || 0),
        startDate: form.startDate,
        status: form.status,
        notes: form.notes || null,
      };
      if (editing) {
        await apiFetch(`/monthly-website/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast.success("Website service updated");
      } else {
        await apiFetch("/monthly-website", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success("Website service added");
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Could not save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit website service" : "Add website service"}
          </DialogTitle>
          <DialogDescription>Monthly website management service</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Customer *</Label>
              <Select value={form.customerId} onValueChange={(v) => set("customerId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}{c.businessName ? ` — ${c.businessName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Website / Project name *</Label>
              <Input required value={form.websiteName} onChange={(e) => set("websiteName", e.target.value)} placeholder="client.com" />
            </div>
            <div className="space-y-2">
              <Label>Monthly cost (₹)</Label>
              <Input type="number" value={form.monthlyCost} onChange={(e) => set("monthlyCost", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Monthly charge (₹)</Label>
              <Input type="number" value={form.monthlyCharge} onChange={(e) => set("monthlyCharge", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Discount (₹)</Label>
              <Input type="number" value={form.discount} onChange={(e) => set("discount", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Start date</Label>
              <DatePickerField value={form.startDate} onChange={(v) => set("startDate", v)} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : editing ? "Save changes" : "Add service"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DigitalServiceDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: MonthlyDigitalService;
  onSaved: () => void;
}) {
  const { data: customers } = useListCustomers();
  const [form, setForm] = useState<DigitalFormData>({
    customerId: "",
    serviceName: "",
    platform: "",
    monthlyCost: "",
    monthlyCharge: "",
    discount: "0",
    startDate: new Date().toISOString().slice(0, 10),
    status: "active",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  useMemo(() => {
    if (!open) return;
    if (editing) {
      setForm({
        customerId: String(editing.customerId),
        serviceName: editing.serviceName,
        platform: editing.platform ?? "",
        monthlyCost: String(editing.monthlyCost),
        monthlyCharge: String(editing.monthlyCharge),
        discount: String(editing.discount),
        startDate: editing.startDate,
        status: editing.status,
        notes: editing.notes ?? "",
      });
    } else {
      setForm({
        customerId: "",
        serviceName: "",
        platform: "",
        monthlyCost: "",
        monthlyCharge: "",
        discount: "0",
        startDate: new Date().toISOString().slice(0, 10),
        status: "active",
        notes: "",
      });
    }
  }, [open, editing]);

  const set = (k: keyof DigitalFormData, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        customerId: Number(form.customerId),
        serviceName: form.serviceName,
        platform: form.platform || null,
        monthlyCost: Number(form.monthlyCost),
        monthlyCharge: Number(form.monthlyCharge),
        discount: Number(form.discount || 0),
        startDate: form.startDate,
        status: form.status,
        notes: form.notes || null,
      };
      if (editing) {
        await apiFetch(`/monthly-digital/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast.success("Digital service updated");
      } else {
        await apiFetch("/monthly-digital", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success("Digital service added");
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Could not save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit digital service" : "Add digital service"}
          </DialogTitle>
          <DialogDescription>Monthly digital marketing service</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Customer *</Label>
              <Select value={form.customerId} onValueChange={(v) => set("customerId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}{c.businessName ? ` — ${c.businessName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Service name *</Label>
              <Input required value={form.serviceName} onChange={(e) => set("serviceName", e.target.value)} placeholder="SEO, Social Media..." />
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Input value={form.platform} onChange={(e) => set("platform", e.target.value)} placeholder="Instagram, Google..." />
            </div>
            <div className="space-y-2">
              <Label>Monthly cost (₹)</Label>
              <Input type="number" value={form.monthlyCost} onChange={(e) => set("monthlyCost", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Monthly charge (₹)</Label>
              <Input type="number" value={form.monthlyCharge} onChange={(e) => set("monthlyCharge", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Discount (₹)</Label>
              <Input type="number" value={form.discount} onChange={(e) => set("discount", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Start date</Label>
              <DatePickerField value={form.startDate} onChange={(v) => set("startDate", v)} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : editing ? "Save changes" : "Add service"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WebsiteServiceCard({
  service,
  year,
  onEdit,
  onDelete,
}: {
  service: MonthlyWebsiteService;
  year: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const profit = service.monthlyCharge - service.monthlyCost - service.discount;
  const doneThisYear = service.completions.filter(
    (c) => c.year === year && c.completed,
  ).length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-start justify-between p-4 gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate">{service.websiteName}</p>
              <StatusBadge status={service.status} />
            </div>
            <p className="text-xs text-muted-foreground">{service.customerName}</p>
            <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
              <span>Charge: <span className="font-medium text-foreground">{formatCurrency(service.monthlyCharge)}/mo</span></span>
              <span>Cost: <span className="font-medium text-foreground">{formatCurrency(service.monthlyCost)}/mo</span></span>
              <span className={profit >= 0 ? "text-emerald-600" : "text-red-500"}>
                Profit: <span className="font-medium">{formatCurrency(profit)}/mo</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted-foreground mr-2">{doneThisYear}/12 done</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t bg-muted/20">
          <MonthGrid
            completions={service.completions}
            year={year}
            serviceId={service.id}
            endpoint="monthly-website"
            monthlyCharge={service.monthlyCharge}
          />
        </div>
      )}
    </div>
  );
}

function DigitalServiceCard({
  service,
  year,
  onEdit,
  onDelete,
}: {
  service: MonthlyDigitalService;
  year: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const profit = service.monthlyCharge - service.monthlyCost - service.discount;
  const doneThisYear = service.completions.filter(
    (c) => c.year === year && c.completed,
  ).length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-start justify-between p-4 gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate">{service.serviceName}</p>
              <StatusBadge status={service.status} />
              {service.platform && (
                <Badge variant="secondary" className="text-xs">{service.platform}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{service.customerName}</p>
            <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
              <span>Charge: <span className="font-medium text-foreground">{formatCurrency(service.monthlyCharge)}/mo</span></span>
              <span>Cost: <span className="font-medium text-foreground">{formatCurrency(service.monthlyCost)}/mo</span></span>
              <span className={profit >= 0 ? "text-emerald-600" : "text-red-500"}>
                Profit: <span className="font-medium">{formatCurrency(profit)}/mo</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted-foreground mr-2">{doneThisYear}/12 done</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t bg-muted/20">
          <MonthGrid
            completions={service.completions}
            year={year}
            serviceId={service.id}
            endpoint="monthly-digital"
            monthlyCharge={service.monthlyCharge}
          />
        </div>
      )}
    </div>
  );
}

export default function MonthlyServices() {
  const qc = useQueryClient();
  const [year, setYear] = useState(currentYear);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [webDialogOpen, setWebDialogOpen] = useState(false);
  const [digitalDialogOpen, setDigitalDialogOpen] = useState(false);
  const [editingWeb, setEditingWeb] = useState<MonthlyWebsiteService | undefined>();
  const [editingDigital, setEditingDigital] = useState<MonthlyDigitalService | undefined>();
  const [deleteId, setDeleteId] = useState<{ id: number; type: "web" | "digital" } | null>(null);

  const { data: webServices = [], isLoading: webLoading } = useQuery<MonthlyWebsiteService[]>({
    queryKey: ["monthly-website"],
    queryFn: () => apiFetch("/monthly-website"),
  });

  const { data: digitalServices = [], isLoading: digitalLoading } = useQuery<MonthlyDigitalService[]>({
    queryKey: ["monthly-digital"],
    queryFn: () => apiFetch("/monthly-digital"),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: "web" | "digital" }) =>
      apiFetch(`/${type === "web" ? "monthly-website" : "monthly-digital"}/${id}`, {
        method: "DELETE",
      }),
    onSuccess: (_, { type }) => {
      qc.invalidateQueries({ queryKey: [type === "web" ? "monthly-website" : "monthly-digital"] });
      toast.success("Deleted");
      setDeleteId(null);
    },
    onError: () => toast.error("Could not delete"),
  });

  const filteredWeb = useMemo(
    () =>
      statusFilter === "all"
        ? webServices
        : webServices.filter((s) => s.status === statusFilter),
    [webServices, statusFilter],
  );

  const filteredDigital = useMemo(
    () =>
      statusFilter === "all"
        ? digitalServices
        : digitalServices.filter((s) => s.status === statusFilter),
    [digitalServices, statusFilter],
  );

  const webActiveRevenue = webServices
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + s.monthlyCharge, 0);

  const digitalActiveRevenue = digitalServices
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + s.monthlyCharge, 0);

  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monthly Services</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track recurring website and digital marketing services
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Web clients (active)</p>
          <p className="text-2xl font-bold">{webServices.filter((s) => s.status === "active").length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Web MRR</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(webActiveRevenue)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Digital clients (active)</p>
          <p className="text-2xl font-bold">{digitalServices.filter((s) => s.status === "active").length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Digital MRR</p>
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(digitalActiveRevenue)}</p>
        </div>
      </div>

      <Tabs defaultValue="website">
        <TabsList>
          <TabsTrigger value="website">
            <Globe className="w-4 h-4 mr-1.5" />
            Website ({filteredWeb.length})
          </TabsTrigger>
          <TabsTrigger value="digital">
            <Megaphone className="w-4 h-4 mr-1.5" />
            Digital Marketing ({filteredDigital.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="website" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingWeb(undefined); setWebDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" />
              Add website service
            </Button>
          </div>
          {webLoading && <p className="text-muted-foreground text-sm">Loading...</p>}
          {!webLoading && filteredWeb.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No website services found. Add your first one!
            </div>
          )}
          {filteredWeb.map((s) => (
            <WebsiteServiceCard
              key={s.id}
              service={s}
              year={year}
              onEdit={() => { setEditingWeb(s); setWebDialogOpen(true); }}
              onDelete={() => setDeleteId({ id: s.id, type: "web" })}
            />
          ))}
        </TabsContent>

        <TabsContent value="digital" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingDigital(undefined); setDigitalDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" />
              Add digital service
            </Button>
          </div>
          {digitalLoading && <p className="text-muted-foreground text-sm">Loading...</p>}
          {!digitalLoading && filteredDigital.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No digital services found. Add your first one!
            </div>
          )}
          {filteredDigital.map((s) => (
            <DigitalServiceCard
              key={s.id}
              service={s}
              year={year}
              onEdit={() => { setEditingDigital(s); setDigitalDialogOpen(true); }}
              onDelete={() => setDeleteId({ id: s.id, type: "digital" })}
            />
          ))}
        </TabsContent>
      </Tabs>

      <WebsiteServiceDialog
        open={webDialogOpen}
        onOpenChange={setWebDialogOpen}
        editing={editingWeb}
        onSaved={() => qc.invalidateQueries({ queryKey: ["monthly-website"] })}
      />
      <DigitalServiceDialog
        open={digitalDialogOpen}
        onOpenChange={setDigitalDialogOpen}
        editing={editingDigital}
        onSaved={() => qc.invalidateQueries({ queryKey: ["monthly-digital"] })}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the service and all its completion records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
