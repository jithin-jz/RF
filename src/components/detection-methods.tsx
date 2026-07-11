"use client";

import { DetectionMethod } from "@/lib/schemas";
import { Radar, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface DetectionMethodsProps {
  methods: DetectionMethod[];
}

const confidenceStyles: Record<DetectionMethod["confidence"], string> = {
  high: "text-trading-up bg-trading-up/10 border-trading-up/20",
  medium: "text-primary bg-primary/10 border-primary/20",
  low: "text-muted bg-muted/10 border-muted/20",
};

export function DetectionMethods({ methods }: DetectionMethodsProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-surface-card border border-hairline rounded-xl p-4 md:p-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <Radar className="w-4 h-4 text-muted" />
          <h3 className="text-sm font-semibold text-body">
            Detection Methods
          </h3>
          <span className="text-[10px] text-muted bg-canvas-dark border border-hairline px-2 py-0.5 rounded font-mono-num font-medium">
            {methods.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 md:mt-4 space-y-2">
          {methods.map((method, idx) => (
            <div
              key={idx}
              className="flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-2 md:gap-3 p-2.5 md:p-3 bg-canvas-dark border border-hairline rounded-md"
            >
              <span
                className={`px-2 py-0.5 rounded text-[9px] md:text-[10px] font-semibold uppercase tracking-wider border shrink-0 ${confidenceStyles[method.confidence]}`}
              >
                {method.confidence}
              </span>
              <span className="text-[11px] md:text-xs text-muted-strong font-mono-num shrink-0">
                {method.method}
              </span>
              <span className="text-[11px] md:text-xs text-muted truncate w-full sm:w-auto">
                {method.source}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
