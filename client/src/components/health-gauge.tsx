import gauge1Purple from "@/assets/gauges/gauge-1-purple.png";
import gauge2Blue from "@/assets/gauges/gauge-2-blue.png";
import gauge3Green from "@/assets/gauges/gauge-3-green.png";
import gauge4Yellow from "@/assets/gauges/gauge-4-yellow.png";
import gauge5Red from "@/assets/gauges/gauge-5-red.png";
import { cn } from "@/lib/utils";

export type HealthLevel = 1 | 2 | 3 | 4 | 5;

const gaugeImages: Record<HealthLevel, string> = {
  1: gauge1Purple,
  2: gauge2Blue,
  3: gauge3Green,
  4: gauge4Yellow,
  5: gauge5Red,
};

const healthLabels: Record<HealthLevel, string> = {
  1: "Excellent",
  2: "Good",
  3: "Healthy",
  4: "Attention",
  5: "Review Now",
};

const healthColors: Record<HealthLevel, string> = {
  1: "text-purple-600",
  2: "text-blue-600",
  3: "text-green-600",
  4: "text-yellow-600",
  5: "text-red-600",
};

interface HealthGaugeProps {
  level: HealthLevel;
  title: string;
  metric: string;
  className?: string;
  showLabel?: boolean;
}

export function HealthGauge({ level, title, metric, className, showLabel = false }: HealthGaugeProps) {
  return (
    <div className={cn("inline-flex items-center gap-1.5 leading-none", className)}>
      <img
        src={gaugeImages[level]}
        alt={`${title} health: ${healthLabels[level]}`}
        className="w-5 h-5 object-contain"
      />
      {showLabel && (
        <span className={cn("text-xs font-medium leading-none mb-[1px]", healthColors[level])}>
          {metric}
        </span>
      )}
    </div>
  );
}

export function calculateCaptureHealth(inboxCount: number): { level: HealthLevel; metric: string } {
  if (inboxCount === 0) return { level: 1, metric: "Inbox clear" };
  if (inboxCount <= 5) return { level: 2, metric: `${inboxCount} items` };
  if (inboxCount <= 10) return { level: 3, metric: `${inboxCount} items` };
  if (inboxCount <= 15) return { level: 4, metric: `${inboxCount} items` };
  return { level: 5, metric: `${inboxCount} items` };
}

export function calculateClarifyHealth(pendingCount: number): { level: HealthLevel; metric: string } {
  if (pendingCount === 0) return { level: 1, metric: "All processed" };
  if (pendingCount <= 3) return { level: 2, metric: `${pendingCount} pending` };
  if (pendingCount <= 7) return { level: 3, metric: `${pendingCount} pending` };
  if (pendingCount <= 12) return { level: 4, metric: `${pendingCount} pending` };
  return { level: 5, metric: `${pendingCount} backlog` };
}

export function calculateOrganizeHealth(
  activeProjects: number,
  projectsWithNextAction: number
): { level: HealthLevel; metric: string } {
  if (activeProjects === 0) return { level: 3, metric: "No projects" };
  const stalled = activeProjects - projectsWithNextAction;
  const ratio = projectsWithNextAction / activeProjects;
  
  if (ratio === 1) return { level: 1, metric: "All active" };
  if (ratio >= 0.9) return { level: 2, metric: `${stalled} stalled` };
  if (ratio >= 0.7) return { level: 3, metric: `${stalled} stalled` };
  if (ratio >= 0.5) return { level: 4, metric: `${stalled} stalled` };
  return { level: 5, metric: `${stalled} stalled` };
}

export function calculateReflectHealth(daysSinceReview: number | null): { level: HealthLevel; metric: string } {
  if (daysSinceReview === null) return { level: 5, metric: "Never reviewed" };
  if (daysSinceReview <= 3) return { level: 1, metric: `${daysSinceReview}d ago` };
  if (daysSinceReview <= 5) return { level: 2, metric: `${daysSinceReview}d ago` };
  if (daysSinceReview <= 7) return { level: 3, metric: `${daysSinceReview}d ago` };
  if (daysSinceReview <= 14) return { level: 4, metric: `${daysSinceReview}d ago` };
  return { level: 5, metric: `${daysSinceReview}d+ overdue` };
}

export function calculateEngageHealth(
  completedThisWeek: number,
  waitingForStale: number
): { level: HealthLevel; metric: string } {
  if (completedThisWeek >= 10 && waitingForStale === 0) return { level: 1, metric: `${completedThisWeek} done` };
  if (completedThisWeek >= 5 && waitingForStale <= 1) return { level: 2, metric: `${completedThisWeek} done` };
  if (completedThisWeek >= 3) return { level: 3, metric: `${completedThisWeek} done` };
  if (completedThisWeek >= 1) return { level: 4, metric: `${completedThisWeek} done` };
  return { level: 5, metric: "No progress" };
}
