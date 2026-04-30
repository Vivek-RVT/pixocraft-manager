import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, expensesTable } from "@workspace/db";
import {
  ListExpensesQueryParams,
  ListExpensesResponse,
  CreateExpenseBody,
  CreateExpenseResponse,
  UpdateExpenseParams,
  UpdateExpenseBody,
  UpdateExpenseResponse,
  DeleteExpenseParams,
  DeleteExpenseResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function rowToExpense(e: typeof expensesTable.$inferSelect) {
  return {
    id: e.id,
    category: e.category,
    amount: Number(e.amount),
    date: e.date,
    notes: e.notes,
  };
}

router.get("/expenses", async (req, res): Promise<void> => {
  const parsed = ListExpensesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rows = parsed.data.category
    ? await db
        .select()
        .from(expensesTable)
        .where(eq(expensesTable.category, parsed.data.category))
        .orderBy(desc(expensesTable.date), desc(expensesTable.id))
    : await db
        .select()
        .from(expensesTable)
        .orderBy(desc(expensesTable.date), desc(expensesTable.id));
  res.json(ListExpensesResponse.parse(rows.map(rowToExpense)));
});

router.post("/expenses", async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(expensesTable)
    .values({
      category: parsed.data.category,
      amount: String(parsed.data.amount),
      date: parsed.data.date.toISOString().slice(0, 10),
      notes: parsed.data.notes,
    })
    .returning();
  res.json(CreateExpenseResponse.parse(rowToExpense(row)));
});

router.patch("/expenses/:id", async (req, res): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateExpenseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (body.data.category !== undefined) updates.category = body.data.category;
  if (body.data.amount !== undefined) updates.amount = String(body.data.amount);
  if (body.data.date !== undefined)
    updates.date = body.data.date.toISOString().slice(0, 10);
  if (body.data.notes !== undefined) updates.notes = body.data.notes;
  const [row] = await db
    .update(expensesTable)
    .set(updates)
    .where(eq(expensesTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  res.json(UpdateExpenseResponse.parse(rowToExpense(row)));
});

router.delete("/expenses/:id", async (req, res): Promise<void> => {
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(expensesTable).where(eq(expensesTable.id, params.data.id));
  res.json(DeleteExpenseResponse.parse({ success: true }));
});

export default router;
