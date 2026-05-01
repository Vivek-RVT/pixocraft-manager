import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { customersTable } from "./customers";

export const servicesTable = pgTable("services", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  serviceType: text("service_type").notNull().default("other"),
  serviceName: text("service_name").notNull(),
  priceSold: numeric("price_sold", { precision: 14, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  amountPaid: numeric("amount_paid", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  deliveryStatus: text("delivery_status").notNull().default("pending"),
  satisfactionRating: integer("satisfaction_rating"),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Service = typeof servicesTable.$inferSelect;
export type InsertService = typeof servicesTable.$inferInsert;
