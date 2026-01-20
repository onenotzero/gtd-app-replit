import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { type Email, type Task, type Context, type Project, EmailFolder } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type MailItem, isEmailItem, isTaskItem } from "@/types/mail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Reply,
  Forward,
  Archive,
  Trash2,
  Folder,
  Paperclip,
  Download,
  CheckSquare,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";

interface MailPreviewProps {
  item: MailItem | null;
  contexts?: Context[];
  projects?: Project[];
  onReply?: (email: Email) => void;
  onForward?: (email: Email) => void;
  onProcess?: (item: MailItem) => void;
}

export default function MailPreview({
  item,
  contexts,
  projects,
  onReply,
  onForward,
  onProcess,
}: MailPreviewProps) {
  const { toast } = useToast();
  const [showMoveOptions, setShowMoveOptions] = useState(false);

  const archiveEmail = useMutation({
    mutationFn: async (emailId: number) => {
      const res = await apiRequest("POST", `/api/emails/${emailId}/archive`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({ title: "Email archived" });
    },
  });

  const deleteEmail = useMutation({
    mutationFn: async (emailId: number) => {
      await apiRequest("DELETE", `/api/emails/${emailId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({ title: "Email deleted" });
    },
  });

  const moveEmail = useMutation({
    mutationFn: async ({ emailId, folder }: { emailId: number; folder: string }) => {
      const res = await apiRequest("POST", `/api/emails/${emailId}/move`, { folder });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({ title: "Email moved" });
      setShowMoveOptions(false);
    },
  });

  if (!item) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <CheckSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">Select an item to view</p>
          <p className="text-sm">Choose from your inbox to get started</p>
        </div>
      </div>
    );
  }

  const isEmail = item.type === "email";
  const email = isEmail ? (item.data as Email) : null;
  const task = !isEmail ? (item.data as Task) : null;

  const title = isEmail ? email!.subject : task!.title;
  const content = isEmail ? email!.content : task!.description || "";
  const htmlContent = isEmail ? email!.htmlContent : null;

  const senderName = email?.sender.replace(/<.*>/, "").trim() || "Task";
  const senderEmail = email?.sender.match(/<(.+)>/)?.[1] || email?.sender || "";

  const context = task?.contextId ? contexts?.find(c => c.id === task.contextId) : null;
  const project = task?.projectId ? projects?.find(p => p.id === task.projectId) : null;

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
        {isEmail && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply?.(email!)}
              className="gap-1.5"
            >
              <Reply className="h-4 w-4" />
              Reply
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onForward?.(email!)}
              className="gap-1.5"
            >
              <Forward className="h-4 w-4" />
              Forward
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => archiveEmail.mutate(email!.id)}
              disabled={archiveEmail.isPending}
            >
              <Archive className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteEmail.mutate(email!.id)}
              disabled={deleteEmail.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMoveOptions(!showMoveOptions)}
            >
              <Folder className="h-4 w-4" />
            </Button>
          </>
        )}

        <div className="flex-1" />

        {/* GTD Process button - always visible */}
        <Button
          variant="default"
          size="sm"
          onClick={() => onProcess?.(item)}
          className="gap-1.5 bg-blue-500 hover:bg-blue-600"
        >
          <ArrowRight className="h-4 w-4" />
          Process (GTD)
        </Button>
      </div>

      {/* Move folder dropdown */}
      {showMoveOptions && isEmail && (
        <div className="p-3 border-b bg-muted/20 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Move to:</span>
          <Select onValueChange={(folder) => moveEmail.mutate({ emailId: email!.id, folder })}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EmailFolder.INBOX}>Inbox</SelectItem>
              <SelectItem value={EmailFolder.ARCHIVED}>Archive</SelectItem>
              <SelectItem value={EmailFolder.TRASH}>Trash</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Email/Task header */}
      <div className="p-6 border-b">
        <h1 className="text-2xl font-semibold mb-4">{title}</h1>

        {isEmail && email && (
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-lg">
              {senderName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{senderName}</span>
                {senderEmail && (
                  <span className="text-sm text-muted-foreground">&lt;{senderEmail}&gt;</span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                To: {email.recipients.join(", ")}
              </div>
              {email.cc && email.cc.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Cc: {email.cc.join(", ")}
                </div>
              )}
              <div className="text-sm text-muted-foreground mt-1">
                {format(new Date(email.receivedAt), "MMMM d, yyyy 'at' h:mm a")}
              </div>
            </div>
          </div>
        )}

        {!isEmail && task && (
          <div className="flex flex-wrap gap-2">
            {context && (
              <Badge variant="outline" style={{ borderColor: context.color, color: context.color }}>
                {context.name}
              </Badge>
            )}
            {project && (
              <Badge variant="secondary">{project.name}</Badge>
            )}
            {task.timeEstimate && (
              <Badge variant="outline">{task.timeEstimate}</Badge>
            )}
            {task.energyLevel && (
              <Badge variant="outline">{task.energyLevel} energy</Badge>
            )}
          </div>
        )}
      </div>

      {/* Attachments */}
      {isEmail && email?.attachments && email.attachments.length > 0 && (
        <div className="p-4 border-b bg-muted/20">
          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
            <Paperclip className="h-4 w-4" />
            {email.attachments.length} Attachment{email.attachments.length > 1 ? "s" : ""}
          </div>
          <div className="flex flex-wrap gap-2">
            {email.attachments.map((attachment: any, index: number) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border cursor-pointer hover:bg-accent transition-colors"
              >
                <Download className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{attachment.filename || `Attachment ${index + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {htmlContent ? (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }}
          />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}
