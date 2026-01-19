import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Context, type Task, type Project, type InsertContext, TaskStatus, TimeEstimate, EnergyLevel } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContextSchema } from "@shared/schema";
import { Trash2, Edit, Tag, Clock, Zap, FolderOpen, Filter, Plus, X } from "lucide-react";
import TaskList from "@/components/task-list";

type FilterType = "context" | "timeEstimate" | "energyLevel" | "project";
type ActiveFilter = {
  type: FilterType;
  value: string | number;
  label: string;
};

type ContextFormValues = InsertContext;

export default function Contexts() {
  const { toast } = useToast();
  const [isContextDialogOpen, setIsContextDialogOpen] = useState(false);
  const [selectedContext, setSelectedContext] = useState<Context | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  const { data: contexts } = useQuery<Context[]>({
    queryKey: ["/api/contexts"],
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const form = useForm({
    resolver: zodResolver(insertContextSchema),
    defaultValues: {
      name: "",
      color: "#4CAF50",
    },
  });

  const createContext = useMutation({
    mutationFn: async (context: ContextFormValues) => {
      const res = await apiRequest("POST", "/api/contexts", context);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contexts"] });
      setIsContextDialogOpen(false);
      form.reset();
      toast({
        title: "Context created",
        description: "New context has been added",
      });
    },
  });

  const updateContext = useMutation({
    mutationFn: async ({ id, ...context }: ContextFormValues & { id: number }) => {
      const res = await apiRequest("PATCH", `/api/contexts/${id}`, context);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contexts"] });
      setIsContextDialogOpen(false);
      setSelectedContext(null);
      form.reset();
      toast({
        title: "Context updated",
        description: "Changes have been saved",
      });
    },
  });

  const deleteContext = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/contexts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contexts"] });
      toast({
        title: "Context deleted",
        description: "Context has been removed",
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

  const handleEditContext = (context: Context) => {
    setSelectedContext(context);
    form.reset(context);
    setIsContextDialogOpen(true);
  };

  const toggleFilter = (type: FilterType, value: string | number, label: string) => {
    const exists = activeFilters.find(f => f.type === type && f.value === value);
    if (exists) {
      setActiveFilters(activeFilters.filter(f => !(f.type === type && f.value === value)));
    } else {
      setActiveFilters([...activeFilters, { type, value, label }]);
    }
  };

  const isFilterActive = (type: FilterType, value: string | number) => {
    return activeFilters.some(f => f.type === type && f.value === value);
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  const nextActionTasks = tasks?.filter(t => t.status === TaskStatus.NEXT_ACTION) || [];
  
  const filteredTasks = activeFilters.length === 0 
    ? nextActionTasks 
    : nextActionTasks.filter(task => {
        return activeFilters.every(filter => {
          switch (filter.type) {
            case "context":
              return task.contextId === filter.value;
            case "timeEstimate":
              return task.timeEstimate === filter.value;
            case "energyLevel":
              return task.energyLevel === filter.value;
            case "project":
              return task.projectId === filter.value;
            default:
              return true;
          }
        });
      });

  const getTaskCountForFilter = (type: FilterType, value: string | number) => {
    return nextActionTasks.filter(task => {
      switch (type) {
        case "context":
          return task.contextId === value;
        case "timeEstimate":
          return task.timeEstimate === value;
        case "energyLevel":
          return task.energyLevel === value;
        case "project":
          return task.projectId === value;
        default:
          return false;
      }
    }).length;
  };

  const timeEstimates = [
    { value: TimeEstimate.MINUTES_15, label: "15 min" },
    { value: TimeEstimate.MINUTES_30, label: "30 min" },
    { value: TimeEstimate.HOUR_1, label: "1 hour" },
    { value: TimeEstimate.HOURS_2_PLUS, label: "2+ hours" },
  ];

  const energyLevels = [
    { value: EnergyLevel.HIGH, label: "High Energy" },
    { value: EnergyLevel.MEDIUM, label: "Medium Energy" },
    { value: EnergyLevel.LOW, label: "Low Energy" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Action Filters</h2>
          <p className="text-muted-foreground">
            Filter your next actions by context, time, energy, or project
          </p>
        </div>
        <Button onClick={() => setIsContextDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Context
        </Button>
      </div>

      {activeFilters.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Active Filters
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter, index) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => toggleFilter(filter.type, filter.value, filter.label)}
                >
                  {filter.label}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Contexts
            </CardTitle>
            <CardDescription>Filter by location or tool</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {contexts?.map((context) => (
              <div
                key={context.id}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                  isFilterActive("context", context.id) 
                    ? "bg-primary/20 border border-primary" 
                    : "hover:bg-muted"
                }`}
                onClick={() => toggleFilter("context", context.id, context.name)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: context.color }}
                  />
                  <span className="font-medium">{context.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getTaskCountForFilter("context", context.id)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditContext(context);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteContext.mutate(context.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Available
            </CardTitle>
            <CardDescription>Filter by time estimate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {timeEstimates.map((time) => (
              <div
                key={time.value}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                  isFilterActive("timeEstimate", time.value) 
                    ? "bg-primary/20 border border-primary" 
                    : "hover:bg-muted"
                }`}
                onClick={() => toggleFilter("timeEstimate", time.value, time.label)}
              >
                <span className="font-medium">{time.label}</span>
                <Badge variant="outline" className="text-xs">
                  {getTaskCountForFilter("timeEstimate", time.value)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Energy Level
            </CardTitle>
            <CardDescription>Filter by energy required</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {energyLevels.map((energy) => (
              <div
                key={energy.value}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                  isFilterActive("energyLevel", energy.value) 
                    ? "bg-primary/20 border border-primary" 
                    : "hover:bg-muted"
                }`}
                onClick={() => toggleFilter("energyLevel", energy.value, energy.label)}
              >
                <span className="font-medium">{energy.label}</span>
                <Badge variant="outline" className="text-xs">
                  {getTaskCountForFilter("energyLevel", energy.value)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Projects
            </CardTitle>
            <CardDescription>Filter by project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {projects?.filter(p => p.isActive).map((project) => (
              <div
                key={project.id}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                  isFilterActive("project", project.id) 
                    ? "bg-primary/20 border border-primary" 
                    : "hover:bg-muted"
                }`}
                onClick={() => toggleFilter("project", project.id, project.name)}
              >
                <span className="font-medium truncate flex-1">{project.name}</span>
                <Badge variant="outline" className="text-xs ml-2">
                  {getTaskCountForFilter("project", project.id)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Filtered Actions
            <Badge variant="secondary">{filteredTasks.length} tasks</Badge>
          </CardTitle>
          <CardDescription>
            {activeFilters.length === 0 
              ? "All next actions - click filters above to narrow down" 
              : `Showing tasks matching: ${activeFilters.map(f => f.label).join(", ")}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTasks.length > 0 ? (
            <TaskList 
              tasks={filteredTasks} 
              contexts={contexts} 
              projects={projects}
              onMarkDone={(taskId) => markTaskDone.mutate(taskId)}
            />
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No tasks match the selected filters
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isContextDialogOpen} onOpenChange={setIsContextDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedContext ? "Edit Context" : "Create Context"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => {
                if (selectedContext) {
                  updateContext.mutate({ ...data, id: selectedContext.id });
                } else {
                  createContext.mutate(data);
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
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input type="color" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit">
                {selectedContext ? "Update Context" : "Create Context"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
