import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus, Clock, MapPin } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

type CalendarEvent = {
  id: string;
  summary: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  htmlLink?: string;
};

export default function Calendar() {
  const { data: connectionStatus, isLoading: isCheckingConnection } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/calendar/status"],
  });

  const { data: events = [], isLoading: isLoadingEvents } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events"],
    enabled: connectionStatus?.connected === true,
  });

  const formatEventTime = (event: CalendarEvent) => {
    const startDateTime = event.start?.dateTime || event.start?.date;
    const endDateTime = event.end?.dateTime || event.end?.date;
    
    if (!startDateTime) return '';
    
    const start = parseISO(startDateTime);
    const end = endDateTime ? parseISO(endDateTime) : null;
    
    if (event.start?.date) {
      // All-day event
      return format(start, 'MMM d, yyyy');
    }
    
    // Time-specific event
    const timeStr = format(start, 'h:mm a');
    const dateStr = format(start, 'MMM d, yyyy');
    const endTimeStr = end ? ` - ${format(end, 'h:mm a')}` : '';
    
    return `${dateStr} at ${timeStr}${endTimeStr}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
        <p className="text-muted-foreground">
          Manage your calendar events and schedule tasks
        </p>
      </div>

      {isCheckingConnection ? (
        <Skeleton className="h-16 w-full" />
      ) : !connectionStatus?.connected ? (
        <Alert>
          <CalendarIcon className="h-4 w-4" />
          <AlertDescription>
            Connect your Google Calendar to view and manage events directly from your GTD workflow.
          </AlertDescription>
        </Alert>
      ) : null}

      {!isCheckingConnection && connectionStatus?.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SiGoogle className="h-5 w-5 text-green-600" />
              Google Calendar
              <span className="ml-auto text-sm font-normal text-green-600 dark:text-green-400">✓ Connected</span>
            </CardTitle>
            <CardDescription>
              Your Google Calendar is connected and syncing events
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {connectionStatus?.connected && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Your calendar events for the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingEvents ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming events in the next 7 days.
              </p>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    data-testid={`calendar-event-${event.id}`}
                  >
                    <h4 className="font-semibold">{event.summary}</h4>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatEventTime(event)}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                      {event.htmlLink && (
                        <a
                          href={event.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View in Google Calendar
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
