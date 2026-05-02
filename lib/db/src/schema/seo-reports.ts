import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";

export const seoReportsTable = pgTable("seo_reports", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  blogsPosted: integer("blogs_posted").default(0),
  keywordsRanked: integer("keywords_ranked").default(0),
  trafficGrowth: text("traffic_growth"),
  backlinksAdded: integer("backlinks_added").default(0),
  seoScore: integer("seo_score"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SeoReport = typeof seoReportsTable.$inferSelect;
export type InsertSeoReport = typeof seoReportsTable.$inferInsert;
