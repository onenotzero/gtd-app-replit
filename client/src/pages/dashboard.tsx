import { useQuery } from "@tanstack/react-query";
import { Task, TaskStatus, type Context, type Project } from "@shared/schema";
import TaskList from "@/components/task-list";

export default function Dashboard() {
  const { data: tasks = [] } = useQuery<Task[]>({ 
    queryKey: ["/api/tasks"],
  });

  const { data: contexts = [] } = useQuery<Context[]>({ 
    queryKey: ["/api/contexts"],
  });

  const { data: projects = [] } = useQuery<Project[]>({ 
    queryKey: ["/api/projects"],
  });

  const nextActions = tasks.filter(
    (task) => task.status === TaskStatus.NEXT_ACTION
  );

  const waiting = tasks.filter(
    (task) => task.status === TaskStatus.WAITING
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your next actions and waiting items
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="text-xl font-semibold mb-4">Next Actions</h3>
          <TaskList
            tasks={nextActions}
            contexts={contexts}
            projects={projects}
          />
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Waiting For</h3>
          <TaskList
            tasks={waiting}
            contexts={contexts}
            projects={projects}
          />
        </div>
      </div>
    </div>
  );
}