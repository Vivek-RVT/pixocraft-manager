import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, serviceActivityLogTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const ListQuery = z.object({
  entityType: z.string(),
  entityId: z.coerce.number(),
});

router.get("/service-activity", async (req, res): Promise<void> => {
  const parsed = ListQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { entityType, entityId } = parsed.data;
  const rows = await db
    .select()
    .from(serviceActivityLogTable)
    .where(
      and(
        eq(serviceActivityLogTable.entityType, entityType),
        eq(serviceActivityLogTable.entityId, entityId),
      ),
    )
    .orderBy(desc(serviceActivityLogTable.createdAt));
  res.json(rows);
});

export default router;
