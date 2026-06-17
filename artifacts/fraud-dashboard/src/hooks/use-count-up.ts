import { useState, useEffect } from "react";

export function useCountUp(endValue: number, durationMs: number = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const progressPercentage = Math.min(progress / durationMs, 1);
      
      // easeOutExpo
      const easeProgress = progressPercentage === 1 ? 1 : 1 - Math.pow(2, -10 * progressPercentage);
      
      setCount(Math.floor(easeProgress * endValue));

      if (progress < durationMs) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCount(endValue);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [endValue, durationMs]);

  return count;
}
