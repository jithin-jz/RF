# Repo Detector 🔍

**Find the GitHub repository behind any website — instantly.**

Paste any URL and discover if the project is open source. See the repo, stars, tech stack, license, and detection methods used.

![Repo Detector](https://img.shields.io/badge/Built%20with-Next.js%2015-black?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## Features

- 🔗 **Paste any URL** — works with any website
- 🔍 **Multi-strategy detection** — HTML scraping, GitHub API search, DNS analysis, source maps, meta tags
- 🛠️ **Tech stack fingerprinting** — detects frameworks, libraries, hosting providers
- 📊 **Repo details** — stars, forks, license, language, topics, last update
- ⚡ **Fast** — results in 2-5 seconds
- 🆓 **Completely free** — no account required
- 🔒 **No data stored** — your queries are never saved

## Detection Methods

| Method | What It Does | Confidence |
|--------|-------------|-----------|
| HTML Scraping | Finds GitHub links in page HTML | Medium |
| Meta Tags | Checks `<meta>` and `<link>` elements | High |
| GitHub API Search | Searches repos by homepage URL | High |
| Hosting Detection | Identifies GitHub Pages, Vercel, Netlify | High |
| Source Maps | Analyzes JS source maps for repo references | Medium |
| Tech Fingerprinting | Identifies frameworks and libraries | Medium |

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTML Parsing**: Cheerio
- **GitHub API**: Octokit / REST
- **Validation**: Zod
- **Icons**: Lucide React
- **Deployment**: Vercel (free tier)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/repo-detector.git
cd repo-detector
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
# Optional but recommended (increases GitHub API rate limit from 10 to 30 requests/min)
# Create at: https://github.com/settings/tokens (no special scopes needed)
GITHUB_TOKEN=ghp_your_token_here
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm start
```

## Architecture

```
src/
├── app/
│   ├── api/
│   │   └── detect/
│   │       └── route.ts        # POST /api/detect — main detection endpoint
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout with metadata
│   └── page.tsx                # Home page (search UI + results)
├── components/
│   ├── result-card.tsx         # Repo details display
│   ├── tech-stack-badges.tsx   # Tech stack visualization
│   └── detection-methods.tsx   # Detection transparency panel
└── lib/
    ├── detector.ts             # Core detection engine (5 strategies)
    ├── tech-detector.ts        # Technology fingerprinting
    ├── schemas.ts              # Zod schemas for type safety
    └── utils.ts                # Utility functions
```

## How It Works

1. **User pastes URL** → Frontend sends POST to `/api/detect`
2. **Server fetches page** → Downloads HTML, captures response headers
3. **Runs 5 detection strategies in parallel:**
   - Scrapes HTML for GitHub links (anchors, footer, nav)
   - Checks meta tags and link elements
   - Analyzes source maps and script references
   - Detects hosting patterns (GitHub Pages, Vercel, etc.)
   - Searches GitHub API for repos with matching homepage
4. **Ranks candidates** by confidence level
5. **Fetches repo details** from GitHub API for the best match
6. **Fingerprints tech stack** from HTML patterns and headers
7. **Returns unified result** to frontend

## Deployment

### Vercel (Recommended — Free)

1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add `GITHUB_TOKEN` to Environment Variables
4. Deploy

### Other Platforms

Works on any platform that supports Next.js:
- Netlify
- Railway
- Render
- Self-hosted (Docker)

## Rate Limits

- **Without GitHub token**: ~10 API requests/minute
- **With GitHub token**: ~30 API requests/minute
- **Tip**: For production, add caching (Redis/Upstash) to avoid hitting limits

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License — see [LICENSE](LICENSE) for details.

## Roadmap

- [ ] Add caching (Redis/Upstash) for repeated queries
- [ ] Support GitLab and Bitbucket detection
- [ ] Browser extension (one-click detect on any page)
- [ ] API endpoint for third-party integrations
- [ ] "Open source alternatives" suggestion engine
- [ ] Shareable result badges/cards
- [ ] Bulk URL scanning
- [ ] Historical tracking
