import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { type Email } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send, Paperclip, X } from "lucide-react";

type ComposerMode = "new" | "reply" | "forward";

interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: ComposerMode;
  originalEmail?: Email;
}

export default function EmailComposer({
  open,
  onOpenChange,
  mode = "new",
  originalEmail,
}: EmailComposerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [to, setTo] = useState(
    mode === "reply" && originalEmail ? originalEmail.sender : ""
  );
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(
    mode === "reply" && originalEmail
      ? originalEmail.subject.startsWith("Re: ")
        ? originalEmail.subject
        : `Re: ${originalEmail.subject}`
      : mode === "forward" && originalEmail
      ? originalEmail.subject.startsWith("Fwd: ")
        ? originalEmail.subject
        : `Fwd: ${originalEmail.subject}`
      : ""
  );
  const [body, setBody] = useState(
    mode === "forward" && originalEmail
      ? `\n\n---------- Forwarded message ---------\nFrom: ${originalEmail.sender}\nSubject: ${originalEmail.subject}\n\n${originalEmail.content}`
      : ""
  );
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  const sendEmail = useMutation({
    mutationFn: async (data: {
      to: string;
      subject: string;
      text: string;
      cc?: string;
      bcc?: string;
      attachments?: any[];
    }) => {
      if (mode === "reply" && originalEmail) {
        const res = await apiRequest("POST", `/api/emails/${originalEmail.id}/reply`, {
          text: data.text,
          attachments: data.attachments,
        });
        return res.json();
      } else if (mode === "forward" && originalEmail) {
        const res = await apiRequest("POST", `/api/emails/${originalEmail.id}/forward`, {
          to: data.to,
          additionalText: data.text,
          attachments: data.attachments,
        });
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/emails/send", data);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({
        title: "Email sent",
        description: "Your email has been sent successfully",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (!to && mode !== "reply") {
      toast({
        title: "Missing recipient",
        description: "Please enter at least one recipient",
        variant: "destructive",
      });
      return;
    }

    if (!subject) {
      toast({
        title: "Missing subject",
        description: "Please enter a subject",
        variant: "destructive",
      });
      return;
    }

    const attachmentData = attachments.map((file) => ({
      filename: file.name,
      content: file,
      contentType: file.type,
    }));

    sendEmail.mutate({
      to: to.trim(),
      subject: subject.trim(),
      text: body.trim(),
      cc: cc.trim() || undefined,
      bcc: bcc.trim() || undefined,
      attachments: attachmentData.length > 0 ? attachmentData : undefined,
    });
  };

  const handleClose = () => {
    setTo("");
    setCc("");
    setBcc("");
    setSubject("");
    setBody("");
    setAttachments([]);
    setShowCc(false);
    setShowBcc(false);
    onOpenChange(false);
  };

  const getTitle = () => {
    switch (mode) {
      case "reply":
        return "Reply";
      case "forward":
        return "Forward";
      default:
        return "New Email";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* To field */}
          {mode !== "reply" && (
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="email"
                placeholder="recipient@example.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                multiple
              />
            </div>
          )}

          {mode === "reply" && originalEmail && (
            <div className="space-y-2">
              <Label>To</Label>
              <p className="text-sm text-muted-foreground">{originalEmail.sender}</p>
            </div>
          )}

          {/* Cc/Bcc toggle buttons */}
          {!showCc && !showBcc && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCc(true)}
              >
                Cc
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowBcc(true)}
              >
                Bcc
              </Button>
            </div>
          )}

          {/* Cc field */}
          {showCc && (
            <div className="space-y-2">
              <Label htmlFor="cc">Cc</Label>
              <Input
                id="cc"
                type="email"
                placeholder="cc@example.com"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
              />
            </div>
          )}

          {/* Bcc field */}
          {showBcc && (
            <div className="space-y-2">
              <Label htmlFor="bcc">Bcc</Label>
              <Input
                id="bcc"
                type="email"
                placeholder="bcc@example.com"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
              />
            </div>
          )}

          {/* Subject field */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Body field */}
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              placeholder="Write your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="resize-none"
            />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <Paperclip className="h-3 w-3" />
                    {file.name}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleRemoveAttachment(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4 mr-2" />
            Attach Files
          </Button>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={sendEmail.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              {sendEmail.isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
