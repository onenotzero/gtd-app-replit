import { 
  Task, InsertTask, 
  Project, InsertProject,
  Context, InsertContext,
  Email, InsertEmail,
  TaskStatus
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

export class MemStorage implements IStorage {
  private tasks: Map<number, Task>;
  private projects: Map<number, Project>;
  private contexts: Map<number, Context>;
  private emails: Map<number, Email>;
  private taskId: number = 1;
  private projectId: number = 1;
  private contextId: number = 1;
  private emailId: number = 1;

  constructor() {
    this.tasks = new Map();
    this.projects = new Map();
    this.contexts = new Map();
    this.emails = new Map();

    // Add default contexts
    this.createContext({ name: "@home", color: "#4CAF50" });
    this.createContext({ name: "@work", color: "#2196F3" });
    this.createContext({ name: "@computer", color: "#9C27B0" });
    this.createContext({ name: "@phone", color: "#F44336" });
  }

  // Tasks
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTasksByStatus(status: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.status === status);
  }

  async getTasksByProject(projectId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
  }

  async getTasksByContext(contextId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.contextId === contextId);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.taskId++;
    const newTask = { ...task, id } as Task;
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: number, task: Partial<Task>): Promise<Task> {
    const existing = this.tasks.get(id);
    if (!existing) throw new Error("Task not found");
    const updated = { ...existing, ...task };
    this.tasks.set(id, updated);
    return updated;
  }

  async deleteTask(id: number): Promise<void> {
    this.tasks.delete(id);
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = this.projectId++;
    const newProject = { ...project, id } as Project;
    this.projects.set(id, newProject);
    return newProject;
  }

  async updateProject(id: number, project: Partial<Project>): Promise<Project> {
    const existing = this.projects.get(id);
    if (!existing) throw new Error("Project not found");
    const updated = { ...existing, ...project };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: number): Promise<void> {
    this.projects.delete(id);
  }

  // Contexts
  async getContexts(): Promise<Context[]> {
    return Array.from(this.contexts.values());
  }

  async getContext(id: number): Promise<Context | undefined> {
    return this.contexts.get(id);
  }

  async createContext(context: InsertContext): Promise<Context> {
    const id = this.contextId++;
    const newContext = { ...context, id } as Context;
    this.contexts.set(id, newContext);
    return newContext;
  }

  async updateContext(id: number, context: Partial<Context>): Promise<Context> {
    const existing = this.contexts.get(id);
    if (!existing) throw new Error("Context not found");
    const updated = { ...existing, ...context };
    this.contexts.set(id, updated);
    return updated;
  }

  async deleteContext(id: number): Promise<void> {
    this.contexts.delete(id);
  }

  // Emails
  async getEmails(): Promise<Email[]> {
    return Array.from(this.emails.values());
  }

  async createEmail(email: InsertEmail): Promise<Email> {
    // Check if email with this messageId already exists
    const existing = Array.from(this.emails.values()).find(
      e => e.messageId === email.messageId
    );
    if (existing) {
      return existing;
    }
    
    const id = this.emailId++;
    const newEmail = { ...email, id } as Email;
    this.emails.set(id, newEmail);
    return newEmail;
  }

  async updateEmail(id: number, email: Partial<Email>): Promise<Email> {
    const existing = this.emails.get(id);
    if (!existing) throw new Error("Email not found");
    const updated = { ...existing, ...email };
    this.emails.set(id, updated);
    return updated;
  }

  async deleteEmail(id: number): Promise<void> {
    this.emails.delete(id);
  }

  async markEmailAsProcessed(id: number): Promise<Email> {
    const email = this.emails.get(id);
    if (!email) throw new Error("Email not found");
    const updated = { ...email, processed: true };
    this.emails.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
