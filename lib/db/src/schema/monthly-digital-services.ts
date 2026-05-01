import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  date,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { customersTable } from "./customers";

export const monthlyDigitalServicesTable = pgTable("monthly_digital_services", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  serviceName: text("service_name").notNull(),
  platform: text("platform"),
  monthlyCost: numeric("monthly_cost", { precision: 14, scale: 2 }).notNull(),
  monthlyCharge: numeric("monthly_charge", { precision: 14, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 14, scale: 2 }).notNull().default("0"),
  startDate: date("start_date").notNull(),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const monthlyDigitalCompletionsTable = pgTable("monthly_digital_completions", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id")
    .notNull()
    .references(() => monthlyDigitalServicesTable.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  completed: boolean("completed").notNull().default(false),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type MonthlyDigitalService = typeof monthlyDigitalServicesTable.$inferSelect;
export type InsertMonthlyDigitalService = typeof monthlyDigitalServicesTable.$inferInsert;
export type MonthlyDigitalCompletion = typeof monthlyDigitalCompletionsTable.$inferSelect;
