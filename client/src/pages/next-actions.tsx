import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TaskStatus, TimeEstimate, EnergyLevel, type Task, type Context, type Project, type InsertContext, insertContextSchema } from "@shared/schema";
import TaskList from "@/components/task-list";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const TIME_LABELS = [
  { value: TimeEstimate.MINUTES_15, label: "15 min" },
  { value: TimeEstimate.MINUTES_30, label: "30 min" },
  { value: TimeEstimate.HOUR_1, label: "1 hour" },
  { value: TimeEstimate.HOURS_2_PLUS, label: "2+ hours" },
];

const ENERGY_LABELS = [
  { value: EnergyLevel.HIGH, label: "High Energy" },
  { value: EnergyLevel.MEDIUM, label: "Medium Energy" },
  { value: EnergyLevel.LOW, label: "Low Energy" },
];

const taskEditSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  status: z.string(),
  contextId: z.number().nullable(),
  projectId: z.number().nullable(),
  timeEstimate: z.string().optional(),
  energyLevel: z.string().optional(),
  waitingFor: z.string(),
  waitingForFollowUp: z.date().nullable(),
  referenceCategory: z.string(),
  notes: z.string(),
  dueDate: z.date().nullable(),
});

type TaskFormValues = z.infer<typeof taskEditSchema>;

export default function NextActions() {
  const [isContextDialogOpen, setIsContextDialogOpen] = useState(false);
  const [isTaskEditDialogOpen, setIsTaskEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedContext, setSelectedContext] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedEnergy, setSelectedEnergy] = useState<string | null>(null);
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

  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskEditSchema),
    defaultValues: {
      title: "",
      description: "",
      status: TaskStatus.NEXT_ACTION,
      contextId: null as number | null,
      projectId: null as number | null,
      timeEstimate: undefined,
      energyLevel: undefined,
      waitingFor: "",
      waitingForFollowUp: null,
      referenceCategory: "",
      notes: "",
      dueDate: null,
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
  });

  const markTaskDone = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, { status: TaskStatus.DONE });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/next_action"] });
      toast({
        title: "Task completed",
        description: "Task has been marked as done",
      });
    },
  });

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    taskForm.reset({
      title: task.title,
      description: task.description || "",
      status: task.status,
      contextId: task.contextId,
      projectId: task.projectId,
      timeEstimate: task.timeEstimate || undefined,
      energyLevel: task.energyLevel || undefined,
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

  const toggleContext = (contextId: number) => {
    setSelectedContext(selectedContext === contextId ? null : contextId);
  };

  const toggleTime = (time: string) => {
    setSelectedTime(selectedTime === time ? null : time);
  };

  const toggleEnergy = (energy: string) => {
    setSelectedEnergy(selectedEnergy === energy ? null : energy);
  };

  const clearAllFilters = () => {
    setSelectedProject(null);
    setSelectedContext(null);
    setSelectedTime(null);
    setSelectedEnergy(null);
  };

  const hasActiveFilters = selectedProject !== null || selectedContext !== null || selectedTime !== null || selectedEnergy !== null;

  const filteredTasks = (tasks || []).filter((task) => {
    if (selectedProject !== null && task.projectId !== selectedProject) return false;
    if (selectedContext !== null && task.contextId !== selectedContext) return false;
    if (selectedTime !== null && task.timeEstimate !== selectedTime) return false;
    if (selectedEnergy !== null && task.energyLevel !== selectedEnergy) return false;
    return true;
  });

  const activeProjects = (projects || []).filter(p => p.isActive);

  const getContextTaskCount = (contextId: number) => {
    return (tasks || []).filter(t => t.contextId === contextId).length;
  };

  const getTimeTaskCount = (time: string) => {
    return (tasks || []).filter(t => t.timeEstimate === time).length;
  };

  const getEnergyTaskCount = (energy: string) => {
    return (tasks || []).filter(t => t.energyLevel === energy).length;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Next Actions</h2>
        <p className="text-muted-foreground">
          {filteredTasks.length} action{filteredTasks.length !== 1 ? 's' : ''} ready to do
        </p>
      </div>

      {/* Filter Rows */}
      <div className="space-y-3">
        {/* Project Row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground w-20">Project:</span>
          <Select 
            value={selectedProject?.toString() || "all"} 
            onValueChange={(val) => setSelectedProject(val === "all" ? null : Number(val))}
          >
            <SelectTrigger className="w-48 h-8">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {activeProjects.map((proj) => (
                <SelectItem key={proj.id} value={proj.id.toString()}>
                  {proj.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Contexts Row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground w-20">Context:</span>
          {contexts?.map((ctx) => (
            <Badge
              key={ctx.id}
              variant={selectedContext === ctx.id ? "default" : "outline"}
              className="cursor-pointer hover:bg-accent"
              style={selectedContext === ctx.id ? {} : { borderColor: ctx.color || undefined }}
              onClick={() => toggleContext(ctx.id)}
            >
              {ctx.name} ({getContextTaskCount(ctx.id)})
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={() => setIsContextDialogOpen(true)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Time Row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground w-20">Time:</span>
          {TIME_LABELS.map((time) => (
            <Badge
              key={time.value}
              variant={selectedTime === time.value ? "default" : "outline"}
              className="cursor-pointer hover:bg-accent"
              onClick={() => toggleTime(time.value)}
            >
              {time.label} ({getTimeTaskCount(time.value)})
            </Badge>
          ))}
        </div>

        {/* Energy Row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground w-20">Energy:</span>
          {ENERGY_LABELS.map((energy) => (
            <Badge
              key={energy.value}
              variant={selectedEnergy === energy.value ? "default" : "outline"}
              className="cursor-pointer hover:bg-accent"
              onClick={() => toggleEnergy(energy.value)}
            >
              {energy.label} ({getEnergyTaskCount(energy.value)})
            </Badge>
          ))}
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Active Filters:</span>
          {selectedProject !== null && (
            <Badge variant="secondary" className="gap-1">
              {projects?.find(p => p.id === selectedProject)?.name}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedProject(null)} />
            </Badge>
          )}
          {selectedContext !== null && (
            <Badge variant="secondary" className="gap-1">
              {contexts?.find(c => c.id === selectedContext)?.name}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedContext(null)} />
            </Badge>
          )}
          {selectedTime !== null && (
            <Badge variant="secondary" className="gap-1">
              {TIME_LABELS.find(t => t.value === selectedTime)?.label}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedTime(null)} />
            </Badge>
          )}
          {selectedEnergy !== null && (
            <Badge variant="secondary" className="gap-1">
              {ENERGY_LABELS.find(e => e.value === selectedEnergy)?.label}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedEnergy(null)} />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear All
          </Button>
        </div>
      )}

      {/* Task List */}
      {filteredTasks.length > 0 ? (
        <TaskList
          tasks={filteredTasks}
          contexts={contexts}
          projects={projects}
          onEdit={handleEditTask}
          onMarkDone={(taskId) => markTaskDone.mutate(taskId)}
        />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {hasActiveFilters ? "No actions match the selected filters" : "No next actions - process your inbox"}
          </CardContent>
        </Card>
      )}

      {/* Create Context Dialog */}
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

      {/* Edit Task Dialog */}
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

              {taskForm.watch("status") === TaskStatus.REFERENCE && (
                <FormField
                  control={taskForm.control}
                  name="referenceCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference Category</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Health, Finance, Contacts" data-testid="input-reference-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
