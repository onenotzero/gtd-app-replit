import { useQuery } from "@tanstack/react-query";
import { type Task, type Context, type Project } from "@shared/schema";
import TaskList from "@/components/task-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function WaitingFor() {
  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/status/waiting"],
  });

  const { data: contexts } = useQuery<Context[]>({
    queryKey: ["/api/contexts"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

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
          />
        )}
      </div>
    </div>
  );
}
