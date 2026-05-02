import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";

export const digitalMarketingReportsTable = pgTable("digital_marketing_reports", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  platforms: text("platforms"),
  plan: text("plan"),
  targetVideos: integer("target_videos").default(0),
  targetPosts: integer("target_posts").default(0),
  targetReels: integer("target_reels").default(0),
  targetStories: integer("target_stories").default(0),
  uploadedVideos: integer("uploaded_videos").default(0),
  uploadedPosts: integer("uploaded_posts").default(0),
  uploadedReels: integer("uploaded_reels").default(0),
  uploadedStories: integer("uploaded_stories").default(0),
  followersGained: integer("followers_gained").default(0),
  engagementGrowth: text("engagement_growth"),
  leadsGenerated: integer("leads_generated").default(0),
  adSpend: numeric("ad_spend", { precision: 14, scale: 2 }).default("0"),
  summaryNotes: text("summary_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DigitalMarketingReport = typeof digitalMarketingReportsTable.$inferSelect;
export type InsertDigitalMarketingReport = typeof digitalMarketingReportsTable.$inferInsert;
