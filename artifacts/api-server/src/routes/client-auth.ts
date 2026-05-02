import { Router, type IRouter } from "express";
import { createHash } from "crypto";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { clientPortalsTable, customersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const CLIENT_PEPPER = "pixocraft-client-2026";
const JWT_SECRET = process.env.JWT_SECRET ?? "fallback-secret-do-not-use";

export function hashClientPassword(password: string): string {
  return createHash("sha256").update(password + CLIENT_PEPPER).digest("hex");
}

router.post("/auth/client-login", async (req, res): Promise<void> => {
  const { password } = req.body as { password?: string };
  if (!password || typeof password !== "string") {
    res.status(400).json({ error: "Password required" });
    return;
  }

  const hash = hashClientPassword(password);

  const portals = await db
    .select({
      id: clientPortalsTable.id,
      customerId: clientPortalsTable.customerId,
      passwordHash: clientPortalsTable.passwordHash,
      isActive: clientPortalsTable.isActive,
    })
    .from(clientPortalsTable)
    .where(eq(clientPortalsTable.isActive, true));

  const matched = portals.find((p) => p.passwordHash === hash);
  if (!matched) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, matched.customerId))
    .limit(1);

  const token = jwt.sign(
    { role: "client", customerId: matched.customerId },
    JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.json({ token, customer });
});

router.post("/auth/client-verify", (req, res): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ valid: false });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      role: string;
      customerId: number;
    };
    if (payload.role !== "client") {
      res.status(401).json({ valid: false });
      return;
    }
    res.json({ valid: true, customerId: payload.customerId });
  } catch {
    res.status(401).json({ valid: false });
  }
});

export default router;
