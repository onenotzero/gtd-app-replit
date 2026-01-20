import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, TaskStatus, Context, Project, TimeEstimate, EnergyLevel, insertContextSchema, insertProjectSchema } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Inbox, 
  FolderOpen, 
  RotateCcw, 
  PlayCircle, 
  ChevronDown, 
  ChevronUp,
  Check,
  X,
  Pencil,
  Trash2
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

type InsertTask = Omit<Task, 'id'>;
type InsertContext = typeof insertContextSchema._type;
type InsertProject = typeof insertProjectSchema._type;

const TIME_LABELS = [
  { value: TimeEstimate.MINUTES_15, label: "15 min" },
  { value: TimeEstimate.MINUTES_30, label: "30 min" },
  { value: TimeEstimate.HOUR_1, label: "1 hour" },
  { value: TimeEstimate.HOURS_2_PLUS, label: "2+ hours" },
];

const ENERGY_LABELS = [
  { value: EnergyLevel.HIGH, label: "High" },
  { value: EnergyLevel.MEDIUM, label: "Medium" },
  { value: EnergyLevel.LOW, label: "Low" },
];

export default function Dashboard() {
  const [showCapture, setShowCapture] = useState(false);
  const [showOrganize, setShowOrganize] = useState(false);
  const [quickCapture, setQuickCapture] = useState("");
  const [editingContextId, setEditingContextId] = useState<number | null>(null);
  const [editingContextName, setEditingContextName] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");
  const [newContextName, setNewContextName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const contextInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: tasks = [] } = useQuery<Task[]>({ 
    queryKey: ["/api/tasks"],
  });

  const { data: contexts = [] } = useQuery<Context[]>({ 
    queryKey: ["/api/contexts"],
  });

  const { data: projects = [] } = useQuery<Project[]>({ 
    queryKey: ["/api/projects"],
  });

  useEffect(() => {
    if (editingContextId && contextInputRef.current) {
      contextInputRef.current.focus();
      contextInputRef.current.select();
    }
  }, [editingContextId]);

  useEffect(() => {
    if (editingProjectId && projectInputRef.current) {
      projectInputRef.current.focus();
      projectInputRef.current.select();
    }
  }, [editingProjectId]);

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
      setQuickCapture("");
      toast({
        title: "Task captured",
        description: "Added to inbox for processing",
      });
    },
  });

  const createContext = useMutation({
    mutationFn: async (context: InsertContext) => {
      const res = await apiRequest("POST", "/api/contexts", context);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contexts"] });
      setNewContextName("");
      toast({ title: "Context created" });
    },
  });

  const updateContext = useMutation({
    mutationFn: async ({ id, ...context }: { id: number; name: string }) => {
      const res = await apiRequest("PATCH", `/api/contexts/${id}`, context);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contexts"] });
      setEditingContextId(null);
      toast({ title: "Context updated" });
    },
  });

  const deleteContext = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/contexts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contexts"] });
      toast({ title: "Context deleted" });
    },
  });

  const createProject = useMutation({
    mutationFn: async (project: InsertProject) => {
      const res = await apiRequest("POST", "/api/projects", project);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setNewProjectName("");
      toast({ title: "Project created" });
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...project }: { id: number; name: string }) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}`, project);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setEditingProjectId(null);
      toast({ title: "Project updated" });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted" });
    },
  });

  const handleQuickCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickCapture.trim()) {
      quickCaptureMutation.mutate(quickCapture.trim());
    }
  };

  const handleAddContext = (e: React.FormEvent) => {
    e.preventDefault();
    if (newContextName.trim()) {
      createContext.mutate({ name: newContextName.trim(), color: "#6366f1" });
    }
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      createProject.mutate({ name: newProjectName.trim(), description: "", isActive: true });
    }
  };

  const startEditContext = (ctx: Context) => {
    setEditingContextId(ctx.id);
    setEditingContextName(ctx.name);
  };

  const saveContextEdit = () => {
    if (editingContextId && editingContextName.trim()) {
      updateContext.mutate({ id: editingContextId, name: editingContextName.trim() });
    }
  };

  const startEditProject = (proj: Project) => {
    setEditingProjectId(proj.id);
    setEditingProjectName(proj.name);
  };

  const saveProjectEdit = () => {
    if (editingProjectId && editingProjectName.trim()) {
      updateProject.mutate({ id: editingProjectId, name: editingProjectName.trim() });
    }
  };

  const activeProjects = projects.filter(p => p.isActive);
  const nextActions = tasks.filter(t => t.status === TaskStatus.NEXT_ACTION);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Getting Things Done</h2>
        <p className="text-muted-foreground">The 5 Steps to Stress-Free Productivity</p>
      </div>

      <div className="space-y-4">
        {/* Step 1: Capture */}
        <Card className="overflow-hidden">
          <button 
            className="w-full text-left"
            onClick={() => setShowCapture(!showCapture)}
          >
            <CardHeader className="flex flex-row items-center justify-between py-4 bg-primary/5 hover:bg-primary/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
                <div>
                  <CardTitle className="text-lg">Capture</CardTitle>
                  <p className="text-sm text-muted-foreground">Collect what has your attention</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-muted-foreground" />
                {showCapture ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </button>
          {showCapture && (
            <CardContent className="pt-4">
              <form onSubmit={handleQuickCapture} className="flex gap-2">
                <Input
                  placeholder="What's on your mind?"
                  value={quickCapture}
                  onChange={(e) => setQuickCapture(e.target.value)}
                  className="flex-1"
                  autoFocus
                  data-testid="input-quick-capture"
                />
                <Button 
                  type="submit" 
                  disabled={!quickCapture.trim() || quickCaptureMutation.isPending}
                  data-testid="button-quick-capture"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </form>
            </CardContent>
          )}
        </Card>

        {/* Step 2: Clarify */}
        <Link href="/inbox">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
                <div>
                  <CardTitle className="text-lg">Clarify</CardTitle>
                  <p className="text-sm text-muted-foreground">Process what it means</p>
                </div>
              </div>
              <Inbox className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>

        {/* Step 3: Organize */}
        <Card className="overflow-hidden">
          <button 
            className="w-full text-left"
            onClick={() => setShowOrganize(!showOrganize)}
          >
            <CardHeader className="flex flex-row items-center justify-between py-4 bg-primary/5 hover:bg-primary/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
                <div>
                  <CardTitle className="text-lg">Organize</CardTitle>
                  <p className="text-sm text-muted-foreground">Put it where it belongs</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
                {showOrganize ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </button>
          {showOrganize && (
            <CardContent className="pt-4 space-y-6">
              {/* Contexts */}
              <div>
                <h4 className="font-semibold mb-2">Contexts</h4>
                <div className="flex flex-wrap gap-2 mb-2">
                  {contexts.map((ctx) => (
                    <div key={ctx.id} className="flex items-center gap-1">
                      {editingContextId === ctx.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            ref={contextInputRef}
                            value={editingContextName}
                            onChange={(e) => setEditingContextName(e.target.value)}
                            className="h-7 w-32"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveContextEdit();
                              if (e.key === 'Escape') setEditingContextId(null);
                            }}
                          />
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={saveContextEdit}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingContextId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Badge 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-secondary/80 group pr-1"
                          style={{ backgroundColor: ctx.color ? `${ctx.color}20` : undefined }}
                        >
                          <span onClick={() => startEditContext(ctx)}>{ctx.name}</span>
                          <button 
                            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteContext.mutate(ctx.id)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddContext} className="flex gap-2">
                  <Input
                    placeholder="New context..."
                    value={newContextName}
                    onChange={(e) => setNewContextName(e.target.value)}
                    className="h-8 flex-1"
                  />
                  <Button type="submit" size="sm" disabled={!newContextName.trim()}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </form>
              </div>

              {/* Time Labels */}
              <div>
                <h4 className="font-semibold mb-2">Time Estimates</h4>
                <div className="flex flex-wrap gap-2">
                  {TIME_LABELS.map((time) => {
                    const count = nextActions.filter(t => t.timeEstimate === time.value).length;
                    return (
                      <Badge key={time.value} variant="outline">
                        {time.label} ({count})
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Energy Labels */}
              <div>
                <h4 className="font-semibold mb-2">Energy Levels</h4>
                <div className="flex flex-wrap gap-2">
                  {ENERGY_LABELS.map((energy) => {
                    const count = nextActions.filter(t => t.energyLevel === energy.value).length;
                    return (
                      <Badge key={energy.value} variant="outline">
                        {energy.label} ({count})
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Projects */}
              <div>
                <h4 className="font-semibold mb-2">Projects</h4>
                <div className="space-y-1 mb-2">
                  {activeProjects.map((proj) => (
                    <div key={proj.id} className="flex items-center gap-2 p-2 rounded hover:bg-accent/50">
                      {editingProjectId === proj.id ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input
                            ref={projectInputRef}
                            value={editingProjectName}
                            onChange={(e) => setEditingProjectName(e.target.value)}
                            className="h-7 flex-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveProjectEdit();
                              if (e.key === 'Escape') setEditingProjectId(null);
                            }}
                          />
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={saveProjectEdit}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingProjectId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span 
                            className="flex-1 cursor-pointer hover:underline"
                            onClick={() => startEditProject(proj)}
                          >
                            {proj.name}
                          </span>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0 opacity-0 hover:opacity-100"
                            onClick={() => deleteProject.mutate(proj.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddProject} className="flex gap-2">
                  <Input
                    placeholder="New project..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="h-8 flex-1"
                  />
                  <Button type="submit" size="sm" disabled={!newProjectName.trim()}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </form>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Step 4: Reflect */}
        <Link href="/weekly-review">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">4</div>
                <div>
                  <CardTitle className="text-lg">Reflect</CardTitle>
                  <p className="text-sm text-muted-foreground">Review frequently</p>
                </div>
              </div>
              <RotateCcw className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>

        {/* Step 5: Engage */}
        <Link href="/next-actions">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">5</div>
                <div>
                  <CardTitle className="text-lg">Engage</CardTitle>
                  <p className="text-sm text-muted-foreground">Simply do ({nextActions.length} actions ready)</p>
                </div>
              </div>
              <PlayCircle className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
