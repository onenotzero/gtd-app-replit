import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash2, Archive, Clock, UserPlus, FolderPlus } from "lucide-react";
import { format } from "date-fns";
import { TaskStatus, TimeEstimate, EnergyLevel, type Task, type Email, type Context, type Project } from "@shared/schema";
import { cn } from "@/lib/utils";

type ProcessingStep =
  | "actionable"
  | "non-actionable"
  | "next-action"
  | "two-minute"
  | "delegate-choice"
  | "delegate-form"
  | "project-choice"
  | "project-form"
  | "organize";

type NonActionableChoice = "trash" | "reference" | "someday";

interface ProcessingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: (Task | Email) & { type: "task" | "email" };
  contexts?: Context[];
  projects?: Project[];
  onProcess: (data: ProcessingResult) => void;
}

export interface ProcessingResult {
  action: "trash" | "reference" | "someday" | "do-now" | "delegate" | "next-action" | "defer";
  task?: Partial<Task>;
  createProject?: {
    name: string;
    description?: string;
  };
}

const nextActionSchema = z.object({
  nextAction: z
    .string()
    .min(3, "Next action must be at least 3 characters"),
});

const delegateSchema = z.object({
  waitingFor: z.string().min(1, "Please enter person's name"),
  followUpDate: z.date(),
});

const projectSchema = z.object({
  projectName: z.string().min(3, "Project name must be at least 3 characters"),
  projectDescription: z.string().optional(),
});

const organizeSchema = z.object({
  contextId: z.number().optional(),
  timeEstimate: z.string().optional(),
  energyLevel: z.string().optional(),
  dueDate: z.date().optional(),
});

