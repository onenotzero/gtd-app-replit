import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TaskStatus, type Task, type Context, type Project } from "@shared/schema";
import TaskList from "@/components/task-list";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Done() {
  const { toast } = useToast();
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/status/done"],
  });

  const { data: contexts } = useQuery<Context[]>({
    queryKey: ["/api/contexts"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const updateTask = useMutation({
    mutationFn: async (task: Partial<Task> & { id: number }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${task.id}`, task);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/done"] });
      toast({
        title: "Task moved",
        description: "Task has been moved back to Next Actions",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update task",
        description: error.message || "An error occurred while updating the task",
        variant: "destructive",
      });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/done"] });
      setDeletingTask(null);
      toast({
        title: "Task deleted",
        description: "Task has been permanently deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete task",
        description: error.message || "An error occurred while deleting the task",
        variant: "destructive",
      });
    },
  });

  const handleUndone = (task: Task) => {
    updateTask.mutate({ id: task.id, status: TaskStatus.NEXT_ACTION });
  };

  const handleDelete = (task: Task) => {
    setDeletingTask(task);
  };

  const confirmDelete = () => {
    if (deletingTask) {
      deleteTask.mutate(deletingTask.id);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Completed</h2>
        <p className="text-muted-foreground">
          Tasks you've finished - celebrate your accomplishments!
        </p>
      </div>

      <div className="space-y-4">
        {!tasks || tasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No completed tasks yet</p>
              <p className="text-sm text-muted-foreground">
                Completed tasks will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <TaskList
            tasks={tasks}
            contexts={contexts}
            projects={projects}
            onEdit={handleUndone}
            onDelete={handleDelete}
            editButtonText="Mark Undone"
          />
        )}
      </div>

      <Dialog open={!!deletingTask} onOpenChange={() => setDeletingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete "{deletingTask?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingTask(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteTask.isPending}
            >
              {deleteTask.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
