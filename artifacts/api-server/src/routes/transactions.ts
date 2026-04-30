import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, transactionsTable } from "@workspace/db";
import {
  ListTransactionsQueryParams,
  ListTransactionsResponse,
  CreateTransactionBody,
  CreateTransactionResponse,
  DeleteTransactionParams,
  DeleteTransactionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function rowToTx(t: typeof transactionsTable.$inferSelect) {
  return {
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    source: t.source,
    accountName: t.accountName,
    method: t.method,
    date: t.date,
    notes: t.notes,
  };
}

router.get("/transactions", async (req, res): Promise<void> => {
  const parsed = ListTransactionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rows = parsed.data.type
    ? await db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.type, parsed.data.type))
        .orderBy(desc(transactionsTable.date), desc(transactionsTable.id))
    : await db
        .select()
        .from(transactionsTable)
        .orderBy(desc(transactionsTable.date), desc(transactionsTable.id));
  res.json(ListTransactionsResponse.parse(rows.map(rowToTx)));
});

router.post("/transactions", async (req, res): Promise<void> => {
  const parsed = CreateTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(transactionsTable)
    .values({
      type: parsed.data.type,
      amount: String(parsed.data.amount),
      source: parsed.data.source,
      accountName: parsed.data.accountName,
      method: parsed.data.method,
      date: parsed.data.date.toISOString().slice(0, 10),
      notes: parsed.data.notes,
    })
    .returning();
  res.json(CreateTransactionResponse.parse(rowToTx(row)));
});

router.delete("/transactions/:id", async (req, res): Promise<void> => {
  const params = DeleteTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(transactionsTable)
    .where(eq(transactionsTable.id, params.data.id));
  res.json(DeleteTransactionResponse.parse({ success: true }));
});

export default router;
