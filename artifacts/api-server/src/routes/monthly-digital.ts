import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  monthlyDigitalServicesTable,
  monthlyDigitalCompletionsTable,
  customersTable,
  serviceActivityLogTable,
} from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

function rowToService(
  s: typeof monthlyDigitalServicesTable.$inferSelect,
  customerName: string,
  completions: (typeof monthlyDigitalCompletionsTable.$inferSelect)[],
) {
  return {
    id: s.id,
    customerId: s.customerId,
    customerName,
    serviceName: s.serviceName,
    platform: s.platform,
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
  serviceName: z.string(),
  platform: z.string().nullable().optional(),
  monthlyCost: z.number(),
  monthlyCharge: z.number(),
  discount: z.number().optional().default(0),
  startDate: z.string(),
  status: z.enum(["active", "paused", "cancelled"]).optional().default("active"),
  notes: z.string().nullable().optional(),
});

const UpdateBody = z.object({
  serviceName: z.string().optional(),
  platform: z.string().nullable().optional(),
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

router.get("/monthly-digital", async (req, res): Promise<void> => {
  const parsed = ListQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const conditions = [];
  if (parsed.data.customerId !== undefined)
    conditions.push(eq(monthlyDigitalServicesTable.customerId, parsed.data.customerId));
  if (parsed.data.status !== undefined)
    conditions.push(eq(monthlyDigitalServicesTable.status, parsed.data.status));

  const rows = await db
    .select({ service: monthlyDigitalServicesTable, customerName: customersTable.name })
    .from(monthlyDigitalServicesTable)
    .innerJoin(customersTable, eq(monthlyDigitalServicesTable.customerId, customersTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(monthlyDigitalServicesTable.id);

  const completionMap = new Map<number, (typeof monthlyDigitalCompletionsTable.$inferSelect)[]>();
  const allCompletions = await db.select().from(monthlyDigitalCompletionsTable);
  for (const c of allCompletions) {
    if (!completionMap.has(c.serviceId)) completionMap.set(c.serviceId, []);
    completionMap.get(c.serviceId)!.push(c);
  }

  res.json(rows.map((r) => rowToService(r.service, r.customerName, completionMap.get(r.service.id) ?? [])));
});

router.post("/monthly-digital", async (req, res): Promise<void> => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [row] = await db
    .insert(monthlyDigitalServicesTable)
    .values({
      customerId: d.customerId,
      serviceName: d.serviceName,
      platform: d.platform,
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

router.patch("/monthly-digital/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = UpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.serviceName !== undefined) updates.serviceName = d.serviceName;
  if (d.platform !== undefined) updates.platform = d.platform;
  if (d.monthlyCost !== undefined) updates.monthlyCost = String(d.monthlyCost);
  if (d.monthlyCharge !== undefined) updates.monthlyCharge = String(d.monthlyCharge);
  if (d.discount !== undefined) updates.discount = String(d.discount);
  if (d.startDate !== undefined) updates.startDate = d.startDate;
  if (d.status !== undefined) updates.status = d.status;
  if (d.notes !== undefined) updates.notes = d.notes;

  const existing = await db
    .select({ status: monthlyDigitalServicesTable.status })
    .from(monthlyDigitalServicesTable)
    .where(eq(monthlyDigitalServicesTable.id, id));
  const fromStatus = existing[0]?.status ?? null;

  const [row] = await db
    .update(monthlyDigitalServicesTable)
    .set(updates)
    .where(eq(monthlyDigitalServicesTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  const toStatus = d.status ?? fromStatus;
  if (fromStatus !== toStatus || d.notes !== undefined) {
    await db.insert(serviceActivityLogTable).values({
      entityType: "monthly_digital",
      entityId: id,
      fromStatus,
      toStatus: toStatus ?? null,
      note: d.notes ?? null,
    });
  }

  const [c] = await db.select().from(customersTable).where(eq(customersTable.id, row.customerId));
  const completions = await db.select().from(monthlyDigitalCompletionsTable).where(eq(monthlyDigitalCompletionsTable.serviceId, id));
  res.json(rowToService(row, c?.name ?? "Unknown", completions));
});

router.delete("/monthly-digital/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(monthlyDigitalServicesTable).where(eq(monthlyDigitalServicesTable.id, id));
  res.json({ success: true });
});

router.post("/monthly-digital/:id/completion", async (req, res): Promise<void> => {
  const serviceId = Number(req.params.id);
  const parsed = ToggleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { year, month, completed, paidAmount, notes } = parsed.data;

  const existing = await db
    .select()
    .from(monthlyDigitalCompletionsTable)
    .where(
      and(
        eq(monthlyDigitalCompletionsTable.serviceId, serviceId),
        eq(monthlyDigitalCompletionsTable.year, year),
        eq(monthlyDigitalCompletionsTable.month, month),
      ),
    );

  if (existing.length > 0) {
    const [updated] = await db
      .update(monthlyDigitalCompletionsTable)
      .set({ completed, paidAmount: String(paidAmount), notes, completedAt: completed ? new Date() : null })
      .where(eq(monthlyDigitalCompletionsTable.id, existing[0].id))
      .returning();
    res.json({ id: updated.id, serviceId: updated.serviceId, year: updated.year, month: updated.month, completed: updated.completed, paidAmount: Number(updated.paidAmount), notes: updated.notes, completedAt: updated.completedAt?.toISOString() ?? null });
  } else {
    const [created] = await db
      .insert(monthlyDigitalCompletionsTable)
      .values({ serviceId, year, month, completed, paidAmount: String(paidAmount), notes, completedAt: completed ? new Date() : null })
      .returning();
    res.json({ id: created.id, serviceId: created.serviceId, year: created.year, month: created.month, completed: created.completed, paidAmount: Number(created.paidAmount), notes: created.notes, completedAt: created.completedAt?.toISOString() ?? null });
  }
});

export default router;
