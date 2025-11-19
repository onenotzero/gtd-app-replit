import { Email } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EmailInboxProps {
  emails: Email[];
  onProcess: (email: Email) => void;
}

export default function EmailInbox({ emails, onProcess }: EmailInboxProps) {
  const unprocessedEmails = emails.filter((email) => !email.processed);

  const getEmailPreview = (email: Email): string => {
    const text = email.content || '';
    const cleanText = text.replace(/\s+/g, ' ').trim();
    return cleanText.length > 120 ? cleanText.substring(0, 120) + '...' : cleanText;
  };

  return (
    <Card>
      <CardContent className="p-0">
        {unprocessedEmails.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No unprocessed emails</p>
          </div>
        ) : (
          <div className="divide-y">
            {unprocessedEmails.map((email) => (
              <div
                key={email.id}
                data-testid={`email-preview-${email.id}`}
                className={cn(
                  "flex items-start gap-3 p-4 hover:bg-accent transition-colors cursor-pointer group",
                  !email.processed && "bg-muted/30"
                )}
                onClick={() => onProcess(email)}
              >
                <div className="flex-shrink-0 mt-1">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold text-sm truncate" data-testid={`email-sender-${email.id}`}>
                      {email.sender}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`email-date-${email.id}`}>
                      {format(new Date(email.receivedAt), 'MMM d')}
                    </span>
                  </div>
                  
                  <p className="text-sm font-medium truncate" data-testid={`email-subject-${email.id}`}>
                    {email.subject}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground line-clamp-1" data-testid={`email-preview-${email.id}`}>
                      {getEmailPreview(email)}
                    </p>
                    {email.attachments && email.attachments.length > 0 && (
                      <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" data-testid={`email-attachment-indicator-${email.id}`} />
                    )}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onProcess(email);
                  }}
                  data-testid={`button-process-email-${email.id}`}
                >
                  Process
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}