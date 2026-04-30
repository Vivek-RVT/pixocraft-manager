import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, servicesTable, customersTable } from "@workspace/db";
import {
  ListServicesQueryParams,
  ListServicesResponse,
  CreateServiceBody,
  CreateServiceResponse,
  UpdateServiceParams,
  UpdateServiceBody,
  UpdateServiceResponse,
  DeleteServiceParams,
  DeleteServiceResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function rowToService(
  s: typeof servicesTable.$inferSelect,
  customerName: string,
) {
  const priceSold = Number(s.priceSold);
  const costPrice = Number(s.costPrice);
  return {
    id: s.id,
    customerId: s.customerId,
    customerName,
    serviceName: s.serviceName,
    priceSold,
    costPrice,
    profit: priceSold - costPrice,
    paymentStatus: s.paymentStatus,
    amountPaid: Number(s.amountPaid),
    deliveryStatus: s.deliveryStatus,
    date: s.date,
    notes: s.notes,
  };
}

router.get("/services", async (req, res): Promise<void> => {
  const parsed = ListServicesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { customerId, paymentStatus } = parsed.data;
  const conditions = [];
  if (customerId !== undefined)
    conditions.push(eq(servicesTable.customerId, customerId));
  if (paymentStatus !== undefined)
    conditions.push(eq(servicesTable.paymentStatus, paymentStatus));

  const rows = await db
    .select({
      service: servicesTable,
      customerName: customersTable.name,
    })
    .from(servicesTable)
    .innerJoin(customersTable, eq(servicesTable.customerId, customersTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(servicesTable.date), desc(servicesTable.id));

  res.json(
    ListServicesResponse.parse(
      rows.map((r) => rowToService(r.service, r.customerName)),
    ),
  );
});

router.post("/services", async (req, res): Promise<void> => {
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [row] = await db
    .insert(servicesTable)
    .values({
      customerId: data.customerId,
      serviceName: data.serviceName,
      priceSold: String(data.priceSold),
      costPrice: String(data.costPrice),
      amountPaid: String(data.amountPaid),
      paymentStatus: data.paymentStatus,
      deliveryStatus: data.deliveryStatus,
      date: data.date.toISOString().slice(0, 10),
      notes: data.notes,
    })
    .returning();
  const [c] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, row.customerId));
  res.json(
    CreateServiceResponse.parse(rowToService(row, c?.name ?? "Unknown")),
  );
});

router.patch("/services/:id", async (req, res): Promise<void> => {
  const params = UpdateServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateServiceBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (body.data.serviceName !== undefined)
    updates.serviceName = body.data.serviceName;
  if (body.data.priceSold !== undefined)
    updates.priceSold = String(body.data.priceSold);
  if (body.data.costPrice !== undefined)
    updates.costPrice = String(body.data.costPrice);
  if (body.data.amountPaid !== undefined)
    updates.amountPaid = String(body.data.amountPaid);
  if (body.data.paymentStatus !== undefined)
    updates.paymentStatus = body.data.paymentStatus;
  if (body.data.deliveryStatus !== undefined)
    updates.deliveryStatus = body.data.deliveryStatus;
  if (body.data.date !== undefined)
    updates.date = body.data.date.toISOString().slice(0, 10);
  if (body.data.notes !== undefined) updates.notes = body.data.notes;

  const [row] = await db
    .update(servicesTable)
    .set(updates)
    .where(eq(servicesTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  const [c] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, row.customerId));
  res.json(
    UpdateServiceResponse.parse(rowToService(row, c?.name ?? "Unknown")),
  );
});

router.delete("/services/:id", async (req, res): Promise<void> => {
  const params = DeleteServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(servicesTable).where(eq(servicesTable.id, params.data.id));
  res.json(DeleteServiceResponse.parse({ success: true }));
});

export default router;
