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
import { Card, CardContent } from "@/components/ui/card";
import { Inbox as InboxIcon } from "lucide-react";
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
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/inbox"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/inbox"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/inbox"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/inbox"] });
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

  const totalUnprocessed = tasks.length + emails.filter(e => !e.processed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inbox</h2>
          <p className="text-muted-foreground">
            Process {totalUnprocessed} {totalUnprocessed === 1 ? 'item' : 'items'}
          </p>
        </div>
        <Button onClick={() => setIsTaskDialogOpen(true)} data-testid="button-add-task">
          Add Task
        </Button>
      </div>

      {totalUnprocessed === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <InboxIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <h3 className="text-lg font-semibold mb-2">Inbox Zero!</h3>
            <p className="text-muted-foreground">
              All items processed. Well done!
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {tasks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Tasks to Process</h3>
            <TaskList
              tasks={tasks}
              contexts={contexts}
              projects={projects}
              onEdit={handleEditTask}
              onDelete={(id) => deleteTask.mutate(id)}
            />
          </div>
        )}

        {emails.filter(e => !e.processed).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Emails to Process</h3>
            <EmailInbox
              emails={emails}
              onProcess={handleEmailProcess}
            />
          </div>
        )}
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