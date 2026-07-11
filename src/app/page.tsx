"use client";

import { useState } from "react";
import { Search, Loader2, ArrowRight } from "lucide-react";
import { DetectionResult } from "@/lib/schemas";
import { ResultCard } from "@/components/result-card";
import { TechStackBadges } from "@/components/tech-stack-badges";
import { DetectionMethods } from "@/components/detection-methods";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setResult(data);
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-canvas-dark overflow-x-hidden">
      {/* Top Nav */}
      <nav className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 lg:px-10 border-b border-hairline">
        <div className="flex items-center gap-2">
          <span className="text-primary text-sm md:text-base font-semibold tracking-tight">
            RF
          </span>
        </div>
        <a
          href="https://github.com/jithin-jz/RF"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted hover:text-body transition-colors"
          aria-label="GitHub"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>
      </nav>

      {/* Hero Section */}
      <section className="w-full max-w-5xl mx-auto px-4 md:px-6 pt-12 md:pt-20 pb-8 md:pb-10">
        <div className="text-center mb-10 md:mb-16 animate-fade-in-up">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-tight tracking-tighter text-on-dark mb-4 md:mb-5">
            Uncover the Source
            <br />
            <span className="text-primary">Behind Any Site</span>
          </h1>
          <p className="text-sm md:text-base text-muted max-w-md md:max-w-lg mx-auto leading-relaxed px-2">
            Drop a link. We scan it. You get the repo, tech stack, and all the details. Zero signup, zero cost.
          </p>
        </div>

        {/* Search Input */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl mx-auto mb-10 md:mb-16 animate-fade-in-up-delay-1"
        >
          {/* Mobile: stacked layout */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:bg-surface-card sm:border sm:border-hairline sm:rounded-lg sm:h-12 sm:focus-within:border-primary/50 sm:transition-colors">
            <div className="flex items-center bg-surface-card border border-hairline rounded-lg h-12 sm:border-0 sm:rounded-none sm:h-full sm:flex-1">
              <Search className="w-4 h-4 text-muted ml-4 shrink-0" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste any URL here..."
                className="flex-1 bg-transparent px-3 h-full text-sm text-body placeholder-muted outline-none font-medium w-full"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="h-11 sm:h-9 sm:mr-1.5 px-5 bg-primary hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted text-on-primary text-sm font-semibold rounded-lg sm:rounded-md transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Scanning
                </>
              ) : (
                <>
                  Detect
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error State */}
        {error && (
          <div className="w-full max-w-2xl mx-auto mb-6 md:mb-8 p-3 md:p-4 bg-trading-down/10 border border-trading-down/20 rounded-lg text-trading-down text-sm text-center font-medium">
            {error}
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="w-full max-w-3xl mx-auto space-y-4">
            <div className="bg-surface-card rounded-xl p-4 md:p-6 border border-hairline">
              <div className="flex items-center gap-3 md:gap-4 mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full shimmer shrink-0" />
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="h-4 w-32 md:w-40 rounded shimmer" />
                  <div className="h-3 w-48 md:w-64 rounded shimmer" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 md:h-16 rounded-md shimmer" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="w-full max-w-3xl mx-auto space-y-3 md:space-y-4 animate-fade-in-up">
            <ResultCard result={result} />

            {result.techStack.length > 0 && (
              <TechStackBadges techStack={result.techStack} />
            )}

            {result.methods.length > 0 && (
              <DetectionMethods methods={result.methods} />
            )}
          </div>
        )}

        {/* Example URLs */}
        {!result && !loading && (
          <div className="w-full max-w-2xl mx-auto text-center animate-fade-in-up-delay-2">
            <p className="text-xs text-muted uppercase tracking-wider font-medium mb-3 md:mb-4">
              Go ahead, try one
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "nextjs.org",
                "tailwindcss.com",
                "cal.com",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setUrl(example)}
                  className="px-3 md:px-4 py-2 text-xs md:text-sm text-body bg-surface-card border border-hairline rounded-md hover:border-primary/40 hover:text-primary transition-all font-medium"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Stats Band */}
      {!result && !loading && (
        <section className="border-t border-hairline mt-6 md:mt-10">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 md:py-16">
            <div className="grid grid-cols-3 gap-4 md:gap-8 text-center">
              <div>
                <p className="text-xl md:text-3xl font-bold text-primary tracking-tight font-mono-num">
                  7
                </p>
                <p className="text-xs md:text-sm text-muted mt-1">Ways We Find It</p>
              </div>
              <div>
                <p className="text-xl md:text-3xl font-bold text-primary tracking-tight font-mono-num">
                  20+
                </p>
                <p className="text-xs md:text-sm text-muted mt-1">Tech We Spot</p>
              </div>
              <div>
                <p className="text-xl md:text-3xl font-bold text-primary tracking-tight font-mono-num">
                  100%
                </p>
                <p className="text-xs md:text-sm text-muted mt-1">Free. Always.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-hairline py-3 px-4 mb-0">
        <p className="text-xs text-muted text-center leading-none">
          open source. no tracking. just vibes and code.
        </p>
      </footer>
    </main>
  );
}
