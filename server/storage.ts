import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  Task, InsertTask,
  Project, InsertProject,
  Context, InsertContext,
  Email, InsertEmail,
  tasks,
  projects,
  contexts,
  emails,
} from "@shared/schema";

export interface IStorage {
  // Tasks
  getTasks(): Promise<Task[]>;
  getTasksByStatus(status: string): Promise<Task[]>;
  getTasksByProject(projectId: number): Promise<Task[]>;
  getTasksByContext(contextId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task>;
  deleteTask(id: number): Promise<void>;

  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Contexts
  getContexts(): Promise<Context[]>;
  getContext(id: number): Promise<Context | undefined>;
  createContext(context: InsertContext): Promise<Context>;
  updateContext(id: number, context: Partial<Context>): Promise<Context>;
  deleteContext(id: number): Promise<void>;

  // Emails
  getEmails(): Promise<Email[]>;
  createEmail(email: InsertEmail): Promise<Email>;
  updateEmail(id: number, email: Partial<Email>): Promise<Email>;
  deleteEmail(id: number): Promise<void>;
  markEmailAsProcessed(id: number): Promise<Email>;
}

export class DatabaseStorage implements IStorage {
  // Tasks
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async getTasksByStatus(status: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.status, status));
  }

  async getTasksByProject(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId));
  }

  async getTasksByContext(contextId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.contextId, contextId));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: number, task: Partial<Task>): Promise<Task> {
    const [updated] = await db.update(tasks)
      .set(task)
      .where(eq(tasks.id, id))
      .returning();

    if (!updated) throw new Error("Task not found");
    return updated;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async updateProject(id: number, project: Partial<Project>): Promise<Project> {
    const [updated] = await db.update(projects)
      .set(project)
      .where(eq(projects.id, id))
      .returning();

    if (!updated) throw new Error("Project not found");
    return updated;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Contexts
  async getContexts(): Promise<Context[]> {
    return await db.select().from(contexts);
  }

  async getContext(id: number): Promise<Context | undefined> {
    const [context] = await db.select().from(contexts).where(eq(contexts.id, id));
    return context;
  }

  async createContext(context: InsertContext): Promise<Context> {
    const [created] = await db.insert(contexts).values(context).returning();
    return created;
  }

  async updateContext(id: number, context: Partial<Context>): Promise<Context> {
    const [updated] = await db.update(contexts)
      .set(context)
      .where(eq(contexts.id, id))
      .returning();

    if (!updated) throw new Error("Context not found");
    return updated;
  }

  async deleteContext(id: number): Promise<void> {
    await db.delete(contexts).where(eq(contexts.id, id));
  }

  // Emails
  async getEmails(): Promise<Email[]> {
    return await db.select().from(emails);
  }

  async createEmail(email: InsertEmail): Promise<Email> {
    // Check if email with this messageId already exists
    const [existing] = await db.select()
      .from(emails)
      .where(eq(emails.messageId, email.messageId));

    if (existing) {
      return existing;
    }

    const [created] = await db.insert(emails).values(email).returning();
    return created;
  }

  async updateEmail(id: number, email: Partial<Email>): Promise<Email> {
    const [updated] = await db.update(emails)
      .set(email)
      .where(eq(emails.id, id))
      .returning();

    if (!updated) throw new Error("Email not found");
    return updated;
  }

  async deleteEmail(id: number): Promise<void> {
    await db.delete(emails).where(eq(emails.id, id));
  }

  async markEmailAsProcessed(id: number): Promise<Email> {
    const [updated] = await db.update(emails)
      .set({ processed: true })
      .where(eq(emails.id, id))
      .returning();

    if (!updated) throw new Error("Email not found");
    return updated;
  }
}

export const storage = new DatabaseStorage();
