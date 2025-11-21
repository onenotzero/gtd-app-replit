import { useQuery } from "@tanstack/react-query";
import { type Task, type Context, type Project } from "@shared/schema";
import { Inbox as InboxIcon } from "lucide-react";

export default function Trash() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Trash</h2>
        <p className="text-muted-foreground">
          Deleted items are permanently removed from the system
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-12 text-center">
        <InboxIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No items in trash</p>
        <p className="text-sm text-muted-foreground mt-1">Deleted items cannot be recovered</p>
      </div>
    </div>
  );
}
