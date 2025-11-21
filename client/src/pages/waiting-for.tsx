import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TaskStatus, TimeEstimate, EnergyLevel, type Task, type Context, type Project, insertTaskSchema } from "@shared/schema";
import TaskList from "@/components/task-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export default function WaitingFor() {
  const { toast } = useToast();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isTaskEditDialogOpen, setIsTaskEditDialogOpen] = useState(false);

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/status/waiting"],
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
      status: TaskStatus.WAITING,
      contextId: null,
      projectId: null,
      timeEstimate: undefined,
      energyLevel: undefined,
      waitingFor: "",
      referenceCategory: "",
      notes: "",
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
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/waiting"] });
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

  const sortedTasks = tasks?.sort((a, b) => {
    if (!a.waitingForFollowUp) return 1;
    if (!b.waitingForFollowUp) return -1;
    return new Date(a.waitingForFollowUp).getTime() - new Date(b.waitingForFollowUp).getTime();
  }) || [];

  const overdueCount = sortedTasks.filter(task => {
    if (!task.waitingForFollowUp) return false;
    return new Date(task.waitingForFollowUp) < new Date();
  }).length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Waiting For</h2>
        <p className="text-muted-foreground">
          Tasks delegated to others or waiting on external responses
        </p>
      </div>

      {overdueCount > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Clock className="h-5 w-5" />
              {overdueCount} Overdue Follow-up{overdueCount !== 1 ? 's' : ''}
            </CardTitle>
            <CardDescription>
              These items need your attention - their follow-up dates have passed
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="space-y-4">
        {sortedTasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No items waiting</p>
              <p className="text-sm text-muted-foreground">
                Delegated tasks and items waiting on others will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <TaskList
            tasks={sortedTasks}
            contexts={contexts}
            projects={projects}
            onEdit={handleEditTask}
          />
        )}
      </div>

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

              {taskForm.watch("status") === TaskStatus.WAITING && (
                <>
                  <FormField
                    control={taskForm.control}
                    name="waitingFor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Waiting For</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Person or resource" data-testid="input-waiting-for" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="waitingForFollowUp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Follow-up Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                            data-testid="input-followup-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
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
