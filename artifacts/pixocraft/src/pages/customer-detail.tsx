import { useState } from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  useGetCustomer,
  getGetCustomerQueryKey,
  useListServices,
  getListServicesQueryKey,
} from "@workspace/api-client-react";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Plus,
  Briefcase,
  Globe,
  Megaphone,
  CheckCircle2,
  Circle,
  CalendarDays,
} from "lucide-react";
import { motion } from "framer-motion";
import { getYear, getMonth } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerFormDialog } from "@/components/customer-form-dialog";
import { ServiceFormDialog } from "@/components/service-form-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const BASE_PATH = import.meta.env.BASE_URL ?? "/";

async function apiFetch(path: string) {
  const base = BASE_PATH.endsWith("/") ? BASE_PATH.slice(0, -1) : BASE_PATH;
  const res = await fetch(`${base}/api${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const currentYear = getYear(new Date());
const currentMonth = getMonth(new Date()) + 1;

type MonthlyCompletion = {
  id: number;
  serviceId: number;
  year: number;
  month: number;
  completed: boolean;
  paidAmount: number;
};

type MonthlyWebService = {
  id: number;
  websiteName: string;
  monthlyCost: number;
  monthlyCharge: number;
  discount: number;
  startDate: string;
  status: string;
  completions: MonthlyCompletion[];
};

type MonthlyDigitalService = {
  id: number;
  serviceName: string;
  platform: string | null;
  monthlyCost: number;
  monthlyCharge: number;
  discount: number;
  startDate: string;
  status: string;
  completions: MonthlyCompletion[];
};

function MiniMonthGrid({ completions }: { completions: MonthlyCompletion[] }) {
  const map = new Map<number, boolean>();
  for (const c of completions) {
    if (c.year === currentYear) map.set(c.month, c.completed);
  }
  return (
    <div className="grid grid-cols-12 gap-0.5 mt-2">
      {MONTHS.map((m, i) => {
        const monthNum = i + 1;
        const done = map.get(monthNum) ?? false;
        const isFuture = monthNum > currentMonth;
        return (
          <div
            key={m}
            title={`${m}: ${done ? "Done" : isFuture ? "Future" : "Pending"}`}
            className={cn(
              "flex flex-col items-center rounded py-1 text-[9px] font-medium gap-0.5",
              isFuture ? "opacity-25" : done ? "text-emerald-700" : "text-muted-foreground",
            )}
          >
            <span>{m}</span>
            {done ? (
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
            ) : (
              <Circle className="w-2.5 h-2.5 text-muted-foreground/40" />
            )}
          </div>
        );
      })}
    </div>
  );
}

const paymentBadge = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "partial":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    default:
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
  }
};

export default function CustomerDetail() {
  const [, params] = useRoute("/customers/:id");
  const id = Number(params?.id);

  const [editOpen, setEditOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);

  const { data: detail, isLoading } = useGetCustomer(id, {
    query: { queryKey: getGetCustomerQueryKey(id), enabled: Number.isFinite(id) },
  });
  const customer = detail?.customer;

  const { data: services } = useListServices(
    { customerId: id },
    {
      query: {
        queryKey: getListServicesQueryKey({ customerId: id }),
        enabled: Number.isFinite(id),
      },
    },
  );

  const { data: webServices = [] } = useQuery<MonthlyWebService[]>({
    queryKey: ["monthly-website", id],
    queryFn: () => apiFetch(`/monthly-website?customerId=${id}`),
    enabled: Number.isFinite(id),
  });

  const { data: digitalServices = [] } = useQuery<MonthlyDigitalService[]>({
    queryKey: ["monthly-digital", id],
    queryFn: () => apiFetch(`/monthly-digital?customerId=${id}`),
    enabled: Number.isFinite(id),
  });

  const totals = (services ?? []).reduce(
    (acc, s) => {
      acc.revenue += Number(s.priceSold);
      acc.profit += Number(s.profit ?? 0);
      acc.paid += Number(s.amountPaid ?? 0);
      acc.pending += Number(s.priceSold) - Number(s.amountPaid ?? 0);
      return acc;
    },
    { revenue: 0, profit: 0, paid: 0, pending: 0 },
  );

  const webMRR = webServices
    .filter((s) => s.status === "active")
    .reduce((acc, s) => acc + s.monthlyCharge, 0);
  const digitalMRR = digitalServices
    .filter((s) => s.status === "active")
    .reduce((acc, s) => acc + s.monthlyCharge, 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Customer not found.</p>
        <Link href="/customers">
          <Button variant="ghost" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to customers
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/customers">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground flex items-center justify-center text-xl font-semibold shadow-md shadow-primary/20">
                {customer.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="text-xl font-semibold">{customer.name}</div>
                {customer.businessName && (
                  <div className="text-sm text-muted-foreground">
                    {customer.businessName}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Revenue</div>
                <div className="font-semibold tabular-nums">
                  {formatCurrency(totals.revenue)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Profit</div>
                <div className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totals.profit)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Paid</div>
                <div className="font-semibold tabular-nums">
                  {formatCurrency(totals.paid)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Pending</div>
                <div className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                  {formatCurrency(totals.pending)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm pt-6 border-t mt-6">
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{customer.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="w-4 h-4" />
              <span>
                First contact:{" "}
                <span className="text-foreground font-medium">
                  {customer.contactedAt
                    ? formatDate(customer.contactedAt)
                    : formatDate(customer.createdAt)}
                </span>
              </span>
            </div>
          </div>
          {customer.notes && (
            <div className="mt-4 text-sm text-muted-foreground italic">
              "{customer.notes}"
            </div>
          )}
        </CardContent>
      </Card>

      {(webServices.length > 0 || digitalServices.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Monthly services
            </CardTitle>
            <CardDescription>
              Recurring website and digital marketing subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(webMRR > 0 || digitalMRR > 0) && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {webMRR > 0 && (
                  <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                      <Globe className="w-3.5 h-3.5" /> Website MRR
                    </div>
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                      {formatCurrency(webMRR)}
                    </div>
                  </div>
                )}
                {digitalMRR > 0 && (
                  <div className="rounded-lg border bg-purple-50 dark:bg-purple-950/20 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-medium">
                      <Megaphone className="w-3.5 h-3.5" /> Digital MRR
                    </div>
                    <div className="text-lg font-bold text-purple-700 dark:text-purple-300 mt-0.5">
                      {formatCurrency(digitalMRR)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {webServices.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                  <Globe className="w-3.5 h-3.5" /> Website services
                </div>
                <div className="space-y-3">
                  {webServices.map((ws) => (
                    <div
                      key={ws.id}
                      className="border rounded-lg p-3 bg-muted/20"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm">{ws.websiteName}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs capitalize",
                            ws.status === "active" && "border-emerald-400 text-emerald-600",
                            ws.status === "paused" && "border-amber-400 text-amber-600",
                            ws.status === "cancelled" && "border-red-400 text-red-500",
                          )}
                        >
                          {ws.status}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                        <span>Charge: {formatCurrency(ws.monthlyCharge)}/mo</span>
                        <span>Cost: {formatCurrency(ws.monthlyCost)}/mo</span>
                        {ws.discount > 0 && <span>Discount: {formatCurrency(ws.discount)}</span>}
                        <span>Since: {formatDate(ws.startDate)}</span>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        {currentYear} completion
                      </div>
                      <MiniMonthGrid completions={ws.completions} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {digitalServices.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2">
                  <Megaphone className="w-3.5 h-3.5" /> Digital marketing services
                </div>
                <div className="space-y-3">
                  {digitalServices.map((ds) => (
                    <div
                      key={ds.id}
                      className="border rounded-lg p-3 bg-muted/20"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm">{ds.serviceName}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs capitalize",
                            ds.status === "active" && "border-emerald-400 text-emerald-600",
                            ds.status === "paused" && "border-amber-400 text-amber-600",
                            ds.status === "cancelled" && "border-red-400 text-red-500",
                          )}
                        >
                          {ds.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-2">
                        {ds.platform && <span>Platform: {ds.platform}</span>}
                        <span>Charge: {formatCurrency(ds.monthlyCharge)}/mo</span>
                        <span>Cost: {formatCurrency(ds.monthlyCost)}/mo</span>
                        {ds.discount > 0 && <span>Discount: {formatCurrency(ds.discount)}</span>}
                        <span>Since: {formatDate(ds.startDate)}</span>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        {currentYear} completion
                      </div>
                      <MiniMonthGrid completions={ds.completions} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t">
              <Link href="/monthly-services">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  Manage monthly services →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4 shrink-0" /> Service history
            </CardTitle>
            <CardDescription>
              {services?.length ?? 0} service
              {services?.length === 1 ? "" : "s"} delivered
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setServiceOpen(true)} className="shrink-0">
            <Plus className="sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add service</span>
          </Button>
        </CardHeader>
        <CardContent>
          {!services || services.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No services yet for this customer.
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover-elevate"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{s.serviceName}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(s.date)} · Profit{" "}
                      {formatCurrency(Number(s.profit ?? 0))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={paymentBadge(s.paymentStatus)}
                    >
                      {s.paymentStatus}
                    </Badge>
                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums">
                        {formatCurrency(Number(s.priceSold))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Paid {formatCurrency(Number(s.amountPaid ?? 0))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customerId={customer.id}
      />
      <ServiceFormDialog
        open={serviceOpen}
        onOpenChange={setServiceOpen}
        presetCustomerId={customer.id}
      />
    </div>
  );
}
