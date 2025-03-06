import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Project, type Task } from "@shared/schema";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema } from "@shared/schema";
import TaskList from "@/components/task-list";
import { Trash2, Edit } from "lucide-react";

export default function Projects() {
  const { toast } = useToast();
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const form = useForm({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  const createProject = useMutation({
    mutationFn: async (project) => {
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
    mutationFn: async ({ id, ...project }) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}`, project);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsProjectDialogOpen(false);
      setSelectedProject(null);
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

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    form.reset(project);
    setIsProjectDialogOpen(true);
  };

  const getProjectTasks = (projectId: number) => {
    return tasks?.filter((task) => task.projectId === projectId) || [];
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
        {projects?.map((project) => (
          <Card key={project.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>{project.name}</CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditProject(project)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
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
              <TaskList tasks={getProjectTasks(project.id)} />
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
                      <Textarea {...field} />
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
    </div>
  );
}