export default function ProcessingDialog({
  open,
  onOpenChange,
  item,
  contexts = [],
  projects = [],
  onProcess,
}: ProcessingDialogProps) {
  const [step, setStep] = useState<ProcessingStep>("actionable");
  const [stepHistory, setStepHistory] = useState<ProcessingStep[]>([]);
  const [nonActionableChoice, setNonActionableChoice] = useState<NonActionableChoice | null>(null);
  const [referenceCategory, setReferenceCategory] = useState("");
  const [somedayNotes, setSomedayNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [isDoNow, setIsDoNow] = useState(false);
  const [shouldDelegate, setShouldDelegate] = useState(false);
  const [shouldCreateProject, setShouldCreateProject] = useState(false);
  const [delegateData, setDelegateData] = useState<{ waitingFor: string; followUpDate: Date } | null>(null);
  const [projectData, setProjectData] = useState<{ name: string; description?: string } | null>(null);

  const nextActionForm = useForm({
    resolver: zodResolver(nextActionSchema),
    defaultValues: { nextAction: "" },
  });

  const delegateForm = useForm({
    resolver: zodResolver(delegateSchema),
    defaultValues: {
      waitingFor: "",
      followUpDate: new Date(),
    },
  });

  const projectForm = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      projectName: "",
      projectDescription: "",
    },
  });

  const organizeForm = useForm({
    resolver: zodResolver(organizeSchema),
    defaultValues: {
      contextId: undefined,
      timeEstimate: undefined,
      energyLevel: undefined,
      dueDate: undefined,
    },
  });

  const getItemTitle = () => {
    return item.type === "email" ? (item as Email).subject : (item as Task).title;
  };

  const navigateToStep = (newStep: ProcessingStep) => {
    setStepHistory([...stepHistory, step]);
    setStep(newStep);
  };

  const goBack = () => {
    // Special case: if we're in a non-actionable substep (reference/someday), 
    // just go back to the non-actionable choice screen
    if (step === "non-actionable" && nonActionableChoice) {
      setNonActionableChoice(null);
      return;
    }

    // Otherwise, go back to the previous step in history
    if (stepHistory.length > 0) {
      const previousStep = stepHistory[stepHistory.length - 1];
      setStepHistory(stepHistory.slice(0, -1));
      setStep(previousStep);
    }
  };

  const handleActionableChoice = (isActionable: boolean) => {
    if (isActionable) {
      navigateToStep("next-action");
    } else {
      navigateToStep("non-actionable");
    }
  };

  const handleNonActionable = (choice: NonActionableChoice) => {
    if (choice === "trash") {
      onProcess({ action: "trash" });
      resetDialog();
    } else {
      setNonActionableChoice(choice);
    }
  };

  const handleNonActionableSubmit = (data: { category?: string; notes?: string }) => {
    if (nonActionableChoice === "reference") {
      onProcess({ 
        action: "reference",
        task: {
          status: TaskStatus.REFERENCE,
          referenceCategory: data.category,
        }
      });
    } else if (nonActionableChoice === "someday") {
      onProcess({ 
        action: "someday",
        task: {
          status: TaskStatus.SOMEDAY,
          notes: data.notes,
        }
      });
    }
    resetDialog();
  };

  const handleNextActionSubmit = (data: { nextAction: string }) => {
    setNextAction(data.nextAction);
    navigateToStep("two-minute");
  };

  const handleTwoMinuteChoice = (doNow: boolean) => {
    if (doNow) {
      setIsDoNow(true);
      onProcess({ action: "do-now" });
      resetDialog();
    } else {
      navigateToStep("delegate-choice");
    }
  };

  const handleDelegateChoice = (delegate: boolean) => {
    if (delegate) {
      navigateToStep("delegate-form");
    } else {
      navigateToStep("project-choice");
    }
  };

  const handleDelegateSubmit = (data: { waitingFor: string; followUpDate: Date }) => {
    setDelegateData(data);
    onProcess({
      action: "delegate",
      task: {
        title: nextAction,
        status: TaskStatus.WAITING,
        waitingFor: data.waitingFor,
        waitingForFollowUp: data.followUpDate,
        description: item.type === "email" ? (item as Email).content : (item as Task).description,
        emailId: item.type === "email" ? (item as Email).id : undefined,
      },
    });
    resetDialog();
  };

  const handleProjectChoice = (isProject: boolean) => {
    if (isProject) {
      navigateToStep("project-form");
    } else {
      navigateToStep("organize");
    }
  };

  const handleProjectSubmit = (data: { projectName: string; projectDescription?: string }) => {
    setProjectData({ name: data.projectName, description: data.projectDescription });
    navigateToStep("organize");
  };

  const handleOrganizeSubmit = (data: {
    contextId?: number;
    timeEstimate?: string;
    energyLevel?: string;
    dueDate?: Date;
  }) => {
    const result: ProcessingResult = {
      action: "next-action",
      task: {
        title: nextAction,
        status: TaskStatus.NEXT_ACTION,
        contextId: data.contextId,
        timeEstimate: data.timeEstimate as any,
        energyLevel: data.energyLevel as any,
        dueDate: data.dueDate,
        description: item.type === "email" ? (item as Email).content : (item as Task).description,
        emailId: item.type === "email" ? (item as Email).id : undefined,
      },
    };

    if (projectData) {
      result.createProject = {
        name: projectData.name,
        description: projectData.description,
      };
    }

    onProcess(result);
    resetDialog();
  };

  const resetDialog = () => {
    setStep("actionable");
    setStepHistory([]);
    setNonActionableChoice(null);
    setReferenceCategory("");
    setSomedayNotes("");
    setNextAction("");
    setIsDoNow(false);
    setShouldDelegate(false);
    setShouldCreateProject(false);
    setDelegateData(null);
    setProjectData(null);
    nextActionForm.reset();
    delegateForm.reset();
    projectForm.reset();
    organizeForm.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Process Item</DialogTitle>
          <DialogDescription>{getItemTitle()}</DialogDescription>
        </DialogHeader>

        {step === "actionable" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Is it actionable?</h3>
            <p className="text-sm text-muted-foreground">
              Does this require you to do something?
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => handleActionableChoice(true)}
                className="flex-1"
                data-testid="button-actionable-yes"
              >
                Yes
              </Button>
              <Button
                onClick={() => handleActionableChoice(false)}
                variant="outline"
                className="flex-1"
                data-testid="button-actionable-no"
              >
                No
              </Button>
            </div>
          </div>
        )}

        {step === "non-actionable" && !nonActionableChoice && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">What is it?</h3>
            <div className="grid gap-3">
              <Button
                onClick={() => handleNonActionable("trash")}
                variant="outline"
                className="justify-start h-auto py-4"
                data-testid="button-trash"
              >
                <Trash2 className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Trash</div>
                  <div className="text-xs text-muted-foreground">Delete permanently</div>
                </div>
              </Button>
              <Button
                onClick={() => handleNonActionable("reference")}
                variant="outline"
                className="justify-start h-auto py-4"
                data-testid="button-reference"
              >
                <Archive className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Reference</div>
                  <div className="text-xs text-muted-foreground">
                    Save for future reference
                  </div>
                </div>
              </Button>
              <Button
                onClick={() => handleNonActionable("someday")}
                variant="outline"
                className="justify-start h-auto py-4"
                data-testid="button-someday"
              >
                <Clock className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Someday/Maybe</div>
                  <div className="text-xs text-muted-foreground">
                    Review later, not urgent
                  </div>
                </div>
              </Button>
            </div>
            <Button
              onClick={goBack}
              variant="ghost"
              data-testid="button-back"
            >
              Back
            </Button>
          </div>
        )}

        {step === "non-actionable" && nonActionableChoice === "reference" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Save as Reference</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleNonActionableSubmit({ category: referenceCategory || undefined });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-sm font-medium">Category (optional)</label>
                <Input
                  value={referenceCategory}
                  onChange={(e) => setReferenceCategory(e.target.value)}
                  placeholder="e.g., Articles, Receipts, Documentation"
                  data-testid="input-reference-category"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={goBack}
                  variant="ghost"
                  data-testid="button-back"
                >
                  Back
                </Button>
                <Button type="submit" data-testid="button-save-reference">
                  Save Reference
                </Button>
              </div>
            </form>
          </div>
        )}

        {step === "non-actionable" && nonActionableChoice === "someday" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Add to Someday/Maybe</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleNonActionableSubmit({ notes: somedayNotes || undefined });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  value={somedayNotes}
                  onChange={(e) => setSomedayNotes(e.target.value)}
                  placeholder="Why might you want to do this later?"
                  data-testid="input-someday-notes"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={goBack}
                  variant="ghost"
                  data-testid="button-back"
                >
                  Back
                </Button>
                <Button type="submit" data-testid="button-save-someday">
                  Add to Someday/Maybe
                </Button>
              </div>
            </form>
          </div>
        )}

        {step === "next-action" && (
          <Form {...nextActionForm}>
            <form
              onSubmit={nextActionForm.handleSubmit(handleNextActionSubmit)}
              className="space-y-4"
            >
              <FormField
                control={nextActionForm.control}
                name="nextAction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What's the next action?</FormLabel>
                    <FormDescription>
                      What's the very next physical thing you need to do? Start with a verb.
                    </FormDescription>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Call John re: budget approval"
                        data-testid="input-next-action"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={goBack}
                  variant="ghost"
                  data-testid="button-back"
                >
                  Back
                </Button>
                <Button type="submit" data-testid="button-continue">
                  Continue
                </Button>
              </div>
            </form>
          </Form>
        )}

        {step === "two-minute" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Will it take less than 2 minutes?</h3>
            <p className="text-sm text-muted-foreground">
              If yes, do it now and mark it complete.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => handleTwoMinuteChoice(true)}
                className="flex-1"
                data-testid="button-do-now"
              >
                Yes - Do it now
              </Button>
              <Button
                onClick={() => handleTwoMinuteChoice(false)}
                variant="outline"
                className="flex-1"
                data-testid="button-not-now"
              >
                No - Takes longer
              </Button>
            </div>
            <Button
              onClick={goBack}
              variant="ghost"
              data-testid="button-back"
            >
              Back
            </Button>
          </div>
        )}

        {step === "delegate-choice" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Are you the right person to do this?</h3>
            <p className="text-sm text-muted-foreground">
              Can this be delegated to someone else?
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => handleDelegateChoice(true)}
                variant="outline"
                className="flex-1"
                data-testid="button-delegate-yes"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Delegate
              </Button>
              <Button
                onClick={() => handleDelegateChoice(false)}
                className="flex-1"
                data-testid="button-delegate-no"
              >
                I'll do it
              </Button>
            </div>
            <Button
              onClick={goBack}
              variant="ghost"
              data-testid="button-back"
            >
              Back
            </Button>
          </div>
        )}

        {step === "delegate-form" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Delegate Task</h3>
            <Form {...delegateForm}>
              <form
                onSubmit={delegateForm.handleSubmit(handleDelegateSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={delegateForm.control}
                  name="waitingFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delegate to</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Person's name"
                          data-testid="input-delegate-to"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={delegateForm.control}
                  name="followUpDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow-up date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-follow-up-date"
                            >
                              {field.value ? format(field.value, "PPP") : "Pick a date"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={goBack}
                    variant="ghost"
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                  <Button type="submit" data-testid="button-delegate-task">
                    Delegate Task
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {step === "project-choice" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Is this part of a bigger outcome?</h3>
            <p className="text-sm text-muted-foreground">
              Does this belong to a project or is it a standalone action?
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => handleProjectChoice(true)}
                variant="outline"
                className="flex-1"
                data-testid="button-project-yes"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
              <Button
                onClick={() => handleProjectChoice(false)}
                className="flex-1"
                data-testid="button-project-no"
              >
                Single Action
              </Button>
            </div>
            <Button
              onClick={goBack}
              variant="ghost"
              data-testid="button-back"
            >
              Back
            </Button>
          </div>
        )}

        {step === "project-form" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Create Project</h3>
            <Form {...projectForm}>
              <form
                onSubmit={projectForm.handleSubmit(handleProjectSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={projectForm.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Website Redesign"
                          data-testid="input-project-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={projectForm.control}
                  name="projectDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project goal (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Describe the desired outcome"
                          data-testid="input-project-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={goBack}
                    variant="ghost"
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                  <Button type="submit" data-testid="button-submit-project">
                    Create Project & Continue
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {step === "organize" && (
          <Form {...organizeForm}>
            <form
              onSubmit={organizeForm.handleSubmit(handleOrganizeSubmit)}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold">Organize</h3>
              <p className="text-sm text-muted-foreground">
                Add details to help you execute this action.
              </p>

              <FormField
                control={organizeForm.control}
                name="contextId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Context (where can this be done?)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value !== undefined ? String(field.value) : undefined}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-context">
                          <SelectValue placeholder="Select a context" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contexts.map((context) => (
                          <SelectItem key={context.id} value={context.id.toString()}>
                            {context.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={organizeForm.control}
                name="timeEstimate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time required (optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-time-estimate">
                          <SelectValue placeholder="Select estimate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(TimeEstimate).map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={organizeForm.control}
                name="energyLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Energy required (optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-energy-level">
                          <SelectValue placeholder="Select energy level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(EnergyLevel).map(([key, value]) => (
                          <SelectItem key={value} value={value}>
                            {key.charAt(0) + key.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={organizeForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date (optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-due-date"
                          >
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={goBack}
                  variant="ghost"
                  data-testid="button-back"
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" data-testid="button-complete-processing">
                  Complete Processing
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
