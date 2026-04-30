import {
  pgTable,
  serial,
  text,
  numeric,
  date,
  timestamp,
} from "drizzle-orm/pg-core";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  source: text("source").notNull(),
  accountName: text("account_name").notNull(),
  method: text("method").notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Transaction = typeof transactionsTable.$inferSelect;
export type InsertTransaction = typeof transactionsTable.$inferInsert;
