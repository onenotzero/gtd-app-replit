import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings as SettingsIcon, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  ExternalLink,
  Loader2,
  Zap
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface IntegrationStatus {
  email: {
    configured: boolean;
    address: string | null;
  };
  calendar: {
    connected: boolean;
    provider: string | null;
  };
}

export default function Settings() {
  const { toast } = useToast();
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingCalendar, setTestingCalendar] = useState(false);

  const { data: status, isLoading, refetch } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
  });

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      setTestingEmail(true);
      const res = await apiRequest("POST", "/api/integrations/email/test");
      return res.json();
    },
    onSuccess: (data) => {
      setTestingEmail(false);
      toast({
        title: "Email Connected",
        description: data.message,
      });
    },
    onError: () => {
      setTestingEmail(false);
      toast({
        title: "Connection Failed",
        description: "Could not connect to email server. Check your credentials.",
        variant: "destructive",
      });
    },
  });

  const testCalendarMutation = useMutation({
    mutationFn: async () => {
      setTestingCalendar(true);
      const res = await apiRequest("POST", "/api/integrations/calendar/test");
      return res.json();
    },
    onSuccess: (data) => {
      setTestingCalendar(false);
      toast({
        title: "Calendar Connected",
        description: `${data.message}. Found ${data.eventCount} upcoming event(s).`,
      });
    },
    onError: () => {
      setTestingCalendar(false);
      toast({
        title: "Connection Failed",
        description: "Could not connect to Google Calendar. Try reconnecting.",
        variant: "destructive",
      });
    },
  });

  const StatusBadge = ({ connected }: { connected: boolean }) => (
    <Badge 
      variant={connected ? "default" : "secondary"}
      className={connected ? "bg-green-500 hover:bg-green-600" : ""}
    >
      {connected ? (
        <>
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Connected
        </>
      ) : (
        <>
          <XCircle className="h-3 w-3 mr-1" />
          Not Connected
        </>
      )}
    </Badge>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>Email Integration</CardTitle>
                <CardDescription>Connect your email to capture tasks automatically</CardDescription>
              </div>
            </div>
            <StatusBadge connected={status?.email.configured || false} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.email.configured ? (
            <>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Connected Account</p>
                  <p className="text-sm text-muted-foreground">{status.email.address}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => testEmailMutation.mutate()}
                  disabled={testingEmail}
                >
                  {testingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Emails are automatically fetched and added to your inbox for processing.
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Email integration requires IMAP/SMTP credentials. Configure the following secrets in your environment:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <code className="p-2 bg-muted rounded">EMAIL_ADDRESS</code>
                <code className="p-2 bg-muted rounded">EMAIL_PASSWORD</code>
                <code className="p-2 bg-muted rounded">IMAP_HOST</code>
                <code className="p-2 bg-muted rounded">IMAP_PORT</code>
                <code className="p-2 bg-muted rounded">SMTP_HOST</code>
                <code className="p-2 bg-muted rounded">SMTP_PORT</code>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <a href="https://replit.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Configure in Secrets Tab
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle>Calendar Integration</CardTitle>
                <CardDescription>Sync with Google Calendar for scheduling</CardDescription>
              </div>
            </div>
            <StatusBadge connected={status?.calendar.connected || false} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.calendar.connected ? (
            <>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Provider</p>
                  <p className="text-sm text-muted-foreground">{status.calendar.provider}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => testCalendarMutation.mutate()}
                  disabled={testingCalendar}
                >
                  {testingCalendar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your calendar events are synced and visible in the Calendar view.
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect your Google Calendar to view and create events directly from the app.
              </p>
              <Button className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Connect Google Calendar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Setup Guide</CardTitle>
          <CardDescription>Get started in 3 easy steps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${status?.email.configured ? 'bg-green-500 text-white' : 'bg-muted'}`}>
                {status?.email.configured ? <CheckCircle2 className="h-4 w-4" /> : '1'}
              </div>
              <div>
                <p className="font-medium">Connect Email</p>
                <p className="text-sm text-muted-foreground">Capture tasks from your inbox automatically</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${status?.calendar.connected ? 'bg-green-500 text-white' : 'bg-muted'}`}>
                {status?.calendar.connected ? <CheckCircle2 className="h-4 w-4" /> : '2'}
              </div>
              <div>
                <p className="font-medium">Connect Calendar</p>
                <p className="text-sm text-muted-foreground">Schedule tasks and see upcoming events</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                3
              </div>
              <div>
                <p className="font-medium">Start Capturing</p>
                <p className="text-sm text-muted-foreground">Add your first task and begin your GTD journey</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
