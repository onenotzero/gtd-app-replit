import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
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

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: Object.values(TaskStatus) }).notNull().default(TaskStatus.INBOX),
  projectId: integer("project_id").references(() => projects.id),
  contextId: integer("context_id").references(() => contexts.id),
  dueDate: timestamp("due_date"),
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

// Mock email messages table
export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  sender: text("sender").notNull(),
  content: text("content").notNull(),
  processed: boolean("processed").notNull().default(false),
});

// Insert schemas
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true });
export const insertContextSchema = createInsertSchema(contexts).omit({ id: true });
export const insertEmailSchema = createInsertSchema(emails).omit({ id: true });

// Types
export type Task = typeof tasks.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Context = typeof contexts.$inferSelect;
export type Email = typeof emails.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertContext = z.infer<typeof insertContextSchema>;
export type InsertEmail = z.infer<typeof insertEmailSchema>;
