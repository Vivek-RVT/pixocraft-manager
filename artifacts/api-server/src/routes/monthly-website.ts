import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  monthlyWebsiteServicesTable,
  monthlyWebsiteCompletionsTable,
  customersTable,
} from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

function rowToService(
  s: typeof monthlyWebsiteServicesTable.$inferSelect,
  customerName: string,
  completions: (typeof monthlyWebsiteCompletionsTable.$inferSelect)[],
) {
  return {
    id: s.id,
    customerId: s.customerId,
    customerName,
    websiteName: s.websiteName,
    monthlyCost: Number(s.monthlyCost),
    monthlyCharge: Number(s.monthlyCharge),
    discount: Number(s.discount),
    startDate: s.startDate,
    status: s.status as "active" | "paused" | "cancelled",
    notes: s.notes,
    completions: completions.map((c) => ({
      id: c.id,
      serviceId: c.serviceId,
      year: c.year,
      month: c.month,
      completed: c.completed,
      paidAmount: Number(c.paidAmount),
      notes: c.notes,
      completedAt: c.completedAt?.toISOString() ?? null,
    })),
  };
}

const ListQuery = z.object({
  customerId: z.coerce.number().optional(),
  status: z.string().optional(),
});

const CreateBody = z.object({
  customerId: z.number(),
  websiteName: z.string(),
  monthlyCost: z.number(),
  monthlyCharge: z.number(),
  discount: z.number().optional().default(0),
  startDate: z.string(),
  status: z.enum(["active", "paused", "cancelled"]).optional().default("active"),
  notes: z.string().nullable().optional(),
});

const UpdateBody = z.object({
  websiteName: z.string().optional(),
  monthlyCost: z.number().optional(),
  monthlyCharge: z.number().optional(),
  discount: z.number().optional(),
  startDate: z.string().optional(),
  status: z.enum(["active", "paused", "cancelled"]).optional(),
  notes: z.string().nullable().optional(),
});

const ToggleBody = z.object({
  year: z.number(),
  month: z.number(),
  completed: z.boolean(),
  paidAmount: z.number().optional().default(0),
  notes: z.string().nullable().optional(),
});

router.get("/monthly-website", async (req, res): Promise<void> => {
  const parsed = ListQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const conditions = [];
  if (parsed.data.customerId !== undefined)
    conditions.push(eq(monthlyWebsiteServicesTable.customerId, parsed.data.customerId));
  if (parsed.data.status !== undefined)
    conditions.push(eq(monthlyWebsiteServicesTable.status, parsed.data.status));

  const rows = await db
    .select({ service: monthlyWebsiteServicesTable, customerName: customersTable.name })
    .from(monthlyWebsiteServicesTable)
    .innerJoin(customersTable, eq(monthlyWebsiteServicesTable.customerId, customersTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(monthlyWebsiteServicesTable.id);

  const completionsAll = await db
    .select()
    .from(monthlyWebsiteCompletionsTable)
    .where(
      conditions.length
        ? eq(monthlyWebsiteCompletionsTable.serviceId, rows[0]?.service.id ?? -1)
        : undefined,
    );

  const completionMap = new Map<number, (typeof monthlyWebsiteCompletionsTable.$inferSelect)[]>();
  const allCompletions = await db.select().from(monthlyWebsiteCompletionsTable);
  for (const c of allCompletions) {
    if (!completionMap.has(c.serviceId)) completionMap.set(c.serviceId, []);
    completionMap.get(c.serviceId)!.push(c);
  }

  res.json(rows.map((r) => rowToService(r.service, r.customerName, completionMap.get(r.service.id) ?? [])));
});

router.post("/monthly-website", async (req, res): Promise<void> => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [row] = await db
    .insert(monthlyWebsiteServicesTable)
    .values({
      customerId: d.customerId,
      websiteName: d.websiteName,
      monthlyCost: String(d.monthlyCost),
      monthlyCharge: String(d.monthlyCharge),
      discount: String(d.discount),
      startDate: d.startDate,
      status: d.status,
      notes: d.notes,
    })
    .returning();
  const [c] = await db.select().from(customersTable).where(eq(customersTable.id, row.customerId));
  res.json(rowToService(row, c?.name ?? "Unknown", []));
});

router.patch("/monthly-website/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = UpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.websiteName !== undefined) updates.websiteName = d.websiteName;
  if (d.monthlyCost !== undefined) updates.monthlyCost = String(d.monthlyCost);
  if (d.monthlyCharge !== undefined) updates.monthlyCharge = String(d.monthlyCharge);
  if (d.discount !== undefined) updates.discount = String(d.discount);
  if (d.startDate !== undefined) updates.startDate = d.startDate;
  if (d.status !== undefined) updates.status = d.status;
  if (d.notes !== undefined) updates.notes = d.notes;

  const [row] = await db
    .update(monthlyWebsiteServicesTable)
    .set(updates)
    .where(eq(monthlyWebsiteServicesTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const [c] = await db.select().from(customersTable).where(eq(customersTable.id, row.customerId));
  const completions = await db.select().from(monthlyWebsiteCompletionsTable).where(eq(monthlyWebsiteCompletionsTable.serviceId, id));
  res.json(rowToService(row, c?.name ?? "Unknown", completions));
});

router.delete("/monthly-website/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(monthlyWebsiteServicesTable).where(eq(monthlyWebsiteServicesTable.id, id));
  res.json({ success: true });
});

router.post("/monthly-website/:id/completion", async (req, res): Promise<void> => {
  const serviceId = Number(req.params.id);
  const parsed = ToggleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { year, month, completed, paidAmount, notes } = parsed.data;

  const existing = await db
    .select()
    .from(monthlyWebsiteCompletionsTable)
    .where(
      and(
        eq(monthlyWebsiteCompletionsTable.serviceId, serviceId),
        eq(monthlyWebsiteCompletionsTable.year, year),
        eq(monthlyWebsiteCompletionsTable.month, month),
      ),
    );

  if (existing.length > 0) {
    const [updated] = await db
      .update(monthlyWebsiteCompletionsTable)
      .set({ completed, paidAmount: String(paidAmount), notes, completedAt: completed ? new Date() : null })
      .where(eq(monthlyWebsiteCompletionsTable.id, existing[0].id))
      .returning();
    res.json({ id: updated.id, serviceId: updated.serviceId, year: updated.year, month: updated.month, completed: updated.completed, paidAmount: Number(updated.paidAmount), notes: updated.notes, completedAt: updated.completedAt?.toISOString() ?? null });
  } else {
    const [created] = await db
      .insert(monthlyWebsiteCompletionsTable)
      .values({ serviceId, year, month, completed, paidAmount: String(paidAmount), notes, completedAt: completed ? new Date() : null })
      .returning();
    res.json({ id: created.id, serviceId: created.serviceId, year: created.year, month: created.month, completed: created.completed, paidAmount: Number(created.paidAmount), notes: created.notes, completedAt: created.completedAt?.toISOString() ?? null });
  }
});

export default router;
