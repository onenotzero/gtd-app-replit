import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TaskStatus, type Task, type Email, type Context, type Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TaskList from "@/components/task-list";
import TaskForm from "@/components/task-form";
import EmailInbox from "@/components/email-inbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type InsertTask = Omit<Task, 'id'>;

export default function Inbox() {
  const { toast } = useToast();
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/status/inbox"],
  });

  const { data: contexts = [] } = useQuery<Context[]>({
    queryKey: ["/api/contexts"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: emails = [] } = useQuery<Email[]>({
    queryKey: ["/api/emails"],
  });

  const createTask = useMutation({
    mutationFn: async (task: InsertTask) => {
      const res = await apiRequest("POST", "/api/tasks", task);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsTaskDialogOpen(false);
      toast({
        title: "Task created",
        description: "Task has been added to your inbox",
      });
    },
  });

  const updateTask = useMutation({
    mutationFn: async (task: Task) => {
      const { id, ...data } = task;
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsTaskDialogOpen(false);
      setSelectedTask(null);
      toast({
        title: "Task updated",
        description: "Changes have been saved",
      });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task deleted",
        description: "Task has been removed",
      });
    },
  });

  const processEmail = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/emails/${id}/process`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({
        title: "Email processed",
        description: "Email has been marked as processed",
      });
    },
  });

  const handleEmailProcess = (email: Email) => {
    setIsTaskDialogOpen(true);
    processEmail.mutate(email.id);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inbox</h2>
          <p className="text-muted-foreground">
            Collect and process incoming items
          </p>
        </div>
        <Button onClick={() => setIsTaskDialogOpen(true)}>Add Task</Button>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="text-xl font-semibold mb-4">Tasks</h3>
          <TaskList
            tasks={tasks}
            contexts={contexts}
            projects={projects}
            onEdit={handleEditTask}
            onDelete={(id) => deleteTask.mutate(id)}
          />
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Emails</h3>
          <EmailInbox
            emails={emails}
            onProcess={handleEmailProcess}
          />
        </div>
      </div>

      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTask ? "Edit Task" : "Create Task"}
            </DialogTitle>
            <DialogDescription>
              Enter the details for your task below.
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            onSubmit={(data) => {
              if (selectedTask) {
                updateTask.mutate({ ...data, id: selectedTask.id });
              } else {
                createTask.mutate({ ...data, status: TaskStatus.INBOX });
              }
            }}
            defaultValues={selectedTask || undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}