import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  clientPortalsTable,
  serviceProjectsTable,
  digitalMarketingReportsTable,
  seoReportsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { hashClientPassword } from "./client-auth";

const router: IRouter = Router();

// ─── Client Portal ─────────────────────────────────────────────────────────

router.get("/admin/portal/:customerId", async (req, res): Promise<void> => {
  const customerId = Number(req.params.customerId);
  const [portal] = await db
    .select()
    .from(clientPortalsTable)
    .where(eq(clientPortalsTable.customerId, customerId))
    .limit(1);
  res.json(portal ?? null);
});

router.post("/admin/portal/:customerId", async (req, res): Promise<void> => {
  const customerId = Number(req.params.customerId);
  const { password } = req.body as { password?: string };
  if (!password) {
    res.status(400).json({ error: "Password required" });
    return;
  }
  const passwordHash = hashClientPassword(password);

  const existing = await db
    .select()
    .from(clientPortalsTable)
    .where(eq(clientPortalsTable.customerId, customerId))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(clientPortalsTable)
      .set({ passwordHash, isActive: true, updatedAt: new Date() })
      .where(eq(clientPortalsTable.customerId, customerId))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db
      .insert(clientPortalsTable)
      .values({ customerId, passwordHash, isActive: true })
      .returning();
    res.json(created);
  }
});

router.put("/admin/portal/:customerId", async (req, res): Promise<void> => {
  const customerId = Number(req.params.customerId);
  const { password, isActive } = req.body as { password?: string; isActive?: boolean };

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (password) updates.passwordHash = hashClientPassword(password);
  if (typeof isActive === "boolean") updates.isActive = isActive;

  const [updated] = await db
    .update(clientPortalsTable)
    .set(updates)
    .where(eq(clientPortalsTable.customerId, customerId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Portal not found" });
    return;
  }
  res.json(updated);
});

// ─── Service Projects ──────────────────────────────────────────────────────

router.get("/admin/projects/:customerId", async (req, res): Promise<void> => {
  const customerId = Number(req.params.customerId);
  const projects = await db
    .select()
    .from(serviceProjectsTable)
    .where(eq(serviceProjectsTable.customerId, customerId));
  res.json(projects);
});

router.post("/admin/projects/:customerId", async (req, res): Promise<void> => {
  const customerId = Number(req.params.customerId);
  const { projectType, projectName, stage, progress, completedNotes, pendingNotes, liveUrl, expectedDelivery } =
    req.body as Record<string, string>;

  const [project] = await db
    .insert(serviceProjectsTable)
    .values({
      customerId,
      projectType: projectType ?? "website",
      projectName,
      stage: stage ?? "planning",
      progress: Number(progress ?? 0),
      completedNotes: completedNotes ?? null,
      pendingNotes: pendingNotes ?? null,
      liveUrl: liveUrl ?? null,
      expectedDelivery: expectedDelivery ?? null,
    })
    .returning();
  res.json(project);
});

router.put("/admin/projects/:projectId", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  const { projectType, projectName, stage, progress, completedNotes, pendingNotes, liveUrl, expectedDelivery } =
    req.body as Record<string, string>;

  const [updated] = await db
    .update(serviceProjectsTable)
    .set({
      projectType,
      projectName,
      stage,
      progress: Number(progress ?? 0),
      completedNotes: completedNotes ?? null,
      pendingNotes: pendingNotes ?? null,
      liveUrl: liveUrl ?? null,
      expectedDelivery: expectedDelivery ?? null,
      updatedAt: new Date(),
    })
    .where(eq(serviceProjectsTable.id, projectId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(updated);
});

router.delete("/admin/projects/:projectId", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  await db.delete(serviceProjectsTable).where(eq(serviceProjectsTable.id, projectId));
  res.json({ ok: true });
});

// ─── Digital Marketing Reports ─────────────────────────────────────────────

router.get("/admin/dm-reports/:customerId", async (req, res): Promise<void> => {
  const customerId = Number(req.params.customerId);
  const reports = await db
    .select()
    .from(digitalMarketingReportsTable)
    .where(eq(digitalMarketingReportsTable.customerId, customerId));
  res.json(reports);
});

router.post("/admin/dm-reports/:customerId", async (req, res): Promise<void> => {
  const customerId = Number(req.params.customerId);
  const body = req.body as Record<string, unknown>;
  const year = Number(body.year);
  const month = Number(body.month);

  const existing = await db
    .select()
    .from(digitalMarketingReportsTable)
    .where(
      and(
        eq(digitalMarketingReportsTable.customerId, customerId),
        eq(digitalMarketingReportsTable.year, year),
        eq(digitalMarketingReportsTable.month, month),
      ),
    )
    .limit(1);

  const values = {
    customerId,
    year,
    month,
    platforms: body.platforms as string ?? null,
    plan: body.plan as string ?? null,
    targetVideos: Number(body.targetVideos ?? 0),
    targetPosts: Number(body.targetPosts ?? 0),
    targetReels: Number(body.targetReels ?? 0),
    targetStories: Number(body.targetStories ?? 0),
    uploadedVideos: Number(body.uploadedVideos ?? 0),
    uploadedPosts: Number(body.uploadedPosts ?? 0),
    uploadedReels: Number(body.uploadedReels ?? 0),
    uploadedStories: Number(body.uploadedStories ?? 0),
    followersGained: Number(body.followersGained ?? 0),
    engagementGrowth: body.engagementGrowth as string ?? null,
    leadsGenerated: Number(body.leadsGenerated ?? 0),
    adSpend: String(body.adSpend ?? "0"),
    summaryNotes: body.summaryNotes as string ?? null,
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    const [updated] = await db
      .update(digitalMarketingReportsTable)
      .set(values)
      .where(eq(digitalMarketingReportsTable.id, existing[0].id))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db
      .insert(digitalMarketingReportsTable)
      .values(values)
      .returning();
    res.json(created);
  }
});

// ─── SEO Reports ───────────────────────────────────────────────────────────

router.get("/admin/seo-reports/:customerId", async (req, res): Promise<void> => {
  const customerId = Number(req.params.customerId);
  const reports = await db
    .select()
    .from(seoReportsTable)
    .where(eq(seoReportsTable.customerId, customerId));
  res.json(reports);
});

router.post("/admin/seo-reports/:customerId", async (req, res): Promise<void> => {
  const customerId = Number(req.params.customerId);
  const body = req.body as Record<string, unknown>;
  const year = Number(body.year);
  const month = Number(body.month);

  const existing = await db
    .select()
    .from(seoReportsTable)
    .where(
      and(
        eq(seoReportsTable.customerId, customerId),
        eq(seoReportsTable.year, year),
        eq(seoReportsTable.month, month),
      ),
    )
    .limit(1);

  const values = {
    customerId,
    year,
    month,
    blogsPosted: Number(body.blogsPosted ?? 0),
    keywordsRanked: Number(body.keywordsRanked ?? 0),
    trafficGrowth: body.trafficGrowth as string ?? null,
    backlinksAdded: Number(body.backlinksAdded ?? 0),
    seoScore: body.seoScore ? Number(body.seoScore) : null,
    notes: body.notes as string ?? null,
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    const [updated] = await db
      .update(seoReportsTable)
      .set(values)
      .where(eq(seoReportsTable.id, existing[0].id))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db
      .insert(seoReportsTable)
      .values(values)
      .returning();
    res.json(created);
  }
});

export default router;
