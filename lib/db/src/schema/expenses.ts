import {
  pgTable,
  serial,
  text,
  numeric,
  date,
  timestamp,
} from "drizzle-orm/pg-core";

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Expense = typeof expensesTable.$inferSelect;
export type InsertExpense = typeof expensesTable.$inferInsert;
