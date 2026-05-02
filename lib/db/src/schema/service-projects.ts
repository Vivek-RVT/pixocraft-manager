import { pgTable, serial, integer, text, date, timestamp } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";

export const serviceProjectsTable = pgTable("service_projects", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  projectType: text("project_type").notNull().default("website"),
  projectName: text("project_name").notNull(),
  stage: text("stage").notNull().default("planning"),
  progress: integer("progress").notNull().default(0),
  completedNotes: text("completed_notes"),
  pendingNotes: text("pending_notes"),
  liveUrl: text("live_url"),
  expectedDelivery: date("expected_delivery"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ServiceProject = typeof serviceProjectsTable.$inferSelect;
export type InsertServiceProject = typeof serviceProjectsTable.$inferInsert;
