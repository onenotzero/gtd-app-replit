import { type Email, type Task } from "@shared/schema";

export type MailItem = {
  id: string;
  type: "email" | "task";
  data: Email | Task;
  timestamp: Date;
};

// Type guard to check if a MailItem contains an Email
export function isEmailItem(item: MailItem): item is MailItem & { type: "email"; data: Email } {
  return item.type === "email";
}

// Type guard to check if a MailItem contains a Task
export function isTaskItem(item: MailItem): item is MailItem & { type: "task"; data: Task } {
  return item.type === "task";
}
