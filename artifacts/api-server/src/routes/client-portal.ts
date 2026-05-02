import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import {
  customersTable,
  servicesTable,
  serviceProjectsTable,
  digitalMarketingReportsTable,
  seoReportsTable,
  clientPortalsTable,
  monthlyWebsiteServicesTable,
  monthlyDigitalServicesTable,
  monthlyWebsiteCompletionsTable,
  monthlyDigitalCompletionsTable,
} from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";

const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? "fallback-secret-do-not-use";

interface ClientRequest extends Request {
  clientId?: number;
}

function requireClientAuth(req: ClientRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { role: string; customerId: number };
    if (payload.role !== "client") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.clientId = payload.customerId;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

router.get("/client/dashboard", requireClientAuth, async (req: ClientRequest, res): Promise<void> => {
  const customerId = req.clientId!;

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, customerId))
    .limit(1);

  if (!customer) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [portal] = await db
    .select({ isActive: clientPortalsTable.isActive })
    .from(clientPortalsTable)
    .where(eq(clientPortalsTable.customerId, customerId))
    .limit(1);

  if (!portal?.isActive) {
    res.status(403).json({ error: "Dashboard not active" });
    return;
  }

  const [services, projects, dmReports, seoReports, webServices, digitalServices] = await Promise.all([
    db.select().from(servicesTable).where(eq(servicesTable.customerId, customerId)),
    db.select().from(serviceProjectsTable).where(eq(serviceProjectsTable.customerId, customerId)),
    db.select().from(digitalMarketingReportsTable)
      .where(eq(digitalMarketingReportsTable.customerId, customerId))
      .orderBy(desc(digitalMarketingReportsTable.year), desc(digitalMarketingReportsTable.month))
      .limit(12),
    db.select().from(seoReportsTable)
      .where(eq(seoReportsTable.customerId, customerId))
      .orderBy(desc(seoReportsTable.year), desc(seoReportsTable.month))
      .limit(6),
    db.select().from(monthlyWebsiteServicesTable).where(eq(monthlyWebsiteServicesTable.customerId, customerId)),
    db.select().from(monthlyDigitalServicesTable).where(eq(monthlyDigitalServicesTable.customerId, customerId)),
  ]);

  // Fetch completions for web services
  const webServiceIds = webServices.map((ws) => ws.id);
  const webCompletions = webServiceIds.length > 0
    ? await db.select({
        id: monthlyWebsiteCompletionsTable.id,
        serviceId: monthlyWebsiteCompletionsTable.serviceId,
        year: monthlyWebsiteCompletionsTable.year,
        month: monthlyWebsiteCompletionsTable.month,
        completed: monthlyWebsiteCompletionsTable.completed,
      }).from(monthlyWebsiteCompletionsTable)
        .where(inArray(monthlyWebsiteCompletionsTable.serviceId, webServiceIds))
    : [];

  // Fetch completions for digital services
  const digitalServiceIds = digitalServices.map((ds) => ds.id);
  const digitalCompletions = digitalServiceIds.length > 0
    ? await db.select({
        id: monthlyDigitalCompletionsTable.id,
        serviceId: monthlyDigitalCompletionsTable.serviceId,
        year: monthlyDigitalCompletionsTable.year,
        month: monthlyDigitalCompletionsTable.month,
        completed: monthlyDigitalCompletionsTable.completed,
      }).from(monthlyDigitalCompletionsTable)
        .where(inArray(monthlyDigitalCompletionsTable.serviceId, digitalServiceIds))
    : [];

  const webServicesWithCompletions = webServices.map((ws) => ({
    ...ws,
    completions: webCompletions.filter((c) => c.serviceId === ws.id),
  }));

  const digitalServicesWithCompletions = digitalServices.map((ds) => ({
    ...ds,
    completions: digitalCompletions.filter((c) => c.serviceId === ds.id),
  }));

  res.json({
    customer,
    services,
    projects,
    dmReports,
    seoReports,
    webServices: webServicesWithCompletions,
    digitalServices: digitalServicesWithCompletions,
  });
});

export default router;
