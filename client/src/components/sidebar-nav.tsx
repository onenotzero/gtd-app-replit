import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Inbox,
  ListTodo,
  FolderOpen,
  Tag,
  Layout,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: Layout },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/next-actions", label: "Next Actions", icon: ListTodo },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/contexts", label: "Contexts", icon: Tag },
];

export default function SidebarNav() {
  const [location] = useLocation();

  return (
    <div className="w-64 border-r bg-card px-3 py-4">
      <div className="mb-4 px-4">
        <h1 className="text-2xl font-bold">GTD App</h1>
      </div>
      <nav className="space-y-2">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Button
              variant={location === href ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                location === href && "bg-secondary"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          </Link>
        ))}
      </nav>
    </div>
  );
}
