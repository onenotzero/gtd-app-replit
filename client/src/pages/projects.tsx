import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TaskStatus, TimeEstimate, EnergyLevel, type Project, type Task, type Context, type InsertProject } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import TaskList from "@/components/task-list";
import { Trash2, Check, X } from "lucide-react";
import { z } from "zod";

// Form schemas
const projectFormSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  isActive: z.boolean(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

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

export default function Projects() {
  const { toast } = useToast();
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isTaskEditDialogOpen, setIsTaskEditDialogOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: contexts } = useQuery<Context[]>({
    queryKey: ["/api/contexts"],
  });

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
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

  useEffect(() => {
    if (editingProjectId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingProjectId]);

  const createProject = useMutation({
    mutationFn: async (project: ProjectFormValues) => {
      const res = await apiRequest("POST", "/api/projects", project);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsProjectDialogOpen(false);
      form.reset();
      toast({
        title: "Project created",
        description: "New project has been added",
      });
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...project }: Partial<ProjectFormValues> & { id: number }) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}`, project);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsProjectDialogOpen(false);
      setSelectedProject(null);
      setEditingProjectId(null);
      form.reset();
      toast({
        title: "Project updated",
        description: "Changes have been saved",
      });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project deleted",
        description: "Project has been removed",
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

  const markTaskDone = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, { status: TaskStatus.DONE });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task completed",
        description: "Task has been marked as done",
      });
    },
  });

  const markProjectDone = useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiRequest("PATCH", `/api/projects/${projectId}`, { isActive: false });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project completed",
        description: "Project has been marked as done",
      });
    },
  });

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    form.reset({
      name: project.name,
      description: project.description || "",
      isActive: project.isActive,
    });
    setIsProjectDialogOpen(true);
  };

  const handleInlineEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingProjectName(project.name);
  };

  const handleSaveInlineEdit = () => {
    if (editingProjectId && editingProjectName.trim()) {
      updateProject.mutate({ id: editingProjectId, name: editingProjectName.trim() });
    }
    setEditingProjectId(null);
  };

  const handleCancelInlineEdit = () => {
    setEditingProjectId(null);
    setEditingProjectName("");
  };

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

  const getProjectTasks = (projectId: number) => {
    return tasks?.filter((task) => task.projectId === projectId && task.status !== TaskStatus.DONE) || [];
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">
            Manage and organize your projects
          </p>
        </div>
        <Button onClick={() => setIsProjectDialogOpen(true)}>
          Add Project
        </Button>
      </div>

      <div className="grid gap-6">
        {projects?.filter(p => p.isActive).map((project) => (
          <Card key={project.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="flex items-start gap-3 flex-1">
                <Checkbox
                  className="mt-1"
                  onCheckedChange={(checked) => {
                    if (checked) {
                      markProjectDone.mutate(project.id);
                    }
                  }}
                  data-testid="checkbox-project-done"
                />
                <div className="flex-1">
                  {editingProjectId === project.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        ref={editInputRef}
                        value={editingProjectName}
                        onChange={(e) => setEditingProjectName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveInlineEdit();
                          if (e.key === "Escape") handleCancelInlineEdit();
                        }}
                        className="text-lg font-semibold"
                        data-testid="input-project-name-inline"
                      />
                      <Button size="sm" variant="ghost" onClick={handleSaveInlineEdit}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelInlineEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <CardTitle 
                        className="cursor-pointer hover:opacity-70 transition-opacity"
                        onClick={() => handleInlineEditProject(project)}
                        data-testid="project-title-editable"
                      >
                        {project.name}
                      </CardTitle>
                      <CardDescription>{project.description}</CardDescription>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteProject.mutate(project.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TaskList 
                tasks={getProjectTasks(project.id)} 
                contexts={contexts} 
                projects={projects} 
                onEdit={handleEditTask}
                onMarkDone={(taskId) => markTaskDone.mutate(taskId)}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedProject ? "Edit Project" : "Create Project"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => {
                if (selectedProject) {
                  updateProject.mutate({ ...data, id: selectedProject.id });
                } else {
                  createProject.mutate(data);
                }
              })}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit">
                {selectedProject ? "Update Project" : "Create Project"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
                      <Textarea {...field} placeholder="Task description" data-testid="textarea-task-description" value={field.value || ""} />
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
                          <Input {...field} placeholder="Person or resource" data-testid="input-waiting-for" value={field.value || ""} />
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
                        <Input {...field} placeholder="e.g., Health, Finance, Contacts" data-testid="input-reference-category" value={field.value || ""} />
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
                        <Textarea {...field} placeholder="Notes for this someday/maybe item" data-testid="textarea-someday-notes" value={field.value || ""} />
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
