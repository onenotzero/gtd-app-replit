import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TaskStatus, TimeEstimate, EnergyLevel, type Task, type Context, type Project, insertTaskSchema } from "@shared/schema";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export default function Incubate() {
  const { toast } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isTaskEditDialogOpen, setIsTaskEditDialogOpen] = useState(false);

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/status/someday"],
  });

  const { data: contexts } = useQuery<Context[]>({
    queryKey: ["/api/contexts"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const taskEditSchema = insertTaskSchema.extend({
    contextId: z.number().nullable().optional(),
    projectId: z.number().nullable().optional(),
    status: z.string().optional(),
    dueDate: z.coerce.date().nullable().optional(),
    waitingForFollowUp: z.coerce.date().nullable().optional(),
  });

  const taskForm = useForm({
    resolver: zodResolver(taskEditSchema),
    defaultValues: {
      title: "",
      description: "",
      status: TaskStatus.SOMEDAY,
      contextId: null,
      projectId: null,
      timeEstimate: undefined,
      energyLevel: undefined,
      waitingFor: "",
      referenceCategory: "",
      notes: "",
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/someday"] });
      toast({
        title: "Item deleted",
        description: "Incubate item has been deleted",
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
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/someday"] });
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

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    taskForm.reset({
      title: task.title,
      description: task.description || "",
      status: task.status,
      contextId: task.contextId || null,
      projectId: task.projectId || null,
      timeEstimate: task.timeEstimate,
      energyLevel: task.energyLevel,
      waitingFor: task.waitingFor || "",
      waitingForFollowUp: task.waitingForFollowUp ? new Date(task.waitingForFollowUp) : null,
      referenceCategory: task.referenceCategory || "",
      notes: task.notes || "",
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
    });
    setIsTaskEditDialogOpen(true);
  };

  const handleTaskSubmit = (data: any) => {
    updateTask.mutate(data);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Incubate</h2>
        <p className="text-muted-foreground">
          Items to revisit later (Someday/Maybe list)
        </p>
      </div>

      <TaskList
        tasks={tasks || []}
        contexts={contexts}
        projects={projects}
        onEdit={handleEditTask}
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

      <Dialog open={isTaskEditDialogOpen} onOpenChange={setIsTaskEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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

              <FormField
                control={taskForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-task-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TaskStatus.INBOX}>Inbox</SelectItem>
                        <SelectItem value={TaskStatus.NEXT_ACTION}>Next Action</SelectItem>
                        <SelectItem value={TaskStatus.WAITING}>Waiting For</SelectItem>
                        <SelectItem value={TaskStatus.SOMEDAY}>Someday/Maybe</SelectItem>
                        <SelectItem value={TaskStatus.REFERENCE}>Reference</SelectItem>
                        <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                        <SelectItem value={TaskStatus.TRASH}>Trash</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={taskForm.control}
                name="contextId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Context</FormLabel>
                    <Select value={field.value ? field.value.toString() : ""} onValueChange={(val) => field.onChange(val ? Number(val) : null)}>
                      <FormControl>
                        <SelectTrigger data-testid="select-task-context">
                          <SelectValue placeholder="Select context" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contexts?.map((ctx) => (
                          <SelectItem key={ctx.id} value={ctx.id.toString()}>
                            {ctx.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={taskForm.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select value={field.value ? field.value.toString() : ""} onValueChange={(val) => field.onChange(val ? Number(val) : null)}>
                      <FormControl>
                        <SelectTrigger data-testid="select-task-project">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects?.map((proj) => (
                          <SelectItem key={proj.id} value={proj.id.toString()}>
                            {proj.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={taskForm.control}
                name="timeEstimate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Estimate</FormLabel>
                    <Select value={field.value || "unset"} onValueChange={(val) => field.onChange(val === "unset" ? undefined : val)}>
                      <FormControl>
                        <SelectTrigger data-testid="select-time-estimate">
                          <SelectValue placeholder="Select time estimate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unset">None</SelectItem>
                        <SelectItem value={TimeEstimate.MINUTES_15}>15 minutes</SelectItem>
                        <SelectItem value={TimeEstimate.MINUTES_30}>30 minutes</SelectItem>
                        <SelectItem value={TimeEstimate.HOUR_1}>1 hour</SelectItem>
                        <SelectItem value={TimeEstimate.HOURS_2_PLUS}>2+ hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={taskForm.control}
                name="energyLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Energy Level</FormLabel>
                    <Select value={field.value || "unset"} onValueChange={(val) => field.onChange(val === "unset" ? undefined : val)}>
                      <FormControl>
                        <SelectTrigger data-testid="select-energy-level">
                          <SelectValue placeholder="Select energy level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unset">None</SelectItem>
                        <SelectItem value={EnergyLevel.HIGH}>High</SelectItem>
                        <SelectItem value={EnergyLevel.MEDIUM}>Medium</SelectItem>
                        <SelectItem value={EnergyLevel.LOW}>Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={taskForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                        data-testid="input-due-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {taskForm.watch("status") === TaskStatus.SOMEDAY && (
                <FormField
                  control={taskForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Notes for this someday/maybe item" data-testid="textarea-someday-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
