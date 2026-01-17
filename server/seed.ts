import { db } from "./db";
import { tasks, projects, contexts, TaskStatus } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  try {
    // Add default contexts
    const contextData = [
      { name: "@home", color: "#4CAF50" },
      { name: "@work", color: "#2196F3" },
      { name: "@computer", color: "#9C27B0" },
      { name: "@phone", color: "#F44336" },
    ];

    const createdContexts = await db.insert(contexts).values(contextData).returning();
    console.log(`Created ${createdContexts.length} contexts`);

    // Add seed projects
    const projectData = [
      { name: "Website Redesign", description: "Update company website with new branding", isActive: true },
      { name: "Q4 Planning", description: "Strategic planning for Q4 initiatives", isActive: true },
      { name: "Team Training", description: "Onboard new team members and provide training", isActive: true },
      { name: "Bug Fixes", description: "Address critical bugs in production", isActive: true },
      { name: "Documentation", description: "Update system and API documentation", isActive: true },
    ];

    const createdProjects = await db.insert(projects).values(projectData).returning();
    console.log(`Created ${createdProjects.length} projects`);

    // Add seed inbox items
    const inboxTasks = [
      {
        title: "Review budget proposal",
        description: "Check Q4 budget allocation from finance team",
        status: TaskStatus.INBOX,
      },
      {
        title: "Reply to client email",
        description: "Follow up on contract negotiation",
        status: TaskStatus.INBOX,
      },
      {
        title: "Schedule team meeting",
        description: "Set up weekly sync with project team",
        status: TaskStatus.INBOX,
      },
      {
        title: "Update project status",
        description: "Send weekly status report to stakeholders",
        status: TaskStatus.INBOX,
      },
      {
        title: "Review pull requests",
        description: "Check pending code reviews from team",
        status: TaskStatus.INBOX,
      },
    ];

    const createdInboxTasks = await db.insert(tasks).values(inboxTasks).returning();
    console.log(`Created ${createdInboxTasks.length} inbox tasks`);

    // Add seed next action items - one per context
    const nextActionTasks = [
      {
        title: "Buy groceries for dinner",
        description: "Pick up ingredients for meal prep",
        status: TaskStatus.NEXT_ACTION,
        contextId: createdContexts[0].id, // @home
        timeEstimate: "30min" as const,
        energyLevel: "low" as const,
      },
      {
        title: "Prepare presentation slides",
        description: "Create slides for client meeting",
        status: TaskStatus.NEXT_ACTION,
        contextId: createdContexts[1].id, // @work
        projectId: createdProjects[0].id,
        timeEstimate: "1hr" as const,
        energyLevel: "medium" as const,
      },
      {
        title: "Debug login form issue",
        description: "Fix authentication timeout error",
        status: TaskStatus.NEXT_ACTION,
        contextId: createdContexts[2].id, // @computer
        projectId: createdProjects[3].id,
        timeEstimate: "1hr" as const,
        energyLevel: "high" as const,
      },
      {
        title: "Call dentist for appointment",
        description: "Schedule routine cleaning",
        status: TaskStatus.NEXT_ACTION,
        contextId: createdContexts[3].id, // @phone
        timeEstimate: "15min" as const,
        energyLevel: "low" as const,
      },
    ];

    const createdNextActionTasks = await db.insert(tasks).values(nextActionTasks).returning();
    console.log(`Created ${createdNextActionTasks.length} next action tasks`);

    console.log("Seeding complete!");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
