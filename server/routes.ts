import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertProjectSchema, insertContextSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Tasks
  app.get("/api/tasks", async (req, res) => {
    const tasks = await storage.getTasks();
    res.json(tasks);
  });

  app.get("/api/tasks/status/:status", async (req, res) => {
    const tasks = await storage.getTasksByStatus(req.params.status);
    res.json(tasks);
  });

  app.get("/api/tasks/project/:projectId", async (req, res) => {
    const tasks = await storage.getTasksByProject(Number(req.params.projectId));
    res.json(tasks);
  });

  app.get("/api/tasks/context/:contextId", async (req, res) => {
    const tasks = await storage.getTasksByContext(Number(req.params.contextId));
    res.json(tasks);
  });

  app.post("/api/tasks", async (req, res) => {
    const task = insertTaskSchema.parse(req.body);
    const created = await storage.createTask(task);
    res.json(created);
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const task = await storage.updateTask(Number(req.params.id), req.body);
    res.json(task);
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    await storage.deleteTask(Number(req.params.id));
    res.sendStatus(204);
  });

  // Projects
  app.get("/api/projects", async (req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.post("/api/projects", async (req, res) => {
    const project = insertProjectSchema.parse(req.body);
    const created = await storage.createProject(project);
    res.json(created);
  });

  app.patch("/api/projects/:id", async (req, res) => {
    const project = await storage.updateProject(Number(req.params.id), req.body);
    res.json(project);
  });

  app.delete("/api/projects/:id", async (req, res) => {
    await storage.deleteProject(Number(req.params.id));
    res.sendStatus(204);
  });

  // Contexts
  app.get("/api/contexts", async (req, res) => {
    const contexts = await storage.getContexts();
    res.json(contexts);
  });

  app.post("/api/contexts", async (req, res) => {
    const context = insertContextSchema.parse(req.body);
    const created = await storage.createContext(context);
    res.json(created);
  });

  app.patch("/api/contexts/:id", async (req, res) => {
    const context = await storage.updateContext(Number(req.params.id), req.body);
    res.json(context);
  });

  app.delete("/api/contexts/:id", async (req, res) => {
    await storage.deleteContext(Number(req.params.id));
    res.sendStatus(204);
  });

  // Mock Emails
  app.get("/api/emails", async (req, res) => {
    const emails = await storage.getEmails();
    res.json(emails);
  });

  app.post("/api/emails/:id/process", async (req, res) => {
    const email = await storage.markEmailAsProcessed(Number(req.params.id));
    res.json(email);
  });

  const httpServer = createServer(app);
  return httpServer;
}
