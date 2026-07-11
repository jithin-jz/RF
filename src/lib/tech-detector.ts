import * as cheerio from "cheerio";
import { TechStack } from "./schemas";

/**
 * Tech fingerprints: patterns found in HTML/headers that indicate specific technologies.
 * Each fingerprint has a selector or pattern to look for in the page source.
 */
interface TechFingerprint {
  name: string;
  category: TechStack["category"];
  patterns: {
    type: "html" | "header" | "meta" | "script" | "global";
    selector?: string;
    attribute?: string;
    contains?: string;
    headerName?: string;
    headerContains?: string;
  }[];
}

const FINGERPRINTS: TechFingerprint[] = [
  {
    name: "Next.js",
    category: "framework",
    patterns: [
      { type: "meta", selector: 'meta[name="next-head-count"]' },
      { type: "script", selector: 'script[src*="/_next/"]' },
      { type: "html", selector: "#__next" },
      { type: "header", headerName: "x-powered-by", headerContains: "Next.js" },
    ],
  },
  {
    name: "Nuxt.js",
    category: "framework",
    patterns: [
      { type: "html", selector: "#__nuxt" },
      { type: "script", selector: 'script[src*="/_nuxt/"]' },
    ],
  },
  {
    name: "React",
    category: "library",
    patterns: [
      { type: "html", selector: "#root[data-reactroot]" },
      { type: "script", selector: 'script[src*="react"]' },
      { type: "html", selector: "[data-reactid]" },
    ],
  },
  {
    name: "Vue.js",
    category: "framework",
    patterns: [
      { type: "html", selector: "[data-v-]" },
      { type: "html", selector: "#app[data-server-rendered]" },
    ],
  },
  {
    name: "Svelte",
    category: "framework",
    patterns: [
      { type: "html", selector: "[class*='svelte-']" },
      { type: "script", selector: 'script[src*="svelte"]' },
    ],
  },
  {
    name: "Angular",
    category: "framework",
    patterns: [
      { type: "html", selector: "[ng-version]" },
      { type: "html", selector: "app-root" },
      { type: "script", selector: 'script[src*="angular"]' },
    ],
  },
  {
    name: "Gatsby",
    category: "framework",
    patterns: [
      { type: "html", selector: "#___gatsby" },
      { type: "meta", selector: 'meta[name="generator"][content*="Gatsby"]' },
    ],
  },
  {
    name: "WordPress",
    category: "cms",
    patterns: [
      { type: "meta", selector: 'meta[name="generator"][content*="WordPress"]' },
      { type: "script", selector: 'script[src*="wp-content"]' },
      { type: "html", selector: 'link[href*="wp-content"]' },
    ],
  },
  {
    name: "Tailwind CSS",
    category: "library",
    patterns: [
      { type: "html", selector: "[class*='flex'][class*='items-']" },
      { type: "html", selector: "[class*='bg-'][class*='text-']" },
    ],
  },
  {
    name: "Vercel",
    category: "hosting",
    patterns: [
      { type: "header", headerName: "x-vercel-id" },
      { type: "header", headerName: "server", headerContains: "Vercel" },
    ],
  },
  {
    name: "Netlify",
    category: "hosting",
    patterns: [
      { type: "header", headerName: "server", headerContains: "Netlify" },
      { type: "header", headerName: "x-nf-request-id" },
    ],
  },
  {
    name: "Cloudflare",
    category: "hosting",
    patterns: [
      { type: "header", headerName: "server", headerContains: "cloudflare" },
      { type: "header", headerName: "cf-ray" },
    ],
  },
  {
    name: "Remix",
    category: "framework",
    patterns: [
      { type: "html", selector: 'link[rel="modulepreload"][href*="remix"]' },
      { type: "script", selector: 'script[src*="remix"]' },
    ],
  },
  {
    name: "Astro",
    category: "framework",
    patterns: [
      { type: "meta", selector: 'meta[name="generator"][content*="Astro"]' },
      { type: "html", selector: "[class*='astro-']" },
    ],
  },
  {
    name: "Hugo",
    category: "framework",
    patterns: [
      { type: "meta", selector: 'meta[name="generator"][content*="Hugo"]' },
    ],
  },
  {
    name: "Jekyll",
    category: "framework",
    patterns: [
      { type: "meta", selector: 'meta[name="generator"][content*="Jekyll"]' },
    ],
  },
  {
    name: "Docusaurus",
    category: "framework",
    patterns: [
      { type: "meta", selector: 'meta[name="generator"][content*="Docusaurus"]' },
      { type: "html", selector: "#docusaurus" },
    ],
  },
  {
    name: "Ruby on Rails",
    category: "framework",
    patterns: [
      { type: "meta", selector: 'meta[name="csrf-token"]' },
      { type: "header", headerName: "x-powered-by", headerContains: "Phusion Passenger" },
    ],
  },
  {
    name: "Django",
    category: "framework",
    patterns: [
      { type: "html", selector: 'input[name="csrfmiddlewaretoken"]' },
    ],
  },
  {
    name: "Laravel",
    category: "framework",
    patterns: [
      { type: "html", selector: 'meta[name="csrf-token"]' },
      { type: "header", headerName: "set-cookie", headerContains: "laravel_session" },
    ],
  },
];

/**
 * Detect tech stack from HTML content and response headers
 */
export function detectTechStack(
  html: string,
  headers: Record<string, string>
): TechStack[] {
  const $ = cheerio.load(html);
  const detected: TechStack[] = [];
  const seen = new Set<string>();

  for (const fingerprint of FINGERPRINTS) {
    let matched = false;
    let matchCount = 0;

    for (const pattern of fingerprint.patterns) {
      switch (pattern.type) {
        case "html":
        case "meta":
        case "script":
          if (pattern.selector && $(pattern.selector).length > 0) {
            matchCount++;
            matched = true;
          }
          break;

        case "header":
          if (pattern.headerName) {
            const headerValue = headers[pattern.headerName.toLowerCase()] || "";
            if (pattern.headerContains) {
              if (headerValue.toLowerCase().includes(pattern.headerContains.toLowerCase())) {
                matchCount++;
                matched = true;
              }
            } else if (headerValue) {
              matchCount++;
              matched = true;
            }
          }
          break;
      }
    }

    if (matched && !seen.has(fingerprint.name)) {
      seen.add(fingerprint.name);
      const confidence =
        matchCount >= 2 ? "high" : matchCount === 1 ? "medium" : "low";
      detected.push({
        name: fingerprint.name,
        category: fingerprint.category,
        confidence,
      });
    }
  }

  return detected;
}
