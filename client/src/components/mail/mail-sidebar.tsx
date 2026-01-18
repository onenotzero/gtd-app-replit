import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Inbox,
  Send,
  File,
  Archive,
  Trash2,
  Star,
  Clock,
  AlertCircle,
} from "lucide-react";

export type MailFolder = "inbox" | "sent" | "drafts" | "archived" | "trash" | "starred" | "unread";

interface MailSidebarProps {
  selectedFolder: MailFolder;
  onFolderSelect: (folder: MailFolder) => void;
  counts: {
    inbox: number;
    unread: number;
    drafts: number;
    starred: number;
  };
}

const folders = [
  { id: "inbox" as const, label: "All Inboxes", icon: Inbox, showCount: true, countKey: "inbox" as const },
  { id: "unread" as const, label: "Unread", icon: AlertCircle, showCount: true, countKey: "unread" as const },
  { id: "starred" as const, label: "Starred", icon: Star, showCount: false },
  { id: "sent" as const, label: "Sent", icon: Send, showCount: false },
  { id: "drafts" as const, label: "Drafts", icon: File, showCount: true, countKey: "drafts" as const },
  { id: "archived" as const, label: "Archive", icon: Archive, showCount: false },
  { id: "trash" as const, label: "Trash", icon: Trash2, showCount: false },
];

export default function MailSidebar({
  selectedFolder,
  onFolderSelect,
  counts,
}: MailSidebarProps) {
  return (
    <div className="w-56 border-r bg-muted/30 flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-foreground">Mailboxes</h2>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {folders.map((folder) => {
          const Icon = folder.icon;
          const count = folder.showCount && folder.countKey ? counts[folder.countKey] : 0;
          const isSelected = selectedFolder === folder.id;

          return (
            <Button
              key={folder.id}
              variant={isSelected ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-9",
                isSelected && "bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
              )}
              onClick={() => onFolderSelect(folder.id)}
            >
              <Icon className={cn("h-4 w-4", isSelected ? "text-white" : "text-muted-foreground")} />
              <span className="flex-1 text-left">{folder.label}</span>
              {folder.showCount && count > 0 && (
                <Badge
                  variant={isSelected ? "outline" : "secondary"}
                  className={cn(
                    "ml-auto text-xs",
                    isSelected && "border-white/50 text-white"
                  )}
                >
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </nav>

      <div className="p-2 border-t">
        <div className="px-3 py-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3 inline mr-1" />
          Updated just now
        </div>
      </div>
    </div>
  );
}
