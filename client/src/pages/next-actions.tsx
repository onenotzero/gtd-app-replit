import { useQuery } from "@tanstack/react-query";
import { TaskStatus, type Task, type Context } from "@shared/schema";
import TaskList from "@/components/task-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NextActions() {
  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/status/next_action"],
  });

  const { data: contexts } = useQuery<Context[]>({
    queryKey: ["/api/contexts"],
  });

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
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
    </div>
  );
}
