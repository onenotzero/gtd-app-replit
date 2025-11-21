import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Inbox,
  ListTodo,
  FolderOpen,
  Clock,
  Layout,
  Calendar,
  Archive,
  Lightbulb,
  Trash2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Task, Email, TaskStatus } from "@shared/schema";

const mainNavItems = [
  { href: "/", label: "Dashboard", icon: Layout },
  { href: "/inbox", label: "Inbox", icon: Inbox, showCount: true },
  { href: "/next-actions", label: "Next Actions", icon: ListTodo },
  { href: "/waiting-for", label: "Waiting For", icon: Clock },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/projects", label: "Projects", icon: FolderOpen },
];

const containerItems = [
  { href: "/reference", label: "Reference", icon: Archive },
  { href: "/incubate", label: "Incubate", icon: Lightbulb },
  { href: "/trash", label: "Trash", icon: Trash2 },
];

export default function SidebarNav() {
  const [location] = useLocation();

  const { data: tasks = [] } = useQuery<Task[]>({ 
    queryKey: ["/api/tasks"],
  });

  const { data: emails = [] } = useQuery<Email[]>({ 
    queryKey: ["/api/emails"],
  });

  const inboxTaskCount = tasks.filter(t => t.status === TaskStatus.INBOX).length;
  const unprocessedEmailCount = emails.filter(e => !e.processed).length;
  const totalInboxCount = inboxTaskCount + unprocessedEmailCount;

  return (
    <div className="w-64 border-r bg-card px-3 py-4">
      <div className="mb-4 px-4">
        <h1 className="text-2xl font-bold">GTD</h1>
      </div>
      <nav className="space-y-1">
        {mainNavItems.map(({ href, label, icon: Icon, showCount }) => (
          <Link key={href} href={href}>
            <Button
              variant={location === href ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                location === href && "bg-secondary"
              )}
              data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{label}</span>
              {showCount && totalInboxCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-auto"
                  data-testid="badge-inbox-count"
                >
                  {totalInboxCount}
                </Badge>
              )}
            </Button>
          </Link>
        ))}
        <div className="my-4 border-t" />
        {containerItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Button
              variant={location === href ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                location === href && "bg-secondary"
              )}
              data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{label}</span>
            </Button>
          </Link>
        ))}
      </nav>
    </div>
  );
}
