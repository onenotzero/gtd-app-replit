import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertTaskSchema,
  insertProjectSchema,
  insertContextSchema,
  insertEmailSchema,
  insertWeeklyReviewSchema,
  updateTaskSchema,
  updateProjectSchema,
  updateContextSchema,
  updateEmailSchema,
} from "@shared/schema";
import { EmailService } from "./services/email";
import * as GoogleCalendarService from "./services/google-calendar";
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
    try {
      const updates = updateTaskSchema.parse(req.body);
      const task = await storage.updateTask(Number(req.params.id), updates);
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid task data', errors: error.errors });
        return;
      }
      throw error;
    }
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
    try {
      const updates = updateProjectSchema.parse(req.body);
      const project = await storage.updateProject(Number(req.params.id), updates);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid project data', errors: error.errors });
        return;
      }
      throw error;
    }
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
    try {
      const updates = updateContextSchema.parse(req.body);
      const context = await storage.updateContext(Number(req.params.id), updates);
      res.json(context);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid context data', errors: error.errors });
        return;
      }
      throw error;
    }
  });

  app.delete("/api/contexts/:id", async (req, res) => {
    await storage.deleteContext(Number(req.params.id));
    res.sendStatus(204);
  });

  // Enhanced Email Routes
  app.get("/api/emails", async (req, res) => {
    try {
      // Trigger IMAP fetch in background (don't wait)
      EmailService.fetchEmails().catch(err => console.error('Background email fetch error:', err));
      // Return existing emails from database immediately
      const emails = await storage.getEmails();
      res.json(emails);
    } catch (error) {
      console.error('Error fetching emails:', error);
      res.status(500).json({ message: 'Failed to fetch emails' });
    }
  });

  app.post("/api/emails", async (req, res) => {
    try {
      const email = insertEmailSchema.parse(req.body);
      const created = await storage.createEmail(email);
      res.json(created);
    } catch (error) {
      console.error('Error creating email:', error);
      res.status(500).json({ message: 'Failed to create email' });
    }
  });

  app.post("/api/emails/:id/process", async (req, res) => {
    try {
      const email = await storage.markEmailAsProcessed(Number(req.params.id));
      await EmailService.markEmailAsRead(email.messageId);
      res.json(email);
    } catch (error) {
      console.error('Error processing email:', error);
      res.status(500).json({ message: 'Failed to process email' });
    }
  });

  app.patch("/api/emails/:id", async (req, res) => {
    try {
      const updates = updateEmailSchema.parse(req.body);
      const email = await storage.updateEmail(Number(req.params.id), updates);
      if (updates.processed) {
        await EmailService.markEmailAsRead(email.messageId);
      }
      res.json(email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid email data', errors: error.errors });
        return;
      }
      console.error('Error updating email:', error);
      res.status(500).json({ message: 'Failed to update email' });
    }
  });

  app.delete("/api/emails/:id", async (req, res) => {
    try {
      await storage.deleteEmail(Number(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      console.error('Error deleting email:', error);
      res.status(500).json({ message: 'Failed to delete email' });
    }
  });

  app.get("/api/emails/:id", async (req, res) => {
    try {
      const emails = await storage.getEmails();
      const email = emails.find(e => e.id === Number(req.params.id));
      if (!email) {
        res.status(404).json({ message: 'Email not found' });
        return;
      }
      res.json(email);
    } catch (error) {
      console.error('Error fetching email:', error);
      res.status(500).json({ message: 'Failed to fetch email' });
    }
  });

  app.post("/api/emails/send", async (req, res) => {
    try {
      const { to, subject, text, html, cc, bcc, attachments } = req.body;
      await EmailService.sendEmail(to, subject, text, html, cc, bcc, attachments);
      res.json({ message: 'Email sent successfully' });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ message: 'Failed to send email' });
    }
  });

  app.post("/api/emails/:id/archive", async (req, res) => {
    try {
      const email = await storage.updateEmail(Number(req.params.id), { folder: 'ARCHIVED' });
      await EmailService.archiveEmail(email.messageId);
      res.json(email);
    } catch (error) {
      console.error('Error archiving email:', error);
      res.status(500).json({ message: 'Failed to archive email' });
    }
  });

  app.post("/api/emails/:id/move", async (req, res) => {
    try {
      const { folder } = req.body;
      const email = await storage.updateEmail(Number(req.params.id), { folder });
      await EmailService.moveEmailToFolder(email.messageId, folder);
      res.json(email);
    } catch (error) {
      console.error('Error moving email:', error);
      res.status(500).json({ message: 'Failed to move email' });
    }
  });

  app.post("/api/emails/:id/reply", async (req, res) => {
    try {
      const emails = await storage.getEmails();
      const email = emails.find(e => e.id === Number(req.params.id));
      if (!email) {
        res.status(404).json({ message: 'Email not found' });
        return;
      }

      const { text, html, attachments } = req.body;
      await EmailService.replyToEmail(
        {
          sender: email.sender,
          subject: email.subject,
          messageId: email.messageId
        },
        text,
        html,
        attachments
      );

      res.json({ message: 'Reply sent successfully' });
    } catch (error) {
      console.error('Error replying to email:', error);
      res.status(500).json({ message: 'Failed to send reply' });
    }
  });

  app.post("/api/emails/:id/forward", async (req, res) => {
    try {
      const emails = await storage.getEmails();
      const email = emails.find(e => e.id === Number(req.params.id));
      if (!email) {
        res.status(404).json({ message: 'Email not found' });
        return;
      }

      const { to, additionalText, attachments } = req.body;
      await EmailService.forwardEmail(
        {
          subject: email.subject,
          content: email.content,
          sender: email.sender
        },
        to,
        additionalText,
        attachments
      );

      res.json({ message: 'Email forwarded successfully' });
    } catch (error) {
      console.error('Error forwarding email:', error);
      res.status(500).json({ message: 'Failed to forward email' });
    }
  });

  // Google Calendar
  app.get("/api/calendar/status", async (req, res) => {
    try {
      const status = await GoogleCalendarService.checkConnection();
      res.json(status);
    } catch (error) {
      console.error('Error checking calendar connection:', error);
      res.status(500).json({ connected: false, error: 'Failed to check connection' });
    }
  });

  app.get("/api/calendar/events", async (req, res) => {
    try {
      const events = await GoogleCalendarService.listUpcomingEvents(20);
      res.json(events);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      res.status(500).json({ message: 'Failed to fetch events' });
    }
  });

  app.get("/api/calendar/calendars", async (req, res) => {
    try {
      const calendars = await GoogleCalendarService.listCalendars();
      res.json(calendars);
    } catch (error) {
      console.error('Error fetching calendars:', error);
      res.status(500).json({ message: 'Failed to fetch calendars' });
    }
  });

  app.post("/api/calendar/events", async (req, res) => {
    try {
      // Validate calendar event payload (supports both timed and all-day events)
      const calendarEventSchema = z.object({
        summary: z.string().min(1, "Event summary is required"),
        description: z.string().optional(),
        start: z.union([
          z.object({
            dateTime: z.string(),
            timeZone: z.string().optional(),
          }),
          z.object({
            date: z.string(),
          }),
        ]),
        end: z.union([
          z.object({
            dateTime: z.string(),
            timeZone: z.string().optional(),
          }),
          z.object({
            date: z.string(),
          }),
        ]),
        location: z.string().optional(),
      });

      const validatedEvent = calendarEventSchema.parse(req.body);
      const event = await GoogleCalendarService.createEvent(validatedEvent as any);
      res.json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid event data', errors: error.errors });
        return;
      }
      console.error('Error creating calendar event:', error);
      res.status(500).json({ message: 'Failed to create event' });
    }
  });

  // Weekly Reviews
  app.get("/api/weekly-reviews", async (req, res) => {
    try {
      const reviews = await storage.getWeeklyReviews();
      res.json(reviews);
    } catch (error) {
      console.error('Error fetching weekly reviews:', error);
      res.status(500).json({ message: 'Failed to fetch weekly reviews' });
    }
  });

  app.get("/api/weekly-reviews/latest", async (req, res) => {
    try {
      const review = await storage.getLatestWeeklyReview();
      res.json(review || null);
    } catch (error) {
      console.error('Error fetching latest weekly review:', error);
      res.status(500).json({ message: 'Failed to fetch latest review' });
    }
  });

  app.post("/api/weekly-reviews", async (req, res) => {
    try {
      const review = insertWeeklyReviewSchema.parse(req.body);
      const created = await storage.createWeeklyReview(review);
      res.json(created);
    } catch (error) {
      console.error('Error creating weekly review:', error);
      res.status(500).json({ message: 'Failed to create weekly review' });
    }
  });

  // Integration Status
  app.get("/api/integrations/status", async (req, res) => {
    try {
      // Check email configuration
      const emailConfigured = !!(
        process.env.EMAIL_ADDRESS &&
        process.env.EMAIL_PASSWORD &&
        process.env.IMAP_HOST &&
        process.env.SMTP_HOST
      );

      // Check Google Calendar connection
      let calendarConnected = false;
      try {
        const calendar = await GoogleCalendarService.getCalendarClient();
        if (calendar) {
          calendarConnected = true;
        }
      } catch (e) {
        calendarConnected = false;
      }

      res.json({
        email: {
          configured: emailConfigured,
          address: emailConfigured ? process.env.EMAIL_ADDRESS : null,
        },
        calendar: {
          connected: calendarConnected,
          provider: calendarConnected ? 'Google Calendar' : null,
        },
      });
    } catch (error) {
      console.error('Error checking integration status:', error);
      res.status(500).json({ message: 'Failed to check integration status' });
    }
  });

  // Test email connection
  app.post("/api/integrations/email/test", async (req, res) => {
    try {
      // Test by fetching emails (which tests IMAP connection)
      await EmailService.fetchEmails();
      res.json({ success: true, message: 'Email connection successful' });
    } catch (error) {
      console.error('Email connection test failed:', error);
      res.status(500).json({ success: false, message: 'Email connection failed' });
    }
  });

  // Test calendar connection
  app.post("/api/integrations/calendar/test", async (req, res) => {
    try {
      const events = await GoogleCalendarService.getUpcomingEvents(1);
      res.json({ success: true, message: 'Calendar connection successful', eventCount: events.length });
    } catch (error) {
      console.error('Calendar connection test failed:', error);
      res.status(500).json({ success: false, message: 'Calendar connection failed' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}