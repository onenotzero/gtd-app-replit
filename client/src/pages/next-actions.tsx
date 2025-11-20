import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TaskStatus, type Task, type Context, type Project, type InsertContext, insertContextSchema } from "@shared/schema";
import TaskList from "@/components/task-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function NextActions() {
  const [isContextDialogOpen, setIsContextDialogOpen] = useState(false);
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

  const form = useForm({
    resolver: zodResolver(insertContextSchema),
    defaultValues: {
      name: "",
      color: "#4CAF50",
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
      form.reset();
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

  const getTasksByContext = (contextId: number) => {
    return tasks?.filter((task) => task.contextId === contextId) || [];
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
          />
        </TabsContent>

        {contexts?.map((context) => (
          <TabsContent key={context.id} value={context.id.toString()}>
            <TaskList
              tasks={getTasksByContext(context.id)}
              contexts={contexts}
              projects={projects}
            />
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={isContextDialogOpen} onOpenChange={setIsContextDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Context</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => {
                createContext.mutate(data);
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
                      <Input {...field} placeholder="e.g., @errands" data-testid="input-context-name" />
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
    </div>
  );
}
