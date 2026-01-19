import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, TaskStatus, WeeklyReview as WeeklyReviewType, Project, Context, Email } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, Clock, ListChecks, Inbox, Users, Lightbulb, Calendar, ChevronRight, ChevronLeft, Plus, FileText, Brain, Target, Mail, CheckSquare, Paperclip } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format, isBefore } from "date-fns";
import ProcessingDialog, { type ProcessingResult } from "@/components/processing-dialog";

type ReviewStep =
  | "start"
  | "collect-materials"
  | "process-inbox"
  | "empty-head"
  | "review-actions"
  | "review-past-calendar"
  | "review-upcoming-calendar"
  | "review-waiting"
  | "review-projects"
  | "review-checklists"
  | "review-someday"
  | "be-creative"
  | "finish";

type InboxItem = {
  id: string;
  type: "task" | "email";
  data: Task | Email;
  timestamp: Date;
  sortKey: number;
};

const STEPS_BY_PHASE: Record<string, ReviewStep[]> = {
  "GET CLEAR": ["collect-materials", "process-inbox", "empty-head"],
  "GET CURRENT": ["review-actions", "review-past-calendar", "review-upcoming-calendar", "review-waiting", "review-projects", "review-checklists"],
  "GET CREATIVE": ["review-someday", "be-creative"],
};

