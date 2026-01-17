import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TaskStatus, type Task, type Email, type Context, type Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ProcessingDialog, { type ProcessingResult } from "@/components/processing-dialog";
import EmailViewer from "@/components/email-viewer";
import EmailComposer from "@/components/email-composer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Inbox as InboxIcon, Mail, CheckSquare, Paperclip, PenSquare, Eye } from "lucide-react";
import { format } from "date-fns";

type InboxItem = {
  id: string;
  type: "task" | "email";
  data: Task | Email;
  timestamp: Date;
  sortKey: number;
};

export default function Inbox() {
  const { toast } = useToast();
  const [isProcessingDialogOpen, setIsProcessingDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [viewingEmail, setViewingEmail] = useState<Email | null>(null);
  const [isEmailViewerOpen, setIsEmailViewerOpen] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"new" | "reply" | "forward">("new");
  const [composerEmail, setComposerEmail] = useState<Email | undefined>(undefined);

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/status/inbox"],
  });

  const { data: contexts = [] } = useQuery<Context[]>({
    queryKey: ["/api/contexts"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: emails = [] } = useQuery<Email[]>({
    queryKey: ["/api/emails"],
  });

  const unprocessedEmails = emails.filter((e) => !e.processed);

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
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/next_action"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/waiting"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/trash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/someday"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status/reference"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Item processed",
        description: "Item has been processed successfully",
      });
    },
  });

  const handleProcess = (item: InboxItem) => {
    setSelectedItem(item);
    setIsProcessingDialogOpen(true);
  };

  const handleViewEmail = (email: Email) => {
    setViewingEmail(email);
    setIsEmailViewerOpen(true);
  };

  const handleReply = (email: Email) => {
    setComposerMode("reply");
    setComposerEmail(email);
    setIsComposerOpen(true);
  };

  const handleForward = (email: Email) => {
    setComposerMode("forward");
    setComposerEmail(email);
    setIsComposerOpen(true);
  };

  const handleComposeNew = () => {
    setComposerMode("new");
    setComposerEmail(undefined);
    setIsComposerOpen(true);
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

  const inboxItems: InboxItem[] = [
    ...tasks.map((task) => ({
      id: `task-${task.id}`,
      type: "task" as const,
      data: task,
      // Use current date for display, but sort by task ID (FIFO proxy)
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
    // Sort tasks first, then emails
    if (a.type !== b.type) {
      return a.type === "task" ? -1 : 1;
    }
    // Within same type, sort by sortKey (FIFO)
    return a.sortKey - b.sortKey;
  });

  const totalUnprocessed = inboxItems.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inbox</h2>
          <p className="text-muted-foreground">
            Process {totalUnprocessed} {totalUnprocessed === 1 ? 'item' : 'items'}
          </p>
        </div>
        <Button onClick={handleComposeNew}>
          <PenSquare className="h-4 w-4 mr-2" />
          Compose
        </Button>
      </div>

      {totalUnprocessed === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <InboxIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <h3 className="text-lg font-semibold mb-2">Inbox Zero!</h3>
            <p className="text-muted-foreground">
              All items processed. Well done!
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {inboxItems.map((item) => {
          const isTask = item.type === "task";
          const task = isTask ? (item.data as Task) : null;
          const email = !isTask ? (item.data as Email) : null;

          return (
            <Card key={item.id} className="hover:bg-accent/50 transition-colors">
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
                        <h3 className="font-semibold truncate">
                          {isTask ? task?.title : email?.subject}
                        </h3>
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
                          {!isTask && email?.attachments && email.attachments.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Paperclip className="h-3 w-3" />
                              {email.attachments.length}
                            </span>
                          )}
                          {isTask && task?.deferCount && task.deferCount > 0 && (
                            <span className="text-orange-600">
                              Deferred {task.deferCount}x
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {!isTask && email && (
                          <Button
                            onClick={() => handleViewEmail(email)}
                            size="sm"
                            variant="outline"
                            data-testid={`button-view-${item.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                        <Button
                          onClick={() => handleProcess(item)}
                          size="sm"
                          data-testid={`button-process-${item.id}`}
                        >
                          Process
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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

      <EmailViewer
        email={viewingEmail}
        open={isEmailViewerOpen}
        onOpenChange={setIsEmailViewerOpen}
        onReply={handleReply}
        onForward={handleForward}
      />

      <EmailComposer
        open={isComposerOpen}
        onOpenChange={setIsComposerOpen}
        mode={composerMode}
        originalEmail={composerEmail}
      />
    </div>
  );
}