import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, Circle, CheckCircle2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO, startOfDay, addDays, isSameDay, isToday, isTomorrow, isPast, startOfWeek, endOfWeek } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Task, TaskStatus } from "@shared/schema";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";

type CalendarEvent = {
  id: string;
  summary: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  htmlLink?: string;
};

type DayGroup = {
  date: Date;
  events: CalendarEvent[];
  tasks: Task[];
};

export default function Calendar() {
  const [weekOffset, setWeekOffset] = useState(0);

  const { data: connectionStatus, isLoading: isCheckingConnection } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/calendar/status"],
  });

  const { data: events = [], isLoading: isLoadingEvents } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events"],
    enabled: connectionStatus?.connected === true,
  });

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, { status: TaskStatus.DONE });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const tasksWithDueDate = allTasks.filter(t => 
    t.dueDate && (t.status === TaskStatus.NEXT_ACTION || t.status === TaskStatus.WAITING)
  );

  const getEventDate = (event: CalendarEvent): Date | null => {
    const dateStr = event.start?.dateTime || event.start?.date;
    if (!dateStr) return null;
    return startOfDay(parseISO(dateStr));
  };

  const getEventTime = (event: CalendarEvent): string => {
    if (event.start?.date) return "All day";
    if (!event.start?.dateTime) return "";
    const start = parseISO(event.start.dateTime);
    const end = event.end?.dateTime ? parseISO(event.end.dateTime) : null;
    return end 
      ? `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
      : format(start, 'h:mm a');
  };

  const baseDate = addDays(new Date(), weekOffset * 7);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });

  const getDayGroups = (): DayGroup[] => {
    const days: DayGroup[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dayEvents = events.filter(event => {
        const eventDate = getEventDate(event);
        return eventDate && isSameDay(eventDate, date);
      });
      const dayTasks = tasksWithDueDate.filter(task => {
        if (!task.dueDate) return false;
        return isSameDay(new Date(task.dueDate), date);
      });
      days.push({ date, events: dayEvents, tasks: dayTasks });
    }
    return days;
  };

  const dayGroups = getDayGroups();

  const getDayLabel = (date: Date): string => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, 'EEEE');
  };

  const hasContent = (group: DayGroup) => group.events.length > 0 || group.tasks.length > 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {connectionStatus?.connected ? (
              <span className="flex items-center gap-1.5">
                <SiGoogle className="h-3 w-3 text-green-600" />
                Google Calendar connected
              </span>
            ) : (
              "Calendar events and scheduled tasks"
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(prev => prev - 1)}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekOffset(0)}
            className={cn("h-8 px-3", weekOffset === 0 && "bg-accent")}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(prev => prev + 1)}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Connection Alert */}
      {isCheckingConnection ? (
        <Skeleton className="h-12 w-full mb-6" />
      ) : !connectionStatus?.connected ? (
        <Alert className="mb-6">
          <CalendarIcon className="h-4 w-4" />
          <AlertDescription>
            Connect your Google Calendar to see events alongside your scheduled tasks.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Loading State */}
      {(isCheckingConnection || isLoadingEvents) && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Things 3 Style Day List */}
      {!isCheckingConnection && !isLoadingEvents && (
        <div className="space-y-0">
          {dayGroups.map((group, index) => {
            const isPastDay = isPast(group.date) && !isToday(group.date);
            const showDivider = index > 0;
            
            return (
              <div key={group.date.toISOString()}>
                {/* Day Divider Line */}
                {showDivider && (
                  <div className="relative h-px bg-border my-1">
                    {isToday(group.date) && (
                      <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-primary/50 to-transparent" />
                    )}
                  </div>
                )}

                {/* Day Header */}
                <div className={cn(
                  "flex items-baseline gap-3 py-3 sticky top-0 bg-background z-10",
                  isPastDay && "opacity-50"
                )}>
                  <span className={cn(
                    "text-sm font-semibold min-w-[80px]",
                    isToday(group.date) && "text-primary"
                  )}>
                    {getDayLabel(group.date)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(group.date, 'MMM d')}
                  </span>
                  {isToday(group.date) && (
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  )}
                </div>

                {/* Day Content */}
                <div className={cn(
                  "pl-[92px] pb-2 space-y-1",
                  isPastDay && "opacity-50"
                )}>
                  {!hasContent(group) ? (
                    <p className="text-sm text-muted-foreground py-2">No events</p>
                  ) : (
                    <>
                      {/* Calendar Events */}
                      {group.events.map(event => (
                        <div
                          key={event.id}
                          className="group flex items-start gap-3 py-2 px-3 -mx-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => event.htmlLink && window.open(event.htmlLink, '_blank')}
                        >
                          <div className="flex-shrink-0 w-1 h-full min-h-[40px] bg-blue-500 rounded-full" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{event.summary}</p>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {getEventTime(event)}
                              </span>
                              {event.location && (
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin className="h-3 w-3" />
                                  {event.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Scheduled Tasks */}
                      {group.tasks.map(task => (
                        <div
                          key={task.id}
                          className="group flex items-start gap-3 py-2 px-3 -mx-3 rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <button
                            onClick={() => completeTask.mutate(task.id)}
                            className="flex-shrink-0 mt-0.5"
                          >
                            <Circle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {task.description}
                              </p>
                            )}
                          </div>
                          {task.status === TaskStatus.WAITING && (
                            <span className="text-xs text-orange-500 font-medium">Waiting</span>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isCheckingConnection && !isLoadingEvents && dayGroups.every(g => !hasContent(g)) && (
        <div className="text-center py-12">
          <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No events or tasks scheduled this week</p>
        </div>
      )}
    </div>
  );
}
