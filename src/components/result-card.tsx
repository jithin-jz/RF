"use client";

import { DetectionResult } from "@/lib/schemas";
import {
  Star,
  GitFork,
  Scale,
  Calendar,
  ExternalLink,
  XCircle,
  CheckCircle2,
  Code,
  CircleDot,
} from "lucide-react";

interface ResultCardProps {
  result: DetectionResult;
}

export function ResultCard({ result }: ResultCardProps) {
  if (!result.isOpenSource || !result.repo) {
    return (
      <div className="bg-surface-card border border-hairline rounded-xl p-6 md:p-10 text-center">
        <XCircle className="w-12 md:w-14 h-12 md:h-14 text-trading-down/60 mx-auto mb-4 md:mb-5" />
        <h2 className="text-base md:text-lg font-semibold text-on-dark mb-2">
          Not Open Source
        </h2>
        <p className="text-sm text-muted max-w-md mx-auto">
          No public repo found for{" "}
          <span className="text-body font-mono-num text-xs bg-surface-elevated px-2 py-0.5 rounded break-all">
            {result.url}
          </span>
        </p>
        <p className="text-xs text-muted/70 mt-4">
          Either it&apos;s closed-source or we couldn&apos;t crack it. Try checking the site footer.
        </p>
      </div>
    );
  }

  const { repo } = result;
  const lastUpdated = new Date(repo.lastUpdated).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="bg-surface-card border border-hairline rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-hairline">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 sm:justify-between">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <img
              src={repo.owner.avatarUrl}
              alt={repo.owner.login}
              className="w-10 h-10 md:w-11 md:h-11 rounded-full border-2 border-hairline shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-trading-up shrink-0" />
                <span className="text-[10px] md:text-xs font-semibold text-trading-up uppercase tracking-wider">
                  Open Source
                </span>
              </div>
              <h2 className="text-base md:text-lg font-bold text-on-dark truncate">
                {repo.fullName}
              </h2>
            </div>
          </div>
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-active text-on-primary text-sm font-semibold rounded-md transition-colors w-full sm:w-auto"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Repo
          </a>
        </div>

        {repo.description && (
          <p className="text-xs md:text-sm text-muted mt-3 md:mt-4 leading-relaxed">
            {repo.description}
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4">
        <StatItem
          icon={<Star className="w-3.5 h-3.5 text-primary" />}
          label="Stars"
          value={formatNumber(repo.stars)}
        />
        <StatItem
          icon={<GitFork className="w-3.5 h-3.5 text-info" />}
          label="Forks"
          value={formatNumber(repo.forks)}
          borderLeft
        />
        <StatItem
          icon={<Scale className="w-3.5 h-3.5 text-trading-up" />}
          label="License"
          value={repo.license || "None"}
          borderTop
        />
        <StatItem
          icon={<Calendar className="w-3.5 h-3.5 text-muted" />}
          label="Updated"
          value={lastUpdated}
          borderLeft
          borderTop
        />
      </div>

      {/* Tags Row */}
      <div className="p-3 md:p-4 border-t border-hairline flex flex-wrap items-center gap-1.5 md:gap-2">
        {repo.language && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-elevated rounded-sm text-[11px] md:text-xs text-body font-medium">
            <Code className="w-3 h-3" />
            {repo.language}
          </span>
        )}
        {repo.openIssues > 0 && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-elevated rounded-sm text-[11px] md:text-xs text-body font-medium">
            <CircleDot className="w-3 h-3 text-trading-up" />
            {repo.openIssues} issues
          </span>
        )}
        {repo.isArchived && (
          <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-sm text-[11px] md:text-xs font-semibold">
            Archived
          </span>
        )}
        {repo.topics.slice(0, 4).map((topic) => (
          <span
            key={topic}
            className="px-2.5 py-1 bg-canvas-dark border border-hairline text-muted rounded-sm text-[11px] md:text-xs font-medium hidden sm:inline-block"
          >
            {topic}
          </span>
        ))}
        {repo.topics.length > 4 && (
          <span className="px-2.5 py-1 text-muted text-[11px] md:text-xs font-medium hidden sm:inline-block">
            +{repo.topics.length - 4} more
          </span>
        )}
      </div>
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  borderLeft,
  borderTop,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  borderLeft?: boolean;
  borderTop?: boolean;
}) {
  return (
    <div
      className={`p-3 md:p-4 text-center ${borderLeft ? "border-l border-hairline" : ""} ${borderTop ? "border-t md:border-t-0 border-hairline" : ""}`}
    >
      <div className="flex items-center justify-center gap-1 mb-1">
        {icon}
        <span className="text-[9px] md:text-[10px] text-muted uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      <p className="text-sm md:text-base font-bold text-on-dark font-mono-num truncate">
        {value}
      </p>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
