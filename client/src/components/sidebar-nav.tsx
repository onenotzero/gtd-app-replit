import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  Menu,
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

function NavigationContent({ onNavigate }: { onNavigate?: () => void }) {
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
    <nav className="space-y-1">
      {mainNavItems.map(({ href, label, icon: Icon, showCount }) => (
        <Link key={href} href={href}>
          <Button
            onClick={onNavigate}
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
            onClick={onNavigate}
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
  );
}

export default function SidebarNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">GTD</h1>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 px-3">
            <SheetHeader className="mb-4">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <NavigationContent onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 border-r bg-card px-3 py-4">
        <div className="mb-4 px-4">
          <h1 className="text-2xl font-bold">GTD</h1>
        </div>
        <NavigationContent />
      </div>
    </>
  );
}
