import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Task statuses following GTD methodology
export const TaskStatus = {
  INBOX: "inbox",
  NEXT_ACTION: "next_action",
  WAITING: "waiting",
  SOMEDAY: "someday",
  DONE: "done",
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
  status: text("status", { enum: Object.values(TaskStatus) }).notNull().default(TaskStatus.INBOX),
  projectId: integer("project_id").references(() => projects.id),
  contextId: integer("context_id").references(() => contexts.id),
  dueDate: timestamp("due_date"),
  emailId: integer("email_id").references(() => emails.id),
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
  folder: text("folder", { enum: Object.values(EmailFolder) }).notNull().default(EmailFolder.INBOX),
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

// Insert schemas
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true });
export const insertContextSchema = createInsertSchema(contexts).omit({ id: true });
export const insertEmailSchema = createInsertSchema(emails).omit({ id: true });
export const insertEmailAccountSchema = createInsertSchema(emailAccounts).omit({ id: true });

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