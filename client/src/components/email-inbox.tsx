import { Email } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, Paperclip } from "lucide-react";
import { format } from "date-fns";

interface EmailInboxProps {
  emails: Email[];
  onProcess: (email: Email) => void;
}

export default function EmailInbox({ emails, onProcess }: EmailInboxProps) {
  const unprocessedEmails = emails.filter((email) => !email.processed);

  return (
    <div className="space-y-4">
      {unprocessedEmails.map((email) => (
        <Card key={email.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">{email.subject}</CardTitle>
                <CardDescription>
                  From: {email.sender}
                  <br />
                  {format(new Date(email.receivedAt), 'PPpp')}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onProcess(email)}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Process
            </Button>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              {email.htmlContent ? (
                <div dangerouslySetInnerHTML={{ __html: email.htmlContent }} />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {email.content}
                </p>
              )}
            </div>
            {email.attachments && email.attachments.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Paperclip className="h-4 w-4" />
                  <span>{email.attachments.length} attachment(s)</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {unprocessedEmails.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No unprocessed emails
          </CardContent>
        </Card>
      )}
    </div>
  );
}