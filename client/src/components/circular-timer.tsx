import { useState, useEffect } from "react";

interface CircularTimerProps {
  duration?: number; // in seconds, default 120 (2 minutes)
  onComplete?: () => void;
}

export default function CircularTimer({ duration = 120, onComplete }: CircularTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete?.();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, onComplete]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = (duration - timeLeft) / duration;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - progress);

  // Calculate number of ticks (12 ticks for a clock)
  const totalTicks = 12;
  const activeTicks = Math.ceil(totalTicks * (1 - progress));

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <svg width="120" height="120" className="relative">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-muted-foreground/20"
        />

        {/* Progress circle */}
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-primary transition-all duration-1000"
          strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "60px 60px" }}
        />

        {/* Ticks */}
        {Array.from({ length: totalTicks }).map((_, i) => {
          const angle = (i / totalTicks) * 360;
          const isActive = i < activeTicks;
          const x1 = 60 + 38 * Math.cos((angle - 90) * (Math.PI / 180));
          const y1 = 60 + 38 * Math.sin((angle - 90) * (Math.PI / 180));
          const x2 = 60 + 45 * Math.cos((angle - 90) * (Math.PI / 180));
          const y2 = 60 + 45 * Math.sin((angle - 90) * (Math.PI / 180));

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isActive ? "currentColor" : "currentColor"}
              strokeWidth={isActive ? 2.5 : 1.5}
              className={isActive ? "text-primary" : "text-muted-foreground/30"}
            />
          );
        })}

        {/* Time text */}
        <text
          x="60"
          y="70"
          textAnchor="middle"
          fontSize="24"
          fontWeight="bold"
          fill="currentColor"
          className="text-foreground"
        >
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </text>
      </svg>
    </div>
  );
}
