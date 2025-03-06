import { Task, Context, Project } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Edit } from "lucide-react";

interface TaskListProps {
  tasks: Task[];
  contexts?: Context[];
  projects?: Project[];
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: number) => void;
}

export default function TaskList({
  tasks,
  contexts,
  projects,
  onEdit,
  onDelete,
}: TaskListProps) {
  const getContextName = (contextId: number | null) => {
    if (!contextId || !contexts) return null;
    return contexts.find((c) => c.id === contextId)?.name;
  };

  const getProjectName = (projectId: number | null) => {
    if (!projectId || !projects) return null;
    return projects.find((p) => p.id === projectId)?.name;
  };

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg">{task.title}</CardTitle>
              <CardDescription>
                {task.description}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(task)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(task.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge variant="secondary">{task.status}</Badge>
              {task.contextId && (
                <Badge variant="outline">
                  {getContextName(task.contextId)}
                </Badge>
              )}
              {task.projectId && (
                <Badge variant="outline">
                  {getProjectName(task.projectId)}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
