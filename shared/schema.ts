import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Task statuses following GTD methodology
export const TaskStatus = {
  INBOX: "inbox",
  NEXT_ACTION: "next_action",
  WAITING: "waiting",
  SOMEDAY: "someday",
  REFERENCE: "reference",
  DONE: "done",
  TRASH: "trash",
} as const;

// Time estimates for tasks
export const TimeEstimate = {
  MINUTES_15: "15min",
  MINUTES_30: "30min",
  HOUR_1: "1hr",
  HOURS_2_PLUS: "2hr+",
} as const;

// Energy levels for tasks
export const EnergyLevel = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

// Email folder types
export const EmailFolder = {
  INBOX: "INBOX",
  SENT: "SENT",
  DRAFTS: "DRAFTS",
  ARCHIVED: "ARCHIVED",
  TRASH: "TRASH",
} as const;

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: Object.values(TaskStatus) as [string, ...string[]] }).notNull().default(TaskStatus.INBOX),
  projectId: integer("project_id").references(() => projects.id),
  contextId: integer("context_id").references(() => contexts.id),
  dueDate: timestamp("due_date"),
  emailId: integer("email_id").references(() => emails.id),
  deferCount: integer("defer_count").notNull().default(0),
  timeEstimate: text("time_estimate", { enum: Object.values(TimeEstimate) as [string, ...string[]] }),
  energyLevel: text("energy_level", { enum: Object.values(EnergyLevel) as [string, ...string[]] }),
  waitingFor: text("waiting_for"),
  waitingForFollowUp: timestamp("waiting_for_follow_up"),
  referenceCategory: text("reference_category"),
  notes: text("notes"),
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
});

// Contexts table (e.g., @home, @work, @computer)
export const contexts = pgTable("contexts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
});

// Enhanced email messages table
export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  messageId: text("message_id").notNull().unique(),
  subject: text("subject").notNull(),
  sender: text("sender").notNull(),
  recipients: text("recipients").array().notNull(),
  cc: text("cc").array(),
  bcc: text("bcc").array(),
  content: text("content").notNull(),
  htmlContent: text("html_content"),
  folder: text("folder", { enum: Object.values(EmailFolder) as [string, ...string[]] }).notNull().default(EmailFolder.INBOX),
  processed: boolean("processed").notNull().default(false),
  flags: jsonb("flags").notNull().default({}),
  receivedAt: timestamp("received_at").notNull(),
  attachments: jsonb("attachments").array(),
});

// Email account settings
export const emailAccounts = pgTable("email_accounts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("display_name").notNull(),
  imapHost: text("imap_host").notNull(),
  imapPort: integer("imap_port").notNull(),
  smtpHost: text("smtp_host").notNull(),
  smtpPort: integer("smtp_port").notNull(),
  useSSL: boolean("use_ssl").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
});

// Helper for nullable date fields - prevents null from being coerced to Unix epoch
const nullableDate = z.preprocess(
  (val) => (val === null || val === '' || val === undefined ? null : val),
  z.coerce.date().nullable()
).optional();

// Insert schemas
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true }).extend({
  dueDate: nullableDate,
  waitingForFollowUp: nullableDate,
});
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true });
export const insertContextSchema = createInsertSchema(contexts).omit({ id: true });
export const insertEmailSchema = createInsertSchema(emails).omit({ id: true }).extend({
  receivedAt: z.coerce.date(),
});
export const insertEmailAccountSchema = createInsertSchema(emailAccounts).omit({ id: true });

// Update schemas (partial versions for PATCH endpoints)
export const updateTaskSchema = insertTaskSchema.partial();
export const updateProjectSchema = insertProjectSchema.partial();
export const updateContextSchema = insertContextSchema.partial();
export const updateEmailSchema = insertEmailSchema.partial();

// Types
export type Task = typeof tasks.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Context = typeof contexts.$inferSelect;
export type Email = typeof emails.$inferSelect;
export type EmailAccount = typeof emailAccounts.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertContext = z.infer<typeof insertContextSchema>;
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type InsertEmailAccount = z.infer<typeof insertEmailAccountSchema>;