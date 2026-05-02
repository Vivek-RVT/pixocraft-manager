import { Router, type IRouter } from "express";
import { desc, sql, eq } from "drizzle-orm";
import {
  db,
  customersTable,
  servicesTable,
  expensesTable,
  transactionsTable,
  monthlyWebsiteServicesTable,
  monthlyWebsiteCompletionsTable,
  monthlyDigitalServicesTable,
  monthlyDigitalCompletionsTable,
} from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetRevenueTrendResponse,
  GetTopServicesResponse,
  GetTopCustomersResponse,
  GetRecentActivityResponse,
  GetExpenseBreakdownResponse,
  GetNotificationsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [customers, services, expenses, webCompletions, digitalCompletions, webServices, digitalServices] = await Promise.all([
    db.select().from(customersTable),
    db.select().from(servicesTable),
    db.select().from(expensesTable),
    db.select().from(monthlyWebsiteCompletionsTable).where(eq(monthlyWebsiteCompletionsTable.completed, true)),
    db.select().from(monthlyDigitalCompletionsTable).where(eq(monthlyDigitalCompletionsTable.completed, true)),
    db.select().from(monthlyWebsiteServicesTable),
    db.select().from(monthlyDigitalServicesTable),
  ]);

  const webCostMap = new Map(webServices.map((s) => [s.id, Number(s.monthlyCost)]));
  const digitalCostMap = new Map(digitalServices.map((s) => [s.id, Number(s.monthlyCost)]));
  const allMonthly = [
    ...webCompletions.map((c) => ({ year: c.year, month: c.month, paid: Number(c.paidAmount), cost: webCostMap.get(c.serviceId) ?? 0 })),
    ...digitalCompletions.map((c) => ({ year: c.year, month: c.month, paid: Number(c.paidAmount), cost: digitalCostMap.get(c.serviceId) ?? 0 })),
  ];

  const totalRevenue = services.reduce((acc, s) => acc + Number(s.priceSold), 0)
    + allMonthly.reduce((acc, c) => acc + c.paid, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const netProfit =
    services.reduce((acc, s) => acc + (Number(s.priceSold) - Number(s.costPrice)), 0)
    + allMonthly.reduce((acc, c) => acc + (c.paid - c.cost), 0)
    - totalExpenses;
  const pendingPayments = services.reduce(
    (acc, s) => acc + Math.max(0, Number(s.priceSold) - Number(s.amountPaid)),
    0,
  );

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonthNum = now.getMonth() + 1;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonthNum = prevDate.getMonth() + 1;

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const isInMonth = (dateStr: string, monthStart: Date) => {
    const d = new Date(dateStr);
    return (
      d.getFullYear() === monthStart.getFullYear() &&
      d.getMonth() === monthStart.getMonth()
    );
  };

  const monthlyThisMonth = allMonthly.filter((c) => c.year === thisYear && c.month === thisMonthNum);
  const monthlyPrevMonth = allMonthly.filter((c) => c.year === prevYear && c.month === prevMonthNum);

  const thisMonthRevenue = services
    .filter((s) => isInMonth(s.date, startOfMonth))
    .reduce((acc, s) => acc + Number(s.priceSold), 0)
    + monthlyThisMonth.reduce((acc, c) => acc + c.paid, 0);
  const lastMonthRevenue = services
    .filter((s) => isInMonth(s.date, startOfPrevMonth))
    .reduce((acc, s) => acc + Number(s.priceSold), 0)
    + monthlyPrevMonth.reduce((acc, c) => acc + c.paid, 0);
  const thisMonthExpenses = expenses
    .filter((e) => isInMonth(e.date, startOfMonth))
    .reduce((acc, e) => acc + Number(e.amount), 0);
  const thisMonthProfit =
    services
      .filter((s) => isInMonth(s.date, startOfMonth))
      .reduce((acc, s) => acc + (Number(s.priceSold) - Number(s.costPrice)), 0)
    + monthlyThisMonth.reduce((acc, c) => acc + (c.paid - c.cost), 0)
    - thisMonthExpenses;

  const revenueGrowthPercent =
    lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : thisMonthRevenue > 0
        ? 100
        : 0;

  res.json(
    GetDashboardSummaryResponse.parse({
      totalCustomers: customers.length,
      totalRevenue,
      totalExpenses,
      netProfit,
      pendingPayments,
      thisMonthRevenue,
      thisMonthExpenses,
      thisMonthProfit,
      revenueGrowthPercent,
      servicesCount: services.length,
    }),
  );
});

