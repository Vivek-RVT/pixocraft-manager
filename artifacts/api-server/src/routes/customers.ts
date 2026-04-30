import { Router, type IRouter } from "express";
import { eq, ilike, or, desc, sum, sql } from "drizzle-orm";
import { db, customersTable, servicesTable } from "@workspace/db";
import {
  ListCustomersQueryParams,
  ListCustomersResponse,
  CreateCustomerBody,
  CreateCustomerResponse,
  GetCustomerParams,
  GetCustomerResponse,
  UpdateCustomerParams,
  UpdateCustomerBody,
  UpdateCustomerResponse,
  DeleteCustomerParams,
  DeleteCustomerResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function rowToCustomer(c: typeof customersTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    businessName: c.businessName,
    address: c.address,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/customers", async (req, res): Promise<void> => {
  const parsed = ListCustomersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search } = parsed.data;
  const rows = search
    ? await db
        .select()
        .from(customersTable)
        .where(
          or(
            ilike(customersTable.name, `%${search}%`),
            ilike(customersTable.businessName, `%${search}%`),
            ilike(customersTable.email, `%${search}%`),
            ilike(customersTable.phone, `%${search}%`),
          ),
        )
        .orderBy(desc(customersTable.createdAt))
    : await db
        .select()
        .from(customersTable)
        .orderBy(desc(customersTable.createdAt));

  res.json(ListCustomersResponse.parse(rows.map(rowToCustomer)));
});

router.post("/customers", async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(customersTable)
    .values(parsed.data)
    .returning();
  res.json(CreateCustomerResponse.parse(rowToCustomer(row)));
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [c] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, params.data.id));
  if (!c) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  const services = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.customerId, c.id))
    .orderBy(desc(servicesTable.date));

  const totalRevenue = services.reduce(
    (sum, s) => sum + Number(s.priceSold),
    0,
  );
  const totalProfit = services.reduce(
    (sum, s) => sum + (Number(s.priceSold) - Number(s.costPrice)),
    0,
  );
  const pendingAmount = services.reduce(
    (sum, s) => sum + Math.max(0, Number(s.priceSold) - Number(s.amountPaid)),
    0,
  );

  res.json(
    GetCustomerResponse.parse({
      customer: rowToCustomer(c),
      services: services.map((s) => ({
        id: s.id,
        customerId: s.customerId,
        customerName: c.name,
        serviceName: s.serviceName,
        priceSold: Number(s.priceSold),
        costPrice: Number(s.costPrice),
        profit: Number(s.priceSold) - Number(s.costPrice),
        paymentStatus: s.paymentStatus,
        amountPaid: Number(s.amountPaid),
        deliveryStatus: s.deliveryStatus,
        date: s.date,
        notes: s.notes,
      })),
      totalRevenue,
      totalProfit,
      pendingAmount,
    }),
  );
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
  const params = UpdateCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateCustomerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [row] = await db
    .update(customersTable)
    .set(body.data)
    .where(eq(customersTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(UpdateCustomerResponse.parse(rowToCustomer(row)));
});

router.delete("/customers/:id", async (req, res): Promise<void> => {
  const params = DeleteCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(customersTable).where(eq(customersTable.id, params.data.id));
  res.json(DeleteCustomerResponse.parse({ success: true }));
});

export default router;
