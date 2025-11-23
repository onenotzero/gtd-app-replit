import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, TaskStatus, Email, type Context, type Project } from "@shared/schema";
import TaskList from "@/components/task-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Inbox, ListTodo, Clock, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";

type InsertTask = Omit<Task, 'id'>;

export default function Dashboard() {
  const [quickCapture, setQuickCapture] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: tasks = [] } = useQuery<Task[]>({ 
    queryKey: ["/api/tasks"],
  });

  const { data: emails = [] } = useQuery<Email[]>({ 
    queryKey: ["/api/emails"],
  });

  const { data: contexts = [] } = useQuery<Context[]>({ 
    queryKey: ["/api/contexts"],
  });

  const { data: projects = [] } = useQuery<Project[]>({ 
    queryKey: ["/api/projects"],
  });

  const inboxTasks = tasks.filter(t => t.status === TaskStatus.INBOX);
  const unprocessedEmails = emails.filter(e => !e.processed);
  const nextActions = tasks.filter(t => t.status === TaskStatus.NEXT_ACTION);
  const waiting = tasks.filter(t => t.status === TaskStatus.WAITING);

  const quickCaptureMutation = useMutation({
    mutationFn: async (title: string) => {
      const task: InsertTask = {
        title,
        status: TaskStatus.INBOX,
        description: null,
        dueDate: null,
        projectId: null,
        contextId: null,
        emailId: null,
        deferCount: 0,
        timeEstimate: null,
        energyLevel: null,
        waitingFor: null,
        waitingForFollowUp: null,
        referenceCategory: null,
        notes: null,
      };
      const res = await apiRequest("POST", "/api/tasks", task);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/inbox"] });
      setQuickCapture("");
      toast({
        title: "Task captured",
        description: "Added to inbox for processing",
      });
    },
    onError: () => {
      toast({
        title: "Failed to capture task",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleQuickCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickCapture.trim()) {
      quickCaptureMutation.mutate(quickCapture.trim());
    }
  };

  const totalUnprocessed = inboxTasks.length + unprocessedEmails.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Your GTD control center
        </p>
      </div>

      {totalUnprocessed > 0 && (
        <Alert variant="destructive" data-testid="alert-unprocessed-items">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {totalUnprocessed} unprocessed {totalUnprocessed === 1 ? 'item' : 'items'} require your attention
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation('/inbox')}
              data-testid="button-go-to-inbox"
            >
              Go to Inbox
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleQuickCapture}>
        <Card data-testid="card-quick-capture">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                placeholder="Quick capture - what's on your mind?"
                value={quickCapture}
                onChange={(e) => setQuickCapture(e.target.value)}
                className="flex-1"
                data-testid="input-quick-capture"
              />
              <Button 
                type="submit" 
                disabled={!quickCapture.trim() || quickCaptureMutation.isPending}
                data-testid="button-quick-capture"
              >
                <Plus className="h-4 w-4 mr-2" />
                Capture
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-inbox-count">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inbox</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-inbox-count">{totalUnprocessed}</div>
            <p className="text-xs text-muted-foreground">Items to process</p>
          </CardContent>
        </Card>

        <Card data-testid="card-next-actions-count">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Next Actions</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-next-actions-count">{nextActions.length}</div>
            <p className="text-xs text-muted-foreground">Ready to do</p>
          </CardContent>
        </Card>

        <Card data-testid="card-waiting-count">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Waiting For</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-waiting-count">{waiting.length}</div>
            <p className="text-xs text-muted-foreground">Delegated items</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold mb-3">Next Actions</h3>
          <TaskList
            tasks={nextActions.slice(0, 5)}
            contexts={contexts}
            projects={projects}
          />
          {nextActions.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No next actions - process your inbox
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Waiting For</h3>
          <TaskList
            tasks={waiting.slice(0, 5)}
            contexts={contexts}
            projects={projects}
          />
          {waiting.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nothing waiting
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}