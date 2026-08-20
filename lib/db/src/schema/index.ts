import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const opportunitiesTable = pgTable("opportunities", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  headline: text("headline"),
  type: text("type").notNull(),
  status: text("status").notNull().default("published"),
  imageUrl: text("image_url").notNull(),
  description: text("description").notNull(),
  deadline: timestamp("deadline", { withTimezone: false }).notNull(),
  eligibleCountries: jsonb("eligible_countries").$type<string[]>().notNull(),
  eligibilityCriteria: text("eligibility_criteria").notNull(),
  financialBenefits: text("financial_benefits").notNull(),
  requiredDocuments: text("required_documents").notNull(),
  applicationUrl: text("application_url"),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
});

export type Opportunity = typeof opportunitiesTable.$inferSelect;