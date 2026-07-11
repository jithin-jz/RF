import * as cheerio from "cheerio";
import { DetectionMethod, Repo } from "./schemas";
import { renderPage, fetchPage } from "./renderer";
import { detectTechStack } from "./tech-detector";
import type { TechStack } from "./schemas";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

// Patterns for GitHub/GitLab/Bitbucket URLs
const GITHUB_URL_REGEX =
  /https?:\/\/(www\.)?github\.com\/([a-zA-Z0-9\-_.]+)\/([a-zA-Z0-9\-_.]+)\/?/g;

const GITLAB_URL_REGEX =
  /https?:\/\/(www\.)?gitlab\.com\/([a-zA-Z0-9\-_.]+(?:\/[a-zA-Z0-9\-_.]+)*)\/([a-zA-Z0-9\-_.]+)\/?/g;

/**
 * Strategy 1: Deep HTML scraping — find any GitHub/GitLab links anywhere in the page
 */
function findRepoLinksInHTML(html: string, $: cheerio.CheerioAPI): { repo: string; source: string; platform: string }[] {
  const results: { repo: string; source: string; platform: string }[] = [];
  const seen = new Set<string>();

  // 1a. Check all anchor tags with href containing github.com or gitlab.com
  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    
    // GitHub
    const ghMatches = [...href.matchAll(GITHUB_URL_REGEX)];
    for (const match of ghMatches) {
      const owner = match[2];
      const repo = match[3].replace(/\.git$/, "");
      if (!isBlacklistedPath(repo) && !isBlacklistedOwner(owner)) {
        const fullName = `${owner}/${repo}`;
        if (!seen.has(fullName)) {
          seen.add(fullName);
          // Check context: is this link in footer, header, or a "source code" area?
          const context = getElementContext($, el);
          results.push({ repo: fullName, source: `HTML anchor (${context})`, platform: "github" });
        }
      }
    }

    // GitLab
    const glMatches = [...href.matchAll(GITLAB_URL_REGEX)];
    for (const match of glMatches) {
      const fullName = `${match[2]}/${match[3]}`.replace(/\.git$/, "");
      if (!seen.has(fullName)) {
        seen.add(fullName);
        results.push({ repo: fullName, source: "HTML anchor (GitLab)", platform: "gitlab" });
      }
    }
  });

  // 1b. Search the entire raw HTML for GitHub URLs (catches dynamically rendered links, comments, etc.)
  const rawGhMatches = [...html.matchAll(GITHUB_URL_REGEX)];
  for (const match of rawGhMatches) {
    const owner = match[2];
    const repo = match[3].replace(/\.git$/, "");
    if (!isBlacklistedPath(repo) && !isBlacklistedOwner(owner)) {
      const fullName = `${owner}/${repo}`;
      if (!seen.has(fullName)) {
        seen.add(fullName);
        results.push({ repo: fullName, source: "Raw HTML content", platform: "github" });
      }
    }
  }

  // 1c. Check for "View Source", "Source Code", "GitHub", "Repository" text patterns near links
  $("a").each((_, el) => {
    const text = $(el).text().toLowerCase().trim();
    const href = $(el).attr("href") || "";
    
    const sourceKeywords = ["source", "github", "gitlab", "repository", "repo", "code", "contribute", "fork", "star"];
    const hasKeyword = sourceKeywords.some(kw => text.includes(kw));
    
    if (hasKeyword && href.includes("github.com")) {
      const ghMatches = [...href.matchAll(GITHUB_URL_REGEX)];
      for (const match of ghMatches) {
        const owner = match[2];
        const repo = match[3].replace(/\.git$/, "");
        if (!isBlacklistedPath(repo) && !isBlacklistedOwner(owner)) {
          const fullName = `${owner}/${repo}`;
          if (!seen.has(`keyword:${fullName}`)) {
            seen.add(`keyword:${fullName}`);
            // Boost: this link explicitly says "source code" or "GitHub"
            results.push({ repo: fullName, source: `Labeled link ("${text.slice(0, 30)}")`, platform: "github" });
          }
        }
      }
    }
  });

  return results;
}

/**
 * Strategy 2: Check meta tags, link elements, and structured data
 */
function findRepoInMeta($: cheerio.CheerioAPI): { repo: string; source: string }[] {
  const results: { repo: string; source: string }[] = [];
  const seen = new Set<string>();

  // Standard meta/link selectors
  const metaSelectors = [
    'meta[property="og:see_also"]',
    'meta[name="github:repo"]',
    'meta[name="source"]',
    'meta[name="repository"]',
    'link[rel="source"]',
    'link[rel="repository"]',
    'link[rel="canonical"]',
  ];

  for (const selector of metaSelectors) {
    $(selector).each((_, el) => {
      const content = $(el).attr("content") || $(el).attr("href") || "";
      const matches = [...content.matchAll(GITHUB_URL_REGEX)];
      for (const match of matches) {
        const fullName = `${match[2]}/${match[3]}`.replace(/\.git$/, "");
        if (!isBlacklistedPath(match[3]) && !seen.has(fullName)) {
          seen.add(fullName);
          results.push({ repo: fullName, source: `Meta tag: ${selector}` });
        }
      }
    });
  }

  // Check JSON-LD structured data
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || "{}");
      const str = JSON.stringify(json);
      const matches = [...str.matchAll(GITHUB_URL_REGEX)];
      for (const match of matches) {
        const fullName = `${match[2]}/${match[3]}`.replace(/\.git$/, "");
        if (!isBlacklistedPath(match[3]) && !seen.has(fullName)) {
          seen.add(fullName);
          results.push({ repo: fullName, source: "JSON-LD structured data" });
        }
      }
    } catch {
      // Invalid JSON, skip
    }
  });

  return results;
}

/**
 * Strategy 3: Check source maps and build artifacts
 */
function findSourceMapReferences(html: string, $: cheerio.CheerioAPI): { repo: string; source: string }[] {
  const results: { repo: string; source: string }[] = [];
  const seen = new Set<string>();

  // Check script sources for known patterns
  $("script[src]").each((_, el) => {
    const src = $(el).attr("src") || "";
    
    // Check for GitHub raw content URLs
    const rawMatch = src.match(/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)/);
    if (rawMatch) {
      const fullName = `${rawMatch[1]}/${rawMatch[2]}`;
      if (!seen.has(fullName)) {
        seen.add(fullName);
        results.push({ repo: fullName, source: "GitHub raw content URL" });
      }
    }

    // Check for jsDelivr CDN (often points to GitHub repos)
    const jsdelivrMatch = src.match(/cdn\.jsdelivr\.net\/(?:gh|npm)\/([^/]+)\/([^/@]+)/);
    if (jsdelivrMatch) {
      const fullName = `${jsdelivrMatch[1]}/${jsdelivrMatch[2]}`;
      if (!seen.has(fullName)) {
        seen.add(fullName);
        results.push({ repo: fullName, source: "jsDelivr CDN reference" });
      }
    }

    // Check for unpkg (npm packages → GitHub)
    const unpkgMatch = src.match(/unpkg\.com\/([^/@]+)/);
    if (unpkgMatch) {
      // We'd need to look up the npm package to find the repo, skip for now
    }
  });

  // Check inline scripts for webpack/vite source references
  $("script:not([src])").each((_, el) => {
    const content = $(el).html() || "";
    
    // Webpack chunk loading patterns sometimes contain repo info
    const ghMatches = [...content.matchAll(/github\.com\/([a-zA-Z0-9\-_.]+)\/([a-zA-Z0-9\-_.]+)/g)];
    for (const match of ghMatches) {
      const fullName = `${match[1]}/${match[2]}`.replace(/\.git$/, "");
      if (!isBlacklistedPath(match[2]) && !seen.has(fullName)) {
        seen.add(fullName);
        results.push({ repo: fullName, source: "Inline script reference" });
      }
    }
  });

  return results;
}

/**
 * Strategy 4: DNS and hosting detection
 */
function detectHostingRepo(url: string, headers: Record<string, string>): { repo: string; source: string } | null {
  const parsed = new URL(url);

  // GitHub Pages: <user>.github.io/<repo> or <user>.github.io
  const ghPagesMatch = parsed.hostname.match(/^([a-zA-Z0-9\-]+)\.github\.io$/);
  if (ghPagesMatch) {
    const user = ghPagesMatch[1];
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const repo = pathParts[0] || `${user}.github.io`;
    return { repo: `${user}/${repo}`, source: "GitHub Pages domain" };
  }

  // Vercel preview URLs: <project>-<hash>-<team>.vercel.app
  // Not useful for repo detection, but the x-vercel-id header confirms Vercel hosting

  return null;
}

/**
 * Strategy 5: GitHub API search by homepage URL
 */
async function searchGitHubByHomepage(url: string): Promise<{ repo: string; source: string }[]> {
  const results: { repo: string; source: string }[] = [];
  const cleanUrl = url.replace(/\/$/, "");

  // Try multiple URL variations
  const searchQueries = [
    cleanUrl,
    cleanUrl.replace(/^https?:\/\/www\./, "https://"),
    cleanUrl.replace(/^https?:\/\//, ""),
  ];

  const seen = new Set<string>();

  for (const query of searchQueries.slice(0, 2)) { // Limit to 2 queries to save rate limit
    try {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "RepoDetector/1.0",
      };
      if (GITHUB_TOKEN) {
        headers.Authorization = `token ${GITHUB_TOKEN}`;
      }

      const res = await fetch(
        `${GITHUB_API_BASE}/search/repositories?q=homepage:${encodeURIComponent(query)}&sort=stars&order=desc&per_page=3`,
        { headers, next: { revalidate: 3600 } }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.items) {
          for (const item of data.items) {
            if (!seen.has(item.full_name)) {
              seen.add(item.full_name);
              results.push({ repo: item.full_name, source: "GitHub API homepage search" });
            }
          }
        }
      }
    } catch {
      // Continue
    }
  }

  return results;
}

/**
 * Strategy 6: Check common paths for repo indicators
 * Many sites expose package.json, humans.txt, or .well-known files
 */
async function checkCommonPaths(baseUrl: string): Promise<{ repo: string; source: string }[]> {
  const results: { repo: string; source: string }[] = [];
  const seen = new Set<string>();

  const pathsToCheck = [
    "/package.json",
    "/humans.txt",
    "/.well-known/security.txt",
  ];

  for (const path of pathsToCheck) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${baseUrl}${path}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RepoDetector/1.0)",
        },
        redirect: "follow",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const text = await res.text();

        // Look for GitHub URLs in the response
        const matches = [...text.matchAll(GITHUB_URL_REGEX)];
        for (const match of matches) {
          const fullName = `${match[2]}/${match[3]}`.replace(/\.git$/, "");
          if (!isBlacklistedPath(match[3]) && !seen.has(fullName)) {
            seen.add(fullName);
            results.push({ repo: fullName, source: `Found in ${path}` });
          }
        }

        // For package.json, check the "repository" field
        if (path === "/package.json") {
          try {
            const pkg = JSON.parse(text);
            const repoUrl = typeof pkg.repository === "string"
              ? pkg.repository
              : pkg.repository?.url || "";
            
            const ghMatch = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
            if (ghMatch) {
              const fullName = `${ghMatch[1]}/${ghMatch[2]}`;
              if (!seen.has(fullName)) {
                seen.add(fullName);
                results.push({ repo: fullName, source: "package.json repository field" });
              }
            }
          } catch {
            // Not valid JSON
          }
        }
      }
    } catch {
      // Timeout or error, skip
    }
  }

  return results;
}

/**
 * Fetch repository details from GitHub API
 */
async function fetchRepoDetails(fullName: string): Promise<Repo | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RepoDetector/1.0",
    };
    if (GITHUB_TOKEN) {
      headers.Authorization = `token ${GITHUB_TOKEN}`;
    }

    const res = await fetch(`${GITHUB_API_BASE}/repos/${fullName}`, {
      headers,
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;

    const data = await res.json();

    // Skip forks with 0 stars (likely not the real source)
    if (data.fork && data.stargazers_count === 0) {
      return null;
    }

    return {
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      url: data.html_url,
      stars: data.stargazers_count,
      forks: data.forks_count,
      language: data.language,
      license: data.license?.spdx_id || null,
      lastUpdated: data.updated_at,
      topics: data.topics || [],
      openIssues: data.open_issues_count,
      isArchived: data.archived,
      defaultBranch: data.default_branch,
      owner: {
        login: data.owner.login,
        avatarUrl: data.owner.avatar_url,
        type: data.owner.type,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Get context of where a link appears on the page
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getElementContext($: cheerio.CheerioAPI, el: any): string {
  const parents = $(el).parents();
  for (let i = 0; i < parents.length && i < 5; i++) {
    const tagName = parents.eq(i).prop("tagName")?.toLowerCase();
    if (tagName === "footer" || parents.eq(i).attr("class")?.toLowerCase().includes("footer")) {
      return "footer";
    }
    if (tagName === "header" || tagName === "nav" || parents.eq(i).attr("class")?.toLowerCase().includes("header") || parents.eq(i).attr("class")?.toLowerCase().includes("nav")) {
      return "header/nav";
    }
  }
  return "body";
}

/**
 * Blacklisted repo paths (GitHub features, not actual repos)
 */
function isBlacklistedPath(path: string): boolean {
  const blacklist = [
    "issues", "pulls", "marketplace", "explore", "settings",
    "notifications", "new", "login", "signup", "features",
    "pricing", "enterprise", "sponsors", "orgs", "topics",
    "trending", "collections", "stars", "watching", "followers",
    "following", "tab", "repositories", "",
  ];
  return blacklist.includes(path.toLowerCase().replace(/\/$/, ""));
}

/**
 * Blacklisted owners (generic, not real project owners)
 */
function isBlacklistedOwner(owner: string): boolean {
  const blacklist = ["about", "contact", "blog", "help", "support"];
  return blacklist.includes(owner.toLowerCase());
}

/**
 * Score candidates to pick the best match
 */
function scoreCandidates(
  candidates: { repo: string; source: string; platform?: string }[],
  url: string
): { repo: string; score: number }[] {
  const parsed = new URL(url);
  const domain = parsed.hostname.replace(/^www\./, "").split(".")[0]; // e.g., "nextjs" from "nextjs.org"

  return candidates.map(({ repo, source }) => {
    let score = 0;

    // Source-based scoring
    if (source.includes("package.json")) score += 150;
    if (source.includes("Labeled link")) score += 140;
    if (source.includes("Meta tag")) score += 130;
    if (source.includes("JSON-LD")) score += 125;
    if (source.includes("GitHub Pages")) score += 120;
    if (source.includes("header/nav") || source.includes("footer")) score += 110;
    if (source.includes("HTML anchor")) score += 100;
    if (source.includes("Raw HTML")) score += 80;
    if (source.includes("jsDelivr") || source.includes("raw content")) score += 70;
    if (source.includes("Inline script")) score += 60;
    if (source.includes("GitHub API")) score += 40; // Lowest — many false positives
    if (source.includes("GitHub name search")) score += 45; // Slightly better than homepage search

    // Name similarity bonus: if the repo name matches the domain
    const repoName = repo.split("/")[1]?.toLowerCase() || "";
    const ownerName = repo.split("/")[0]?.toLowerCase() || "";

    if (repoName === domain || repoName.includes(domain) || domain.includes(repoName)) {
      score += 50;
    }
    if (ownerName === domain || ownerName.includes(domain) || domain.includes(ownerName)) {
      score += 30;
    }

    // Penalize if it looks like a personal fork (common patterns)
    if (repoName.includes("tutorial") || repoName.includes("exercise") || repoName.includes("study")) {
      score -= 50;
    }

    return { repo, score };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Strategy 7: Search GitHub by the brand/domain name
 * This is a last-resort strategy for when we can't find links on the page
 */
async function searchGitHubByBrandName(url: string): Promise<{ repo: string; source: string }[]> {
  const results: { repo: string; source: string }[] = [];
  const parsed = new URL(url);
  const domain = parsed.hostname.replace(/^www\./, "");
  const brandName = domain.split(".")[0]; // e.g., "posthog" from "posthog.com"

  if (brandName.length < 3) return results; // Too short, would return noise

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RepoDetector/1.0",
    };
    if (GITHUB_TOKEN) {
      headers.Authorization = `token ${GITHUB_TOKEN}`;
    }

    // Search for repos with this name, sorted by stars
    const res = await fetch(
      `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(brandName)}+in:name&sort=stars&order=desc&per_page=5`,
      { headers, next: { revalidate: 3600 } }
    );

    if (res.ok) {
      const data = await res.json();
      if (data.items) {
        for (const item of data.items) {
          // Only include if the repo name or owner closely matches the brand
          const repoName = item.name.toLowerCase();
          const ownerName = item.owner.login.toLowerCase();
          const brand = brandName.toLowerCase();

          const nameMatch = repoName === brand || repoName.includes(brand) || brand.includes(repoName);
          const ownerMatch = ownerName === brand || ownerName.includes(brand) || brand.includes(ownerName);

          // Also check if the repo's homepage matches our URL
          const homepageMatch = item.homepage && 
            (item.homepage.includes(domain) || domain.includes(new URL(item.homepage).hostname.replace(/^www\./, "").split(".")[0]));

          if ((nameMatch || ownerMatch || homepageMatch) && item.stargazers_count >= 50) {
            results.push({ 
              repo: item.full_name, 
              source: `GitHub name search ("${brandName}")` 
            });
          }
        }
      }
    }
  } catch {
    // Continue
  }

  return results;
}

/**
 * Main detection engine: combines all strategies to find the source repo
 */
export async function detectRepository(url: string): Promise<{
  repo: Repo | null;
  methods: DetectionMethod[];
  techStack: TechStack[];
}> {
  const methods: DetectionMethod[] = [];
  const allCandidates: { repo: string; source: string; platform?: string }[] = [];

  // Fetch the page (try headless browser for full JS rendering, fallback to simple fetch)
  let html = "";
  let responseHeaders: Record<string, string> = {};

  try {
    // First try simple fetch (fast)
    const fetchResult = await fetchPage(url);
    html = fetchResult.html;
    responseHeaders = fetchResult.headers;

    // If the page looks like an SPA shell (very little text content), try headless browser
    const textContent = html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    const isLikelySPA = textContent.length < 500 || 
                        (html.includes("__NEXT_DATA__") === false && html.includes("id=\"root\"") && textContent.length < 2000);
    
    if (isLikelySPA) {
      try {
        const browserResult = await renderPage(url);
        html = browserResult.html;
        responseHeaders = { ...responseHeaders, ...browserResult.headers };
        methods.push({
          method: "browser_rendering",
          confidence: "high",
          source: "Used headless browser for SPA rendering",
        });
      } catch {
        // Browser rendering failed, continue with fetch result
      }
    }
  } catch (err) {
    return {
      repo: null,
      methods: [
        {
          method: "fetch",
          confidence: "low",
          source: `Failed to fetch URL: ${err instanceof Error ? err.message : "Unknown error"}`,
        },
      ],
      techStack: [],
    };
  }

  const $ = cheerio.load(html);

  // Run all strategies
  // Strategy 1: HTML scraping
  const htmlResults = findRepoLinksInHTML(html, $);
  for (const r of htmlResults) {
    allCandidates.push(r);
    methods.push({
      method: "html_scraping",
      confidence: r.source.includes("Labeled") ? "high" : "medium",
      source: `${r.source}: ${r.repo}`,
    });
  }

  // Strategy 2: Meta tags
  const metaResults = findRepoInMeta($);
  for (const r of metaResults) {
    allCandidates.push({ ...r, platform: "github" });
    methods.push({
      method: "meta_tags",
      confidence: "high",
      source: `${r.source}: ${r.repo}`,
    });
  }

  // Strategy 3: Source maps
  const sourceResults = findSourceMapReferences(html, $);
  for (const r of sourceResults) {
    allCandidates.push({ ...r, platform: "github" });
    methods.push({
      method: "source_maps",
      confidence: "medium",
      source: `${r.source}: ${r.repo}`,
    });
  }

  // Strategy 4: Hosting detection
  const hostingResult = detectHostingRepo(url, responseHeaders);
  if (hostingResult) {
    allCandidates.push({ ...hostingResult, platform: "github" });
    methods.push({
      method: "hosting_detection",
      confidence: "high",
      source: `${hostingResult.source}: ${hostingResult.repo}`,
    });
  }

  // Strategy 5: GitHub API search
  const apiResults = await searchGitHubByHomepage(url);
  for (const r of apiResults) {
    allCandidates.push({ ...r, platform: "github" });
    methods.push({
      method: "github_api_search",
      confidence: "medium",
      source: `${r.source}: ${r.repo}`,
    });
  }

  // Strategy 6: Common paths (package.json, humans.txt, etc.)
  const pathResults = await checkCommonPaths(url);
  for (const r of pathResults) {
    allCandidates.push({ ...r, platform: "github" });
    methods.push({
      method: "common_paths",
      confidence: "high",
      source: `${r.source}: ${r.repo}`,
    });
  }

  // Strategy 7: Search GitHub by domain/brand name (last resort)
  // Only if we haven't found anything yet via other methods
  if (allCandidates.length === 0 || allCandidates.every(c => c.source.includes("GitHub API homepage"))) {
    const brandResults = await searchGitHubByBrandName(url);
    for (const r of brandResults) {
      allCandidates.push({ ...r, platform: "github" });
      methods.push({
        method: "github_name_search",
        confidence: "medium",
        source: `${r.source}: ${r.repo}`,
      });
    }
  }

  // Detect tech stack
  const techStack = detectTechStack(html, responseHeaders);

  // Score and rank candidates
  const scored = scoreCandidates(allCandidates, url);

  // Determine if we have any "direct" evidence (not just API search)
  const hasDirectEvidence = allCandidates.some(
    c => !c.source.includes("GitHub API homepage search")
  );

  // Try to fetch repo details for top candidates
  let bestRepo: Repo | null = null;

  for (const { repo: fullName } of scored.slice(0, 5)) { // Check top 5
    const repo = await fetchRepoDetails(fullName);
    if (repo) {
      // If we ONLY have API search results (no direct evidence from the page itself),
      // require the repo to be relevant: high stars, or name matches domain
      if (!hasDirectEvidence) {
        const parsed = new URL(url);
        const domain = parsed.hostname.replace(/^www\./, "").split(".")[0].toLowerCase();
        const repoName = repo.name.toLowerCase();
        const ownerName = repo.owner.login.toLowerCase();

        const nameMatches = repoName.includes(domain) || domain.includes(repoName) ||
                           ownerName.includes(domain) || domain.includes(ownerName);
        const hasSignificantStars = repo.stars >= 100;

        if (!nameMatches && !hasSignificantStars) {
          continue; // Skip — likely a false positive
        }
      }
      bestRepo = repo;
      break;
    }
  }

  return { repo: bestRepo, methods, techStack };
}
