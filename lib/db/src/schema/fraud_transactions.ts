import { pgTable, text, serial, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const fraudTransactionsTable = pgTable("fraud_transactions", {
  id: serial("id").primaryKey(),
  txnRef: text("txn_ref").notNull().unique(),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  hour: integer("hour").notNull(),
  distance: real("distance").notNull(),
  frequency: integer("frequency").notNull(),
  deviceType: text("device_type").notNull(),
  country: text("country").notNull(),
  isFirstTransaction: boolean("is_first_transaction").notNull().default(false),
  score: integer("score").notNull(),
  status: text("status", { enum: ["APPROVED", "REVIEW", "BLOCKED"] }).notNull(),
  velocityRisk: integer("velocity_risk").notNull().default(0),
  geographicRisk: integer("geographic_risk").notNull().default(0),
  behavioralRisk: integer("behavioral_risk").notNull().default(0),
  deviceRisk: integer("device_risk").notNull().default(0),
  amlStatus: text("aml_status", { enum: ["PASSED", "FLAGGED"] }).notNull().default("PASSED"),
  complianceTier: text("compliance_tier").notNull().default("STANDARD"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFraudTransactionSchema = createInsertSchema(fraudTransactionsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertFraudTransaction = z.infer<typeof insertFraudTransactionSchema>;
export type FraudTransaction = typeof fraudTransactionsTable.$inferSelect;
