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

export default function Reference() {
  const { toast } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/status/reference"],
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
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/reference"] });
      toast({
        title: "Item deleted",
        description: "Reference item has been deleted",
      });
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reference</h2>
        <p className="text-muted-foreground">
          Items saved for future reference
        </p>
      </div>

      <TaskList
        tasks={tasks || []}
        contexts={contexts}
        projects={projects}
        onDelete={(id) => setDeleteConfirm(id)}
      />

      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => deleteConfirm === null || setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The item will be permanently deleted.
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
