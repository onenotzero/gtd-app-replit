import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TaskStatus, type Task, type Context, type Project, type InsertContext, type InsertTask, insertContextSchema, insertTaskSchema } from "@shared/schema";
import TaskList from "@/components/task-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function NextActions() {
  const [isContextDialogOpen, setIsContextDialogOpen] = useState(false);
  const [editingContextId, setEditingContextId] = useState<number | null>(null);
  const [isTaskEditDialogOpen, setIsTaskEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { toast } = useToast();

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/status/next_action"],
  });

  const { data: contexts } = useQuery<Context[]>({
    queryKey: ["/api/contexts"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const contextForm = useForm({
    resolver: zodResolver(insertContextSchema),
    defaultValues: {
      name: "",
      color: "#4CAF50",
    },
  });

  const taskForm = useForm({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: TaskStatus.NEXT_ACTION,
    },
  });

  const createContext = useMutation({
    mutationFn: async (context: InsertContext) => {
      const res = await apiRequest("POST", "/api/contexts", context);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contexts"] });
      setIsContextDialogOpen(false);
      contextForm.reset();
      toast({
        title: "Context created",
        description: "New context has been added",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create context",
        description: error.message || "An error occurred while creating the context",
        variant: "destructive",
      });
    },
  });

  const updateTask = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      if (!editingTask) return;
      const res = await apiRequest("PATCH", `/api/tasks/${editingTask.id}`, task);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/next_action"] });
      setIsTaskEditDialogOpen(false);
      setEditingTask(null);
      taskForm.reset();
      toast({
        title: "Task updated",
        description: "Task has been updated successfully",
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

  const getTasksByContext = (contextId: number) => {
    return tasks?.filter((task) => task.contextId === contextId) || [];
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    taskForm.reset({
      title: task.title,
      description: task.description || "",
      status: task.status as any,
    });
    setIsTaskEditDialogOpen(true);
  };

  const handleTaskSubmit = (data: Partial<InsertTask>) => {
    updateTask.mutate(data);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Next Actions</h2>
        <p className="text-muted-foreground">
          View and manage your next actions by context
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {contexts?.map((context) => (
            <TabsTrigger key={context.id} value={context.id.toString()}>
              {context.name}
            </TabsTrigger>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2"
            onClick={() => setIsContextDialogOpen(true)}
            data-testid="button-add-context"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </TabsList>

        <TabsContent value="all">
          <TaskList
            tasks={tasks || []}
            contexts={contexts}
            projects={projects}
            onEdit={handleEditTask}
          />
        </TabsContent>

        {contexts?.map((context) => (
          <TabsContent key={context.id} value={context.id.toString()}>
            <TaskList
              tasks={getTasksByContext(context.id)}
              contexts={contexts}
              projects={projects}
              onEdit={handleEditTask}
            />
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={isContextDialogOpen} onOpenChange={setIsContextDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Context</DialogTitle>
          </DialogHeader>
          <Form {...contextForm}>
            <form
              onSubmit={contextForm.handleSubmit((data) => {
                createContext.mutate(data);
              })}
              className="space-y-4"
            >
              <FormField
                control={contextForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., @errands" data-testid="input-context-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={contextForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input type="color" {...field} data-testid="input-context-color" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={createContext.isPending} data-testid="button-submit-context">
                {createContext.isPending ? "Creating..." : "Create Context"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isTaskEditDialogOpen} onOpenChange={setIsTaskEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <Form {...taskForm}>
            <form
              onSubmit={taskForm.handleSubmit(handleTaskSubmit)}
              className="space-y-4"
            >
              <FormField
                control={taskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Task title" data-testid="input-task-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={taskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Task description" data-testid="textarea-task-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={updateTask.isPending} data-testid="button-submit-task-edit">
                {updateTask.isPending ? "Saving..." : "Save Task"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