router.get("/dashboard/revenue-trend", async (_req, res): Promise<void> => {
  const [services, expenses, webCompletions, digitalCompletions, webServices, digitalServices] = await Promise.all([
    db.select().from(servicesTable),
    db.select().from(expensesTable),
    db.select().from(monthlyWebsiteCompletionsTable).where(eq(monthlyWebsiteCompletionsTable.completed, true)),
    db.select().from(monthlyDigitalCompletionsTable).where(eq(monthlyDigitalCompletionsTable.completed, true)),
    db.select().from(monthlyWebsiteServicesTable),
    db.select().from(monthlyDigitalServicesTable),
  ]);

  const webCostMap = new Map(webServices.map((s) => [s.id, Number(s.monthlyCost)]));
  const digitalCostMap = new Map(digitalServices.map((s) => [s.id, Number(s.monthlyCost)]));
  const allMonthly = [
    ...webCompletions.map((c) => ({ year: c.year, month: c.month, paid: Number(c.paidAmount), cost: webCostMap.get(c.serviceId) ?? 0 })),
    ...digitalCompletions.map((c) => ({ year: c.year, month: c.month, paid: Number(c.paidAmount), cost: digitalCostMap.get(c.serviceId) ?? 0 })),
  ];

  const now = new Date();
  const months: { key: string; label: string; year: number; month: number }[] =
    [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    months.push({ key, label, year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const series = months.map((m) => {
    const rev = services
      .filter((s) => {
        const d = new Date(s.date);
        return d.getFullYear() === m.year && d.getMonth() + 1 === m.month;
      })
      .reduce((acc, s) => acc + Number(s.priceSold), 0);
    const cogs = services
      .filter((s) => {
        const d = new Date(s.date);
        return d.getFullYear() === m.year && d.getMonth() + 1 === m.month;
      })
      .reduce((acc, s) => acc + Number(s.costPrice), 0);
    const exp = expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === m.year && d.getMonth() + 1 === m.month;
      })
      .reduce((acc, e) => acc + Number(e.amount), 0);
    const monthlyRev = allMonthly
      .filter((c) => c.year === m.year && c.month === m.month)
      .reduce((acc, c) => acc + c.paid, 0);
    const monthlyCogs = allMonthly
      .filter((c) => c.year === m.year && c.month === m.month)
      .reduce((acc, c) => acc + c.cost, 0);
    const profit = (rev + monthlyRev) - (cogs + monthlyCogs) - exp;
    return {
      month: m.label,
      revenue: rev + monthlyRev,
      expenses: exp,
      profit,
    };
  });

  res.json(GetRevenueTrendResponse.parse(series));
});

router.get("/dashboard/top-services", async (_req, res): Promise<void> => {
  const services = await db.select().from(servicesTable);
  const map = new Map<
    string,
    { totalRevenue: number; totalProfit: number; count: number }
  >();
  for (const s of services) {
    const k = s.serviceName;
    const cur = map.get(k) ?? { totalRevenue: 0, totalProfit: 0, count: 0 };
    cur.totalRevenue += Number(s.priceSold);
    cur.totalProfit += Number(s.priceSold) - Number(s.costPrice);
    cur.count += 1;
    map.set(k, cur);
  }
  const items = Array.from(map.entries())
    .map(([serviceName, v]) => ({ serviceName, ...v }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);
  res.json(GetTopServicesResponse.parse(items));
});

router.get("/dashboard/top-customers", async (_req, res): Promise<void> => {
  const customers = await db.select().from(customersTable);
  const services = await db.select().from(servicesTable);
  const items = customers
    .map((c) => {
      const cs = services.filter((s) => s.customerId === c.id);
      const totalRevenue = cs.reduce((acc, s) => acc + Number(s.priceSold), 0);
      const totalProfit = cs.reduce(
        (acc, s) => acc + (Number(s.priceSold) - Number(s.costPrice)),
        0,
      );
      return {
        customerId: c.id,
        customerName: c.name,
        totalRevenue,
        totalProfit,
        servicesCount: cs.length,
      };
    })
    .filter((x) => x.servicesCount > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);
  res.json(GetTopCustomersResponse.parse(items));
});

router.get("/dashboard/recent-activity", async (_req, res): Promise<void> => {
  const services = await db
    .select({
      service: servicesTable,
      customerName: customersTable.name,
    })
    .from(servicesTable)
    .innerJoin(customersTable, sql`${servicesTable.customerId} = ${customersTable.id}`)
    .orderBy(desc(servicesTable.createdAt))
    .limit(10);
  const expenses = await db
    .select()
    .from(expensesTable)
    .orderBy(desc(expensesTable.createdAt))
    .limit(10);
  const txs = await db
    .select()
    .from(transactionsTable)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(10);

  const items = [
    ...services.map((r) => ({
      id: `service-${r.service.id}`,
      kind: "service" as const,
      title: r.service.serviceName,
      subtitle: `Sold to ${r.customerName}`,
      amount: Number(r.service.priceSold),
      date: r.service.createdAt.toISOString(),
    })),
    ...expenses.map((e) => ({
      id: `expense-${e.id}`,
      kind: "expense" as const,
      title: `${e.category.charAt(0).toUpperCase() + e.category.slice(1)} expense`,
      subtitle: e.notes ?? "Business expense",
      amount: Number(e.amount),
      date: e.createdAt.toISOString(),
    })),
    ...txs.map((t) => ({
      id: `transaction-${t.id}`,
      kind: "transaction" as const,
      title: `${t.type === "credit" ? "Credit" : "Debit"} - ${t.source}`,
      subtitle: `${t.accountName} via ${t.method.toUpperCase()}`,
      amount: Number(t.amount),
      date: t.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 12);

  res.json(GetRecentActivityResponse.parse(items));
});

router.get("/dashboard/expense-breakdown", async (_req, res): Promise<void> => {
  const expenses = await db.select().from(expensesTable);
  const map = new Map<string, { total: number; count: number }>();
  for (const e of expenses) {
    const cur = map.get(e.category) ?? { total: 0, count: 0 };
    cur.total += Number(e.amount);
    cur.count += 1;
    map.set(e.category, cur);
  }
  const items = Array.from(map.entries())
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total);
  res.json(GetExpenseBreakdownResponse.parse(items));
});

router.get("/dashboard/service-type-breakdown", async (_req, res): Promise<void> => {
  const services = await db.select().from(servicesTable);
  const types = ["web", "digital", "other"] as const;
  const result = types.map((type) => {
    const filtered = services.filter((s) => (s.serviceType ?? "other") === type);
    const revenue = filtered.reduce((acc, s) => acc + Number(s.priceSold), 0);
    const cost = filtered.reduce((acc, s) => acc + Number(s.costPrice), 0);
    return {
      serviceType: type,
      label: type === "web" ? "Pixocraft Web" : type === "digital" ? "Pixocraft Digital" : "Other",
      revenue,
      cost,
      profit: revenue - cost,
      count: filtered.length,
    };
  });
  res.json(result);
});

router.get("/dashboard/notifications", async (_req, res): Promise<void> => {
  const services = await db
    .select({
      service: servicesTable,
      customerName: customersTable.name,
    })
    .from(servicesTable)
    .innerJoin(customersTable, sql`${servicesTable.customerId} = ${customersTable.id}`);
  const expenses = await db.select().from(expensesTable);

  const notifications: Array<{
    id: string;
    kind: "pending_payment" | "big_expense" | "low_profit";
    title: string;
    message: string;
    severity: "info" | "warning" | "danger";
    createdAt: string;
  }> = [];

  for (const r of services) {
    const due = Number(r.service.priceSold) - Number(r.service.amountPaid);
    if (
      r.service.paymentStatus !== "paid" &&
      due > 0
    ) {
      notifications.push({
        id: `pending-${r.service.id}`,
        kind: "pending_payment",
        title: "Pending payment",
        message: `${r.customerName} owes ₹${due.toLocaleString("en-IN")} for ${r.service.serviceName}`,
        severity: "warning",
        createdAt: r.service.createdAt.toISOString(),
      });
    }
  }

  const bigThreshold = 10000;
  for (const e of expenses) {
    if (Number(e.amount) >= bigThreshold) {
      notifications.push({
        id: `big-expense-${e.id}`,
        kind: "big_expense",
        title: "Large expense logged",
        message: `${e.category} expense of ₹${Number(e.amount).toLocaleString("en-IN")} on ${e.date}`,
        severity: "info",
        createdAt: e.createdAt.toISOString(),
      });
    }
  }

  // Low profit alert: services where profit margin < 15%
  for (const r of services) {
    const price = Number(r.service.priceSold);
    const cost = Number(r.service.costPrice);
    if (price > 0) {
      const margin = ((price - cost) / price) * 100;
      if (margin < 15) {
        notifications.push({
          id: `low-profit-${r.service.id}`,
          kind: "low_profit",
          title: "Low profit margin",
          message: `${r.service.serviceName} for ${r.customerName} has a ${margin.toFixed(1)}% margin`,
          severity: "danger",
          createdAt: r.service.createdAt.toISOString(),
        });
      }
    }
  }

  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  res.json(GetNotificationsResponse.parse(notifications.slice(0, 20)));
});

export default router;
