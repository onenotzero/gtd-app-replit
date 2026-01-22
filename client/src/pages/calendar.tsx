import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiGoogle } from "react-icons/si";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO, startOfDay, addDays, addMonths, addYears, isSameDay, isToday, isTomorrow, isPast, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, isSameMonth, differenceInDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Task, TaskStatus } from "@shared/schema";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";

type CalendarView = "today" | "week" | "month" | "year";

type CalendarEvent = {
  id: string;
  summary: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  htmlLink?: string;
  calendarId?: string;
  calendarSummary?: string;
  calendarBackgroundColor?: string;
};

type DayGroup = {
  date: Date;
  events: CalendarEvent[];
  tasks: Task[];
};

export default function Calendar() {
  const [view, setView] = useState<CalendarView>("week");
  const [offset, setOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

  const navigateToDay = (date: Date) => {
    const today = startOfDay(new Date());
    const targetDay = startOfDay(date);
    const dayOffset = differenceInDays(targetDay, today);
    setView("today");
    setOffset(dayOffset);
    setSelectedDate(date);
  };

  const getDateRange = () => {
    const today = new Date();
    switch (view) {
      case "today":
        const dayDate = addDays(today, offset);
        return { start: startOfDay(dayDate), end: startOfDay(dayDate) };
      case "week":
        const weekBase = addDays(today, offset * 7);
        return { start: startOfWeek(weekBase, { weekStartsOn: 1 }), end: endOfWeek(weekBase, { weekStartsOn: 1 }) };
      case "month":
        const monthBase = addMonths(today, offset);
        return { start: startOfMonth(monthBase), end: endOfMonth(monthBase) };
      case "year":
        const yearBase = addYears(today, offset);
        return { start: startOfYear(yearBase), end: endOfYear(yearBase) };
    }
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();

  const getHeaderTitle = () => {
    switch (view) {
      case "today":
        return format(rangeStart, 'EEEE, MMMM d, yyyy');
      case "week":
        return `${format(rangeStart, 'MMM d')} - ${format(rangeEnd, 'MMM d, yyyy')}`;
      case "month":
        return format(rangeStart, 'MMMM yyyy');
      case "year":
        return format(rangeStart, 'yyyy');
    }
  };

  const getDayGroups = (): DayGroup[] => {
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    return days.map(date => {
      const dayEvents = events.filter(event => {
        const eventDate = getEventDate(event);
        return eventDate && isSameDay(eventDate, date);
      });
      const dayTasks = tasksWithDueDate.filter(task => {
        if (!task.dueDate) return false;
        return isSameDay(new Date(task.dueDate), date);
      });
      return { date, events: dayEvents, tasks: dayTasks };
    });
  };

  const dayGroups = getDayGroups();

  const getDayLabel = (date: Date): string => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (view === "year") return format(date, 'MMM d');
    return format(date, 'EEEE');
  };

  const hasContent = (group: DayGroup) => group.events.length > 0 || group.tasks.length > 0;

  const goToToday = () => setOffset(0);

  const handleViewChange = (newView: CalendarView) => {
    setView(newView);
    setOffset(0);
  };

  const getDayData = (date: Date) => {
    const dayEvents = events.filter(event => {
      const eventDate = getEventDate(event);
      return eventDate && isSameDay(eventDate, date);
    });
    const dayTasks = tasksWithDueDate.filter(task => {
      if (!task.dueDate) return false;
      return isSameDay(new Date(task.dueDate), date);
    });
    return { events: dayEvents, tasks: dayTasks };
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {getHeaderTitle()}
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
        <div className="flex items-center gap-2">
          <Select value={view} onValueChange={(v) => handleViewChange(v as CalendarView)}>
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOffset(prev => prev - 1)}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className={cn("h-8 px-3", offset === 0 && "bg-accent")}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOffset(prev => prev + 1)}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
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

      {/* Year View - Compact Monthly Grid */}
      {!isCheckingConnection && !isLoadingEvents && view === "year" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 12 }, (_, i) => {
            const monthStart = new Date(rangeStart.getFullYear(), i, 1);
            const monthEnd = endOfMonth(monthStart);
            const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
            
            return (
              <div key={i} className="border rounded-lg p-3">
                <h3 className="font-semibold text-sm mb-2">{format(monthStart, 'MMMM')}</h3>
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => (
                    <div key={idx} className="text-center text-muted-foreground">{d}</div>
                  ))}
                  {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, idx) => (
                    <div key={`empty-${idx}`} />
                  ))}
                  {monthDays.map(day => {
                    const dayData = getDayData(day);
                    const hasDayContent = dayData.events.length > 0 || dayData.tasks.length > 0;
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => navigateToDay(day)}
                        className={cn(
                          "text-center py-0.5 rounded text-xs cursor-pointer hover:bg-accent transition-colors",
                          isToday(day) && "bg-primary text-primary-foreground font-bold hover:bg-primary/90",
                          hasDayContent && !isToday(day) && "bg-blue-100 dark:bg-blue-900/30"
                        )}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Month View - Calendar Grid */}
      {!isCheckingConnection && !isLoadingEvents && view === "month" && (
        <div className="border rounded-lg overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 bg-muted/50">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2 border-b">
                {d}
              </div>
            ))}
          </div>
          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: (rangeStart.getDay() + 6) % 7 }).map((_, idx) => (
              <div key={`empty-start-${idx}`} className="min-h-[100px] border-b border-r bg-muted/20" />
            ))}
            {/* Actual days */}
            {dayGroups.map((group) => {
              const isPastDay = isPast(group.date) && !isToday(group.date);
              return (
                <button
                  key={group.date.toISOString()}
                  onClick={() => navigateToDay(group.date)}
                  className={cn(
                    "min-h-[100px] border-b border-r p-2 text-left hover:bg-accent/50 transition-colors cursor-pointer",
                    isPastDay && "opacity-50"
                  )}
                >
                  <div className={cn(
                    "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                    isToday(group.date) && "bg-primary text-primary-foreground"
                  )}>
                    {format(group.date, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {group.events.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        className="text-xs truncate bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded"
                      >
                        {event.summary}
                      </div>
                    ))}
                    {group.tasks.slice(0, 2).map(task => (
                      <div
                        key={task.id}
                        className="text-xs truncate bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-1 py-0.5 rounded"
                      >
                        {task.title}
                      </div>
                    ))}
                    {(group.events.length + group.tasks.length) > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{group.events.length + group.tasks.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
            {/* Empty cells for days after month ends */}
            {Array.from({ length: (7 - ((rangeEnd.getDay() + 6) % 7 + 1)) % 7 }).map((_, idx) => (
              <div key={`empty-end-${idx}`} className="min-h-[100px] border-b border-r bg-muted/20" />
            ))}
          </div>
        </div>
      )}

      {/* Day/Week View - Vertical List */}
      {!isCheckingConnection && !isLoadingEvents && (view === "today" || view === "week") && (
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
                          <div 
                            className="flex-shrink-0 w-1 h-full min-h-[40px] rounded-full" 
                            style={{ backgroundColor: event.calendarBackgroundColor || '#3b82f6' }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{event.summary}</p>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {getEventTime(event)}
                              </span>
                              {event.calendarSummary && (
                                <span 
                                  className="px-1.5 py-0.5 rounded text-xs"
                                  style={{ 
                                    backgroundColor: `${event.calendarBackgroundColor}20` || '#3b82f620',
                                    color: event.calendarBackgroundColor || '#3b82f6'
                                  }}
                                >
                                  {event.calendarSummary}
                                </span>
                              )}
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
      {!isCheckingConnection && !isLoadingEvents && (view === "today" || view === "week") && dayGroups.every(g => !hasContent(g)) && (
        <div className="text-center py-12">
          <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">
            No events or tasks scheduled {view === "today" ? "today" : "this week"}
          </p>
        </div>
      )}
    </div>
  );
}
