import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";

export const clientPortalsTable = pgTable("client_portals", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().unique().references(() => customersTable.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ClientPortal = typeof clientPortalsTable.$inferSelect;
export type InsertClientPortal = typeof clientPortalsTable.$inferInsert;
