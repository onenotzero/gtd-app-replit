import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { type Email, EmailFolder } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Archive,
  Reply,
  Forward,
  Trash2,
  Folder,
  Paperclip,
  Download,
} from "lucide-react";
import { format } from "date-fns";

interface EmailViewerProps {
  email: Email | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReply?: (email: Email) => void;
  onForward?: (email: Email) => void;
}

export default function EmailViewer({
  email,
  open,
  onOpenChange,
  onReply,
  onForward,
}: EmailViewerProps) {
  const { toast } = useToast();
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>("");

  const archiveEmail = useMutation({
    mutationFn: async (emailId: number) => {
      const res = await apiRequest("POST", `/api/emails/${emailId}/archive`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({
        title: "Email archived",
        description: "Email has been moved to archive",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to archive",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const moveEmail = useMutation({
    mutationFn: async ({ emailId, folder }: { emailId: number; folder: string }) => {
      const res = await apiRequest("POST", `/api/emails/${emailId}/move`, { folder });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({
        title: "Email moved",
        description: `Email has been moved to ${selectedFolder}`,
      });
      setShowMoveDialog(false);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to move email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteEmail = useMutation({
    mutationFn: async (emailId: number) => {
      await apiRequest("DELETE", `/api/emails/${emailId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({
        title: "Email deleted",
        description: "Email has been permanently deleted",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleArchive = () => {
    if (email) archiveEmail.mutate(email.id);
  };

  const handleDelete = () => {
    if (email && confirm("Are you sure you want to delete this email?")) {
      deleteEmail.mutate(email.id);
    }
  };

  const handleMove = () => {
    if (email && selectedFolder) {
      moveEmail.mutate({ emailId: email.id, folder: selectedFolder });
    }
  };

  if (!email) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{email.subject}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email metadata */}
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-semibold">From:</span> {email.sender}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">To:</span> {email.recipients.join(", ")}
                </p>
                {email.cc && email.cc.length > 0 && (
                  <p className="text-sm">
                    <span className="font-semibold">Cc:</span> {email.cc.join(", ")}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {format(new Date(email.receivedAt), "PPpp")}
                </p>
              </div>
              <Badge variant="outline">{email.folder}</Badge>
            </div>
          </div>

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments ({email.attachments.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {email.attachments.map((attachment: any, index: number) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="h-3 w-3" />
                    {attachment.filename || `Attachment ${index + 1}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Email content */}
          <div className="prose prose-sm max-w-none">
            {email.htmlContent ? (
              <div dangerouslySetInnerHTML={{ __html: email.htmlContent }} />
            ) : (
              <pre className="whitespace-pre-wrap font-sans">{email.content}</pre>
            )}
          </div>

          <Separator />

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {onReply && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onReply(email);
                  onOpenChange(false);
                }}
              >
                <Reply className="h-4 w-4 mr-2" />
                Reply
              </Button>
            )}

            {onForward && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onForward(email);
                  onOpenChange(false);
                }}
              >
                <Forward className="h-4 w-4 mr-2" />
                Forward
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleArchive}
              disabled={archiveEmail.isPending}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMoveDialog(!showMoveDialog)}
            >
              <Folder className="h-4 w-4 mr-2" />
              Move
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteEmail.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>

          {/* Move to folder dialog */}
          {showMoveDialog && (
            <div className="p-4 border rounded-lg space-y-3">
              <p className="text-sm font-semibold">Move to folder:</p>
              <div className="flex gap-2">
                <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EmailFolder.INBOX}>Inbox</SelectItem>
                    <SelectItem value={EmailFolder.SENT}>Sent</SelectItem>
                    <SelectItem value={EmailFolder.DRAFTS}>Drafts</SelectItem>
                    <SelectItem value={EmailFolder.ARCHIVED}>Archived</SelectItem>
                    <SelectItem value={EmailFolder.TRASH}>Trash</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleMove}
                  disabled={!selectedFolder || moveEmail.isPending}
                  size="sm"
                >
                  {moveEmail.isPending ? "Moving..." : "Move"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
