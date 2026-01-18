import { type Email, type Task } from "@shared/schema";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, differenceInMinutes } from "date-fns";
import { Paperclip, Star, CheckSquare } from "lucide-react";

type MailItem = {
  id: string;
  type: "task" | "email";
  data: Task | Email;
};

interface MailListItemProps {
  item: MailItem;
  isSelected: boolean;
  onClick: () => void;
}

function formatSmartDate(date: Date): string {
  const now = new Date();
  const minutesAgo = differenceInMinutes(now, date);

  if (minutesAgo < 1) return "Just now";
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  if (differenceInMinutes(now, date) < 60 * 24 * 7) return format(date, "EEEE");
  return format(date, "MMM d");
}

function getInitials(name: string): string {
  const parts = name.split(/[\s<@]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0]?.substring(0, 2).toUpperCase() || "??";
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-red-500",
  ];
  const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

export default function MailListItem({ item, isSelected, onClick }: MailListItemProps) {
  const isEmail = item.type === "email";
  const email = isEmail ? (item.data as Email) : null;
  const task = !isEmail ? (item.data as Task) : null;

  const title = isEmail ? email!.subject : task!.title;
  const sender = isEmail ? email!.sender : "Task";
  const preview = isEmail ? email!.content : task!.description || "";
  const date = isEmail ? new Date(email!.receivedAt) : new Date();
  const isUnread = isEmail ? !email!.processed : true;
  const hasAttachments = isEmail && email!.attachments && email!.attachments.length > 0;

  // Extract name from email sender (e.g., "John Doe <john@example.com>" -> "John Doe")
  const senderName = sender.replace(/<.*>/, "").trim() || sender;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-3 cursor-pointer border-b border-border/50 transition-colors",
        isSelected
          ? "bg-blue-500 text-white"
          : "hover:bg-accent/50",
        !isSelected && isUnread && "bg-background"
      )}
    >
      {/* Unread indicator */}
      <div className="flex-shrink-0 w-2 pt-2">
        {isUnread && !isSelected && (
          <div className="w-2 h-2 rounded-full bg-blue-500" />
        )}
      </div>

      {/* Avatar */}
      <div className="flex-shrink-0">
        {isEmail ? (
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium",
              isSelected ? "bg-white/20" : getAvatarColor(senderName)
            )}
          >
            {getInitials(senderName)}
          </div>
        ) : (
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
            )}
          >
            <CheckSquare className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm truncate",
              isUnread && !isSelected ? "font-semibold" : "font-medium",
              isSelected && "text-white"
            )}
          >
            {senderName}
          </span>
          <span
            className={cn(
              "text-xs flex-shrink-0",
              isSelected ? "text-white/70" : "text-muted-foreground"
            )}
          >
            {formatSmartDate(date)}
          </span>
        </div>

        <div
          className={cn(
            "text-sm truncate",
            isUnread && !isSelected ? "font-medium" : "",
            isSelected ? "text-white" : "text-foreground"
          )}
        >
          {title}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm truncate flex-1",
              isSelected ? "text-white/70" : "text-muted-foreground"
            )}
          >
            {preview.substring(0, 100)}
          </span>

          {hasAttachments && (
            <Paperclip
              className={cn(
                "h-3.5 w-3.5 flex-shrink-0",
                isSelected ? "text-white/70" : "text-muted-foreground"
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
