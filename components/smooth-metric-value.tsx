"use client";

import { useEffect, useState } from "react";

type MetricSnapshot = {
  current: string;
  previous: string | null;
  revision: number;
};

export function SmoothMetricValue({
  value,
  className = "",
  title,
}: {
  value: string;
  className?: string;
  title?: string;
}) {
  const [snapshot, setSnapshot] = useState<MetricSnapshot>({
    current: value,
    previous: null,
    revision: 0,
  });

  useEffect(() => {
    setSnapshot((current) => {
      if (current.current === value) return current;

      return {
        current: value,
        previous: current.current,
        revision: current.revision + 1,
      };
    });
  }, [value]);

  return (
    <span
      className={`smooth-metric-value inline-grid max-w-full align-baseline ${className}`}
      title={title ?? value}
    >
      {snapshot.previous !== null ? (
        <span
          key={`previous-${snapshot.revision}`}
          className="smooth-metric-value-out col-start-1 row-start-1"
          aria-hidden="true"
        >
          {snapshot.previous}
        </span>
      ) : null}
      <span
        key={`current-${snapshot.revision}`}
        className={`${snapshot.revision ? "smooth-metric-value-in" : ""} col-start-1 row-start-1`}
        aria-hidden="true"
      >
        {snapshot.current}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
