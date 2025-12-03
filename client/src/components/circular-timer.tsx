import { useState, useEffect } from "react";

interface CircularTimerProps {
  duration?: number;
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
  const elapsed = duration - timeLeft;
  const totalTicks = 12;
  const activeTicks = Math.floor((elapsed / duration) * totalTicks);

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          r="55"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-muted-foreground/20"
        />

        {Array.from({ length: totalTicks }).map((_, i) => {
          const angle = (i / totalTicks) * 360 - 90;
          const isActive = i < activeTicks;
          const x1 = 70 + 45 * Math.cos(angle * (Math.PI / 180));
          const y1 = 70 + 45 * Math.sin(angle * (Math.PI / 180));
          const x2 = 70 + 55 * Math.cos(angle * (Math.PI / 180));
          const y2 = 70 + 55 * Math.sin(angle * (Math.PI / 180));

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              strokeWidth={2}
              className={isActive ? "stroke-primary" : "stroke-muted-foreground/30"}
            />
          );
        })}

        <text
          x="70"
          y="78"
          textAnchor="middle"
          fontSize="28"
          fontWeight="bold"
          className="fill-foreground"
        >
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </text>
      </svg>
    </div>
  );
}
