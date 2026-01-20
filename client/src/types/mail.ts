import { type Email, type Task } from "@shared/schema";

export type MailItem = {
  id: string;
  type: "email" | "task";
  data: Email | Task;
};
