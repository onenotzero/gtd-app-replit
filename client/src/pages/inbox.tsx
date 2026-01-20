import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { TaskStatus, type Task, type Email, type Context, type Project } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type MailItem } from "@/types/mail";
import ProcessingDialog, { type ProcessingResult } from "@/components/processing-dialog";
import EmailComposer from "@/components/email-composer";
import MailListItem from "@/components/mail/mail-list-item";
import MailPreview from "@/components/mail/mail-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PenSquare, Search, RefreshCw, ChevronLeft, Inbox as InboxIcon } from "lucide-react";

export default function Inbox() {
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<MailItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessingDialogOpen, setIsProcessingDialogOpen] = useState(false);
  const [processingItem, setProcessingItem] = useState<MailItem | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"new" | "reply" | "forward">("new");
  const [composerEmail, setComposerEmail] = useState<Email | undefined>(undefined);

  const { data: tasks = [], refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/status/inbox"],
  });

  const { data: contexts = [] } = useQuery<Context[]>({
    queryKey: ["/api/contexts"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: emails = [], refetch: refetchEmails, isFetching: isEmailsFetching } = useQuery<Email[]>({
    queryKey: ["/api/emails"],
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
            ...(task?.referenceCategory && { referenceCategory: task.referenceCategory })
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
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setSelectedItem(null);
      toast({ title: "Item processed", description: "Item has been processed successfully" });
    },
  });

  // Combine tasks and unprocessed emails
  const mailItems = useMemo(() => {
    const unprocessedEmails = emails.filter((e) => !e.processed);

    const items: MailItem[] = [
      ...tasks.map((task) => ({
        id: `task-${task.id}`,
        type: "task" as const,
        data: task,
        timestamp: new Date(),
      })),
      ...unprocessedEmails.map((email) => ({
        id: `email-${email.id}`,
        type: "email" as const,
        data: email,
        timestamp: new Date(email.receivedAt),
      })),
    ];

    // Filter by search query
    let filtered = items;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        if (item.type === "email") {
          const email = item.data as Email;
          return (
            email.subject.toLowerCase().includes(query) ||
            email.sender.toLowerCase().includes(query) ||
            email.content.toLowerCase().includes(query)
          );
        } else {
          const task = item.data as Task;
          return (
            task.title.toLowerCase().includes(query) ||
            task.description?.toLowerCase().includes(query)
          );
        }
      });
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [tasks, emails, searchQuery]);

  const handleRefresh = () => {
    refetchTasks();
    refetchEmails();
  };

  const handleProcess = (item: MailItem) => {
    setProcessingItem(item);
    setIsProcessingDialogOpen(true);
  };

  const handleProcessingComplete = (result: ProcessingResult) => {
    if (processingItem) {
      const itemId = processingItem.type === "task"
        ? (processingItem.data as Task).id
        : (processingItem.data as Email).id;

      processItem.mutate({
        ...result,
        itemId,
        itemType: processingItem.type,
      });
    }
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

  return (
    <div className="flex h-full">
      {/* Left sidebar - Item list */}
      <div className="w-80 border-r flex flex-col bg-card">
        {/* Header with GTD back button */}
        <div className="p-3 border-b">
          <Link href="/">
            <div className="flex items-center gap-2 mb-3 -ml-2 group cursor-pointer">
              <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              <span className="text-sm font-black bg-primary text-primary-foreground px-2 py-0.5 rounded shadow-sm tracking-tighter">GTD</span>
            </div>
          </Link>

          <div className="flex items-center gap-2 mb-2">
            <InboxIcon className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Inbox</h2>
            <span className="text-sm text-muted-foreground">({mailItems.length})</span>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isEmailsFetching}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${isEmailsFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <Button
            onClick={handleComposeNew}
            className="w-full gap-2"
            size="sm"
          >
            <PenSquare className="h-4 w-4" />
            Compose
          </Button>
        </div>

        {/* Item List */}
        <ScrollArea className="flex-1">
          {mailItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <InboxIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Inbox Zero!</p>
              <p className="text-sm">All items processed</p>
            </div>
          ) : (
            mailItems.map((item) => (
              <MailListItem
                key={item.id}
                item={item}
                isSelected={selectedItem?.id === item.id}
                onClick={() => setSelectedItem(item)}
              />
            ))
          )}
        </ScrollArea>
      </div>

      {/* Right side - Preview Pane */}
      <div className="flex-1">
        <MailPreview
          item={selectedItem}
          contexts={contexts}
          projects={projects}
          onReply={handleReply}
          onForward={handleForward}
          onProcess={handleProcess}
        />
      </div>

      {/* GTD Processing Dialog */}
      {processingItem && (
        <ProcessingDialog
          open={isProcessingDialogOpen}
          onOpenChange={setIsProcessingDialogOpen}
          item={{ ...processingItem.data, type: processingItem.type }}
          contexts={contexts}
          projects={projects}
          onProcess={handleProcessingComplete}
        />
      )}

      {/* Email Composer */}
      <EmailComposer
        open={isComposerOpen}
        onOpenChange={setIsComposerOpen}
        mode={composerMode}
        originalEmail={composerEmail}
      />
    </div>
  );
}
