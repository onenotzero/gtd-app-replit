import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Calendar() {
  const [connectedCalendars, setConnectedCalendars] = useState<string[]>([]);

  const handleConnectGoogleCalendar = () => {
    // This will be implemented with Replit integration
    console.log("Connect Google Calendar");
  };

  const handleConnectOutlook = () => {
    // This will be implemented with Replit integration
    console.log("Connect Outlook Calendar");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
        <p className="text-muted-foreground">
          Manage your calendar events and schedule tasks
        </p>
      </div>

      {connectedCalendars.length === 0 && (
        <Alert>
          <CalendarIcon className="h-4 w-4" />
          <AlertDescription>
            Connect your calendar accounts to view and manage events directly from your GTD workflow.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SiGoogle className="h-5 w-5" />
              Google Calendar
            </CardTitle>
            <CardDescription>
              Connect your Google Calendar to sync events and schedule tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!connectedCalendars.includes("google") ? (
              <Button 
                onClick={handleConnectGoogleCalendar}
                className="w-full"
                data-testid="button-connect-google-calendar"
              >
                <Plus className="h-4 w-4 mr-2" />
                Connect Google Calendar
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-green-600 dark:text-green-400">✓ Connected</p>
                <Button variant="outline" className="w-full">
                  Manage Events
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Outlook Calendar
            </CardTitle>
            <CardDescription>
              Connect your Outlook/Office 365 calendar to sync events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!connectedCalendars.includes("outlook") ? (
              <Button 
                onClick={handleConnectOutlook}
                className="w-full"
                data-testid="button-connect-outlook-calendar"
              >
                <Plus className="h-4 w-4 mr-2" />
                Connect Outlook Calendar
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-green-600 dark:text-green-400">✓ Connected</p>
                <Button variant="outline" className="w-full">
                  Manage Events
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {connectedCalendars.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Your calendar events for the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Calendar events will appear here once you connect your accounts.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