export default function WeeklyReview() {
  const [currentStep, setCurrentStep] = useState<ReviewStep>("start");
  const [notes, setNotes] = useState("");
  const [creativeSparks, setCreativeSparks] = useState("");
  const [newNextAction, setNewNextAction] = useState<{ [projectId: number]: string }>({});
  const [isProcessingDialogOpen, setIsProcessingDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const { toast } = useToast();

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: contexts = [] } = useQuery<Context[]>({
    queryKey: ["/api/contexts"],
  });

  const { data: emails = [] } = useQuery<Email[]>({
    queryKey: ["/api/emails"],
  });

  const { data: latestReview } = useQuery<WeeklyReviewType | null>({
    queryKey: ["/api/weekly-reviews/latest"],
  });

  const { data: calendarEvents = [] } = useQuery({
    queryKey: ["/api/calendar/events"],
  });

  // Calculate review data
  const activeProjects = projects.filter(p => p.isActive);
  const inboxTasks = tasks.filter(t => t.status === TaskStatus.INBOX);
  const unprocessedEmails = emails.filter((e) => !e.processed);

  const inboxItems: InboxItem[] = [
    ...inboxTasks.map((task) => ({
      id: `task-${task.id}`,
      type: "task" as const,
      data: task,
      timestamp: new Date(),
      sortKey: task.id,
    })),
    ...unprocessedEmails.map((email) => ({
      id: `email-${email.id}`,
      type: "email" as const,
      data: email,
      timestamp: new Date(email.receivedAt),
      sortKey: new Date(email.receivedAt).getTime(),
    })),
  ].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "task" ? -1 : 1;
    }
    return a.sortKey - b.sortKey;
  });

  const processItem = useMutation({
    mutationFn: async (result: ProcessingResult & { itemId: number; itemType: "task" | "email" }) => {
      const { action, task, createProject, itemId, itemType } = result;

      if (action === "trash") {
        if (itemType === "task") {
          await apiRequest("PATCH", `/api/tasks/${itemId}`, { status: TaskStatus.TRASH });
        } else {
          await apiRequest("DELETE", `/api/emails/${itemId}`);
        }
      } else if (action === "reference") {
        if (itemType === "task") {
          const updates: Partial<Task> = {
            status: TaskStatus.REFERENCE,
            ...( task?.referenceCategory && { referenceCategory: task.referenceCategory })
          };
          await apiRequest("PATCH", `/api/tasks/${itemId}`, updates);
        } else {
          await apiRequest("PATCH", `/api/emails/${itemId}`, { processed: true });
        }
      } else if (action === "someday") {
        if (itemType === "task") {
          const updates: Partial<Task> = {
            status: TaskStatus.SOMEDAY,
            ...(task?.notes && { notes: task.notes })
          };
          await apiRequest("PATCH", `/api/tasks/${itemId}`, updates);
        } else {
          await apiRequest("PATCH", `/api/emails/${itemId}`, { processed: true });
        }
      } else if (action === "do-now") {
        if (itemType === "task") {
          await apiRequest("PATCH", `/api/tasks/${itemId}`, { status: TaskStatus.DONE });
        } else {
          await apiRequest("PATCH", `/api/emails/${itemId}`, { processed: true });
        }
      } else if (action === "delegate" || action === "next-action") {
        if (createProject) {
          const projectRes = await apiRequest("POST", "/api/projects", {
            name: createProject.name,
            description: createProject.description,
            isActive: true,
          });
          const project = await projectRes.json();
          if (task) {
            task.projectId = project.id;
          }
        }

        if (itemType === "email") {
          await apiRequest("POST", "/api/tasks", task);
          await apiRequest("POST", `/api/emails/${itemId}/process`);
        } else {
          await apiRequest("PATCH", `/api/tasks/${itemId}`, task);
        }
      } else if (action === "defer") {
        if (itemType === "task") {
          const currentTask = tasks.find((t) => t.id === itemId);
          await apiRequest("PATCH", `/api/tasks/${itemId}`, {
            deferCount: (currentTask?.deferCount || 0) + 1,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsProcessingDialogOpen(false);
      setSelectedItem(null);
      toast({
        title: "Item processed",
        description: "Item has been processed successfully",
      });
    },
  });
  const nextActionTasks = tasks.filter(t => t.status === TaskStatus.NEXT_ACTION);
  const waitingForTasks = tasks.filter(t => t.status === TaskStatus.WAITING);
  const somedayTasks = tasks.filter(t => t.status === TaskStatus.SOMEDAY);
  const completedTasks = tasks.filter(t => t.status === TaskStatus.DONE);

  const stalledProjects = activeProjects.filter(project => {
    const projectNextActions = tasks.filter(t =>
      t.projectId === project.id && t.status === TaskStatus.NEXT_ACTION
    );
    return projectNextActions.length === 0;
  });

  const overdueWaitingFor = waitingForTasks.filter(t =>
    t.waitingForFollowUp && isBefore(new Date(t.waitingForFollowUp), new Date())
  );

  const daysSinceReview = latestReview
    ? Math.floor((Date.now() - new Date(latestReview.completedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const addNextActionMutation = useMutation({
    mutationFn: async ({ projectId, title, contextId }: { projectId: number; title: string; contextId?: number }) => {
      const res = await apiRequest("POST", "/api/tasks", {
        title,
        status: TaskStatus.NEXT_ACTION,
        projectId,
        contextId: contextId || null,
        description: null,
        dueDate: null,
        emailId: null,
        deferCount: 0,
        timeEstimate: null,
        energyLevel: null,
        waitingFor: null,
        waitingForFollowUp: null,
        referenceCategory: null,
        notes: null,
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setNewNextAction(prev => ({ ...prev, [variables.projectId]: "" }));
      toast({
        title: "Next action added",
        description: "Added to project successfully",
      });
    },
  });

  const handleProcess = (item: InboxItem) => {
    setSelectedItem(item);
    setIsProcessingDialogOpen(true);
  };

  const handleProcessingComplete = (result: ProcessingResult) => {
    if (selectedItem) {
      const itemId = selectedItem.type === "task"
        ? (selectedItem.data as Task).id
        : (selectedItem.data as Email).id;

      processItem.mutate({
        ...result,
        itemId,
        itemType: selectedItem.type,
      });
    }
  };

  const saveReviewMutation = useMutation({
    mutationFn: async () => {
      const reviewData = {
        projectsReviewed: activeProjects.length,
        stalledProjectsFound: stalledProjects.length,
        waitingForReviewed: waitingForTasks.length,
        somedayReviewed: somedayTasks.length,
        completedTasksCount: completedTasks.length,
        notes: `${notes}\n\nCreative Sparks:\n${creativeSparks}`,
      };
      const res = await apiRequest("POST", "/api/weekly-reviews", reviewData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-reviews/latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-reviews"] });
      setCurrentStep("start");
      setNotes("");
      setCreativeSparks("");
      toast({
        title: "Weekly Review Completed",
        description: "Great job maintaining your GTD system!",
      });
    },
  });

  const allSteps: ReviewStep[] = ["start", ...Object.values(STEPS_BY_PHASE).flat(), "finish"];
  const currentStepIndex = allSteps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / allSteps.length) * 100;

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < allSteps.length) {
      setCurrentStep(allSteps[nextIndex]);
    }
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(allSteps[prevIndex]);
    }
  };

  const getCurrentPhase = (): string => {
    for (const [phase, steps] of Object.entries(STEPS_BY_PHASE)) {
      if ((steps as readonly string[]).includes(currentStep)) {
        return phase;
      }
    }
    return "";
  };

  if (currentStep === "start") {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Weekly Review</h1>
          <p className="text-muted-foreground">
            The weekly review is your time to step back, review all your projects,
            and ensure nothing falls through the cracks.
          </p>
        </div>

        {inboxItems.length > 0 && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              You have {inboxItems.length} unprocessed {inboxItems.length === 1 ? 'item' : 'items'} in your inbox.
              Consider processing these before your weekly review.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Last Review</CardTitle>
            </CardHeader>
            <CardContent>
              {latestReview ? (
                <div>
                  <div className="text-2xl font-bold">
                    {daysSinceReview} {daysSinceReview === 1 ? 'day' : 'days'} ago
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(latestReview.completedAt), { addSuffix: true })}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-2xl font-bold">Never</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Complete your first review!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Review Status</CardTitle>
            </CardHeader>
            <CardContent>
              {daysSinceReview === null || daysSinceReview >= 7 ? (
                <Badge variant="destructive" className="text-base">Overdue</Badge>
              ) : daysSinceReview >= 5 ? (
                <Badge variant="outline" className="text-base border-yellow-500 text-yellow-700">Due Soon</Badge>
              ) : (
                <Badge variant="outline" className="text-base border-green-500 text-green-700">On Track</Badge>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>David Allen's GTD Weekly Review</CardTitle>
            <CardDescription>
              Three phases to maintain perspective and control
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  GET CLEAR
                </h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>Collect loose materials and papers</li>
                  <li>Get "IN" to zero</li>
                  <li>Empty your head</li>
                </ul>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  GET CURRENT
                </h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>Review next action lists</li>
                  <li>Review past calendar data</li>
                  <li>Review upcoming calendar</li>
                  <li>Review waiting-for list</li>
                  <li>Review projects and outcomes</li>
                  <li>Review relevant checklists</li>
                </ul>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-semibold text-purple-700 mb-2 flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  GET CREATIVE
                </h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>Review someday/maybe list</li>
                  <li>Be creative and courageous</li>
                </ul>
              </div>
            </div>

            <Button onClick={() => setCurrentStep("collect-materials")} size="lg" className="w-full">
              Start Weekly Review
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPhase = getCurrentPhase();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <Badge variant="outline" className="mb-2">
              {currentPhase}
            </Badge>
            <h1 className="text-3xl font-bold">Weekly Review</h1>
          </div>
          <Badge variant="outline">
            Step {currentStepIndex + 1} of {allSteps.length}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {currentStep === "collect-materials" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Collect Loose Papers and Materials
            </CardTitle>
            <CardDescription>
              Gather all accumulated business cards, receipts, and miscellaneous paper-based and digital materials into your in-basket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Inbox className="h-4 w-4" />
              <AlertDescription>
                <strong>Physical:</strong> Gather all loose papers, business cards, receipts, and notes from your desk, wallet, bags, and car into your physical inbox.
              </AlertDescription>
            </Alert>
            <Alert>
              <Inbox className="h-4 w-4" />
              <AlertDescription>
                <strong>Digital:</strong> Check downloads folder, desktop files, screenshots, voice memos, and any other digital capture points. Move or note them for processing.
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Checklist:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>Desk drawers and surface</li>
                <li>Wallet and bag</li>
                <li>Car and other vehicles</li>
                <li>Downloads folder</li>
                <li>Desktop files</li>
                <li>Voice memos and screenshots</li>
              </ul>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === "process-inbox" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-6 w-6 text-blue-600" />
              Get "IN" to Zero
            </CardTitle>
            <CardDescription>
              Process completely all outstanding paper materials, journal and meeting notes, voicemails, dictation, and emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Inbox Items</h3>
                  <p className="text-sm text-muted-foreground">Unprocessed items requiring your attention</p>
                </div>
                <div className="text-2xl font-bold">{inboxItems.length}</div>
              </div>
            </div>

            {inboxItems.length === 0 ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Inbox Zero! All items have been processed.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {inboxItems.map((item) => {
                  const isTask = item.type === "task";
                  const task = isTask ? (item.data as Task) : null;
                  const email = !isTask ? (item.data as Email) : null;

                  const isHighlyDeferred = isTask && task && task.deferCount >= 3;

                  return (
                    <Card
                      key={item.id}
                      className={`hover:bg-accent/50 transition-colors ${isHighlyDeferred ? 'border-orange-300' : ''}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            {isTask ? (
                              <CheckSquare className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <Mail className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold truncate">
                                    {isTask ? task?.title : email?.subject}
                                  </h3>
                                  {isHighlyDeferred && (
                                    <Badge variant="destructive" className="text-xs">
                                      Deferred {task?.deferCount}x
                                    </Badge>
                                  )}
                                </div>
                                {!isTask && email && (
                                  <p className="text-sm text-muted-foreground">
                                    {email.sender}
                                  </p>
                                )}
                                {!isTask && email?.content && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {email.content.substring(0, 150)}...
                                  </p>
                                )}
                                {isTask && task?.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  <span>
                                    {format(item.timestamp, "MMM d, yyyy")}
                                  </span>
                                  {!isTask && email?.attachments && Array.isArray(email.attachments) && email.attachments.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Paperclip className="h-3 w-3" />
                                      {email.attachments.length}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <Button
                                onClick={() => handleProcess(item)}
                                size="sm"
                              >
                                Process
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === "empty-head" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-blue-600" />
              Empty Your Head
            </CardTitle>
            <CardDescription>
              Put in writing and process any uncaptured new projects, action items, waiting-fors, someday/maybes, etc.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                Write down anything on your mind that you haven't captured yet. Don't judge or filter - just capture everything.
              </AlertDescription>
            </Alert>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Mind Dump (optional - capture what's on your mind)
              </label>
              <Textarea
                placeholder="Any thoughts, ideas, concerns, projects, tasks that are floating in your head..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                After the review, process these items through the normal GTD workflow
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === "review-actions" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-6 w-6 text-green-600" />
              Review Action Lists
            </CardTitle>
            <CardDescription>
              Mark off completed actions. Review for reminders of further action steps to record
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {contexts.map(context => {
                const contextTasks = nextActionTasks.filter(t => t.contextId === context.id);
                return (
                  <div key={context.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: context.color }}
                        />
                        <h3 className="font-semibold">{context.name}</h3>
                      </div>
                      <Badge variant="outline">{contextTasks.length} actions</Badge>
                    </div>
                    {contextTasks.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {contextTasks.slice(0, 3).map(task => (
                          <div key={task.id} className="text-sm text-muted-foreground">
                            {task.title}
                          </div>
                        ))}
                        {contextTasks.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            ... and {contextTasks.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Total: {nextActionTasks.length} next actions across all contexts
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === "review-past-calendar" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-green-600" />
              Review Previous Calendar Data
            </CardTitle>
            <CardDescription>
              Review past calendar in detail for remaining action items, reference data, etc., and transfer into the active system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                Look at the past 1-2 weeks of calendar entries. Any follow-up actions needed? Anything to document as reference?
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Questions to ask:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>Did any meetings generate action items I haven't captured?</li>
                <li>Any commitments made that need to be tracked?</li>
                <li>Any reference information to file from past events?</li>
                <li>Any people I need to follow up with?</li>
              </ul>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === "review-upcoming-calendar" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-green-600" />
              Review Upcoming Calendar
            </CardTitle>
            <CardDescription>
              Review upcoming calendar events - long and short term. Capture actions triggered
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.isArray(calendarEvents) && calendarEvents.length > 0 ? (
              <div className="space-y-2">
                {calendarEvents.slice(0, 10).map((event: any) => (
                  <div key={event.id} className="border rounded-lg p-3">
                    <h3 className="font-semibold">{event.summary}</h3>
                    <div className="text-sm text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {event.start?.dateTime
                        ? format(new Date(event.start.dateTime), "MMM d, yyyy 'at' h:mm a")
                        : event.start?.date
                      }
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  No upcoming calendar events found
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Questions to ask:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>Do I need to prepare anything for upcoming events?</li>
                <li>Any travel arrangements or logistics to handle?</li>
                <li>Anyone I need to contact before the event?</li>
                <li>Any materials I need to review or create?</li>
              </ul>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === "review-waiting" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6 text-green-600" />
              Review Waiting-For List
            </CardTitle>
            <CardDescription>
              Record appropriate actions for any needed follow-up. Check off received ones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {waitingForTasks.length > 0 ? (
              <div className="space-y-3">
                {waitingForTasks.map(task => {
                  const isOverdue = task.waitingForFollowUp &&
                    isBefore(new Date(task.waitingForFollowUp), new Date());

                  return (
                    <div key={task.id} className={`border rounded-lg p-4 ${isOverdue ? 'border-red-300 bg-red-50' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{task.title}</h3>
                          {task.description && (
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          )}
                        </div>
                        {isOverdue && (
                          <Badge variant="destructive">Overdue</Badge>
                        )}
                      </div>
                      <div className="mt-2 text-sm space-y-1">
                        {task.waitingFor && (
                          <div>
                            <span className="text-muted-foreground">Waiting for: </span>
                            <span className="font-medium">{task.waitingFor}</span>
                          </div>
                        )}
                        {task.waitingForFollowUp && (
                          <div>
                            <span className="text-muted-foreground">Follow-up: </span>
                            <span className="font-medium">
                              {formatDistanceToNow(new Date(task.waitingForFollowUp), { addSuffix: true })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>
                  No items waiting for others
                </AlertDescription>
              </Alert>
            )}

            {overdueWaitingFor.length > 0 && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  {overdueWaitingFor.length} {overdueWaitingFor.length === 1 ? 'item is' : 'items are'} overdue for follow-up.
                  Consider reaching out to keep things moving.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === "review-projects" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-6 w-6 text-green-600" />
              Review Project (and Larger Outcome) Lists
            </CardTitle>
            <CardDescription>
              Evaluate status of projects, goals, and outcomes one by one, ensuring at least one current action item on each
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeProjects.length > 0 ? (
              <div className="space-y-3">
                {activeProjects.map(project => {
                  const projectNextActions = tasks.filter(t =>
                    t.projectId === project.id && t.status === TaskStatus.NEXT_ACTION
                  );
                  const isStalled = projectNextActions.length === 0;

                  return (
                    <div key={project.id} className={`border rounded-lg p-4 ${isStalled ? 'border-red-300 bg-red-50' : ''}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{project.name}</h3>
                          {project.description && (
                            <p className="text-sm text-muted-foreground">{project.description}</p>
                          )}
                        </div>
                        {isStalled && (
                          <Badge variant="destructive">Stalled</Badge>
                        )}
                      </div>

                      <div className="mt-2">
                        <div className="text-sm mb-2">
                          <span className="text-muted-foreground">Next actions: </span>
                          <span className="font-medium">{projectNextActions.length}</span>
                        </div>

                        {projectNextActions.length > 0 && (
                          <div className="space-y-1 mb-3">
                            {projectNextActions.map(task => (
                              <div key={task.id} className="text-sm text-muted-foreground">
                                {task.title}
                              </div>
                            ))}
                          </div>
                        )}

                        {isStalled && (
                          <Alert className="mb-3 border-red-200 bg-red-50">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800 text-sm">
                              This project has no next actions. Define at least one to keep it moving forward.
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Inline next action creation */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add next action for this project..."
                            value={newNextAction[project.id] || ""}
                            onChange={(e) => setNewNextAction(prev => ({ ...prev, [project.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newNextAction[project.id]?.trim()) {
                                addNextActionMutation.mutate({
                                  projectId: project.id,
                                  title: newNextAction[project.id].trim(),
                                });
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              if (newNextAction[project.id]?.trim()) {
                                addNextActionMutation.mutate({
                                  projectId: project.id,
                                  title: newNextAction[project.id].trim(),
                                });
                              }
                            }}
                            disabled={!newNextAction[project.id]?.trim()}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Alert>
                <Target className="h-4 w-4" />
                <AlertDescription>
                  No active projects
                </AlertDescription>
              </Alert>
            )}

            {stalledProjects.length > 0 && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  {stalledProjects.length} {stalledProjects.length === 1 ? 'project is' : 'projects are'} stalled.
                  Define next actions or consider moving them to Someday/Maybe.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === "review-checklists" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              Review Any Relevant Checklists
            </CardTitle>
            <CardDescription>
              Use as a trigger for any new actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <ListChecks className="h-4 w-4" />
              <AlertDescription>
                Review any checklists you maintain (travel prep, weekly routines, project templates, etc.) to trigger new actions.
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Common checklist types:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>Travel preparation checklist</li>
                <li>Weekly or monthly routines</li>
                <li>Project startup/completion templates</li>
                <li>Key role responsibilities</li>
                <li>Areas of focus or accountability</li>
              </ul>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === "review-someday" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-purple-600" />
              Review Someday/Maybe List
            </CardTitle>
            <CardDescription>
              Review for any projects which may now have become active, and transfer to "Projects". Delete items no longer of interest
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {somedayTasks.length > 0 ? (
              <div className="space-y-3">
                {somedayTasks.map(task => (
                  <div key={task.id} className="border rounded-lg p-4">
                    <h3 className="font-semibold">{task.title}</h3>
                    {task.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{task.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  No items in Someday/Maybe
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                Are any of these ready to become active projects or next actions?
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === "be-creative" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-600" />
              Be Creative & Courageous
            </CardTitle>
            <CardDescription>
              Any new, wonderful, hare-brained, creative, thought-provoking, risk-taking ideas to add into your system?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                This is your time to think beyond the day-to-day. What would you do if you were braver? What opportunities are you not seeing?
              </AlertDescription>
            </Alert>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Creative Sparks (optional)
              </label>
              <Textarea
                placeholder="New ideas, wild possibilities, things you've been afraid to consider, opportunities you're seeing..."
                value={creativeSparks}
                onChange={(e) => setCreativeSparks(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Capture anything that comes to mind - you can process it later
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Questions to spark creativity:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>What have I been avoiding that could be valuable?</li>
                <li>What would I do if I weren't afraid?</li>
                <li>What opportunities am I not seeing?</li>
                <li>What would make the biggest difference?</li>
                <li>What am I curious about?</li>
              </ul>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === "finish" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              Review Complete!
            </CardTitle>
            <CardDescription>
              Congratulations on completing your GTD Weekly Review
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-green-900 mb-3">Review Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Projects Reviewed</div>
                  <div className="font-semibold text-lg">{activeProjects.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Stalled Projects</div>
                  <div className="font-semibold text-lg">{stalledProjects.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Waiting For</div>
                  <div className="font-semibold text-lg">{waitingForTasks.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Someday/Maybe</div>
                  <div className="font-semibold text-lg">{somedayTasks.length}</div>
                </div>
              </div>
            </div>

            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Your GTD system is now current and complete. You have clarity and control.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => saveReviewMutation.mutate()}
                disabled={saveReviewMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {saveReviewMutation.isPending ? "Saving..." : "Complete Review"}
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedItem && (
        <ProcessingDialog
          open={isProcessingDialogOpen}
          onOpenChange={setIsProcessingDialogOpen}
          item={{ ...selectedItem.data, type: selectedItem.type }}
          contexts={contexts}
          projects={projects}
          onProcess={handleProcessingComplete}
        />
      )}
    </div>
  );
}
