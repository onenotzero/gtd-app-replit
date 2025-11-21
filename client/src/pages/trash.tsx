import { useQuery, useMutation } from "@tanstack/react-query";
import { TaskStatus, type Task, type Context, type Project } from "@shared/schema";
import TaskList from "@/components/task-list";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { Inbox as InboxIcon } from "lucide-react";

export default function Trash() {
  const { toast } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/status/trash"],
  });

  const { data: contexts } = useQuery<Context[]>({
    queryKey: ["/api/contexts"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const deleteTask = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/trash"] });
      toast({
        title: "Item permanently deleted",
        description: "Item has been removed from trash",
      });
    },
  });

  if (!tasks || tasks.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Trash</h2>
          <p className="text-muted-foreground">
            Deleted items appear here
          </p>
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <InboxIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No items in trash</p>
          <p className="text-sm text-muted-foreground mt-1">Items moved to trash can be permanently deleted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Trash</h2>
        <p className="text-muted-foreground">
          Deleted items appear here
        </p>
      </div>

      <TaskList
        tasks={tasks || []}
        contexts={contexts}
        projects={projects}
        onDelete={(id) => setDeleteConfirm(id)}
      />

      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The item will be permanently deleted from trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm !== null) {
                  deleteTask.mutate(deleteConfirm);
                  setDeleteConfirm(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
