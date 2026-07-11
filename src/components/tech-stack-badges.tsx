"use client";

import { TechStack } from "@/lib/schemas";
import { Layers } from "lucide-react";

interface TechStackBadgesProps {
  techStack: TechStack[];
}

const categoryStyles: Record<TechStack["category"], string> = {
  framework: "bg-primary/5 text-primary border-primary/20",
  library: "bg-info/5 text-info border-info/20",
  language: "bg-primary-active/5 text-primary-active border-primary-active/20",
  hosting: "bg-trading-up/5 text-trading-up border-trading-up/20",
  cms: "bg-trading-down/5 text-trading-down border-trading-down/20",
  tool: "bg-muted-strong/5 text-muted-strong border-muted-strong/20",
};

const confidenceIndicator: Record<TechStack["confidence"], string> = {
  high: "●",
  medium: "◐",
  low: "○",
};

export function TechStackBadges({ techStack }: TechStackBadgesProps) {
  return (
    <div className="bg-surface-card border border-hairline rounded-xl p-4 md:p-6">
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <Layers className="w-4 h-4 text-muted" />
        <h3 className="text-sm font-semibold text-body">Tech Stack</h3>
      </div>

      <div className="flex flex-wrap gap-1.5 md:gap-2">
        {techStack.map((tech, idx) => (
          <span
            key={idx}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md text-[11px] md:text-xs font-semibold ${categoryStyles[tech.category]}`}
            title={`${tech.category} - Confidence: ${tech.confidence}`}
          >
            <span className="opacity-60 text-[9px] md:text-[10px]">
              {confidenceIndicator[tech.confidence]}
            </span>
            {tech.name}
          </span>
        ))}
      </div>

      <div className="mt-3 md:mt-4 flex items-center gap-3 md:gap-4 text-[9px] md:text-[10px] text-muted">
        <span>● High</span>
        <span>◐ Medium</span>
        <span>○ Low</span>
      </div>
    </div>
  );
}
