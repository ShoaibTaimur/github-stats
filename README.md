# GitHub Stats Create

Generate a modern GitHub stats card, copy the Markdown, and paste it into your profile `README.md`.

The card image is served from your API endpoint, so it stays up to date as GitHub data changes.

## Live Website

- `https://stats.shoaaib.site`

## What This Project Does

- Provides a web UI where a user enters a GitHub username and picks a visual theme.
- Generates a card URL (`/api/card?...`) and Markdown snippet.
- Renders an SVG card with:
  - Core metrics: repositories, stars, followers, following
  - Language distribution (donut + bars)
- Supports both:
  - Express server (`src/server.js`) for local/dev usage
  - Vercel serverless handlers (`api/card.js`, `api/summary.js`) for deployment

## Card Features (Complete)

- Dynamic SVG card generated from live GitHub data
- Core stats tiles:
  - Repositories
  - Stars
  - Followers
  - Following
- Language insights:
  - Donut chart showing full language distribution
  - Language percentage bars
  - Uses per-repo GitHub `/languages` byte data for better accuracy
  - Includes secondary languages (for example PowerShell inside non-PowerShell repos)
  - Automatic fallback to repo primary-language estimation if language API calls fail
- Profile header:
  - GitHub username
  - Display name
  - Member since year
- Auto-resizing layout:
  - Card height grows when more language rows are present
  - Sections are isolated to prevent text overlap
- Theme system:
  - `dark`, `ocean`, `forest`, `graphite`, `clean`, `warm`
  - Theme changes the full card vibe (background, panels, accents, charts, borders)
- Caching control:
  - `cache_seconds` query support (`60-3600`)
  - Cache headers set for CDN/browser behavior
- Embed-ready output:
  - Direct Markdown snippet generation
  - Stable card URL for GitHub profile README usage

## Website Tour (End-to-End)

1. Open the site.
2. Enter GitHub username.
3. Choose theme.
4. Select refresh interval (cache behavior).
5. Click **Generate Card**.
6. Preview updates instantly.
7. Copy Markdown or copy direct card URL.
8. Paste Markdown in your GitHub profile `README.md`.

## Markdown Output Example

```md
![octocat GitHub Stats](https://stats.shoaaib.site/api/card?username=octocat&theme=dark&cache_seconds=300)
```

## API Reference

### `GET /api/summary`
Returns profile + counters + language data in JSON.

Query params:
- `username` (required)

Example:
- `/api/summary?username=octocat`

### `GET /api/card`
Returns SVG card.

Query params:
- `username` (required)
- `theme` (optional): `dark`, `ocean`, `forest`, `graphite`, `clean`, `warm`
- `cache_seconds` (optional): `60` to `3600`

Example:
- `/api/card?username=octocat&theme=forest&cache_seconds=300`

## Environment Variables

- `PORT` default: `3000`
- `GITHUB_TOKEN` optional but recommended (higher GitHub API rate limits, better reliability)
- `MAX_REPOS` default: `30` (range `1-100`)
- `ALL_REPOS_MODE` default: `true` (when `true`, ignores `MAX_REPOS` and scans until hard limit)
- `ALL_REPOS_HARD_LIMIT` default: `300` (range `50-2000`, safety cap for all-repos mode)
- `GITHUB_REQUEST_TIMEOUT_MS` default: `8000` (range `2000-20000`)
- `LANGUAGE_FETCH_CONCURRENCY` default: `6` (range `1-20`, controls parallel `/languages` requests)
- `CARD_CACHE_SECONDS` default: `300` (range `60-3600`)

### All Repos Mode (With Safeguards)

To scan more than a fixed repo count, enable:

- `ALL_REPOS_MODE=true`
- Set `ALL_REPOS_HARD_LIMIT` to a safe maximum for your deployment

Safeguards included:
- hard repo cap (`ALL_REPOS_HARD_LIMIT`)
- request timeout (`GITHUB_REQUEST_TIMEOUT_MS`)
- controlled parallelism for language API calls (`LANGUAGE_FETCH_CONCURRENCY`)
- normal GitHub rate limiting still applies

### Language Accuracy

Language totals now come from each repository's GitHub `/languages` endpoint (byte-level aggregation), so secondary languages like PowerShell are included.

If those calls fail (for example due to rate limits), the system automatically falls back to repo primary-language estimation.

## Do You Need `.env` and `.env.example`?

Yes, keep both:
- `.env.example`: template committed to git (safe placeholders, shared config shape)
- `.env`: real local/deployment values (private, should not be committed)

So these are **not redundant**.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.example .env
```

3. Fill values in `.env`.

4. Run dev server:

```bash
npm run dev
```

5. Open:
- `http://localhost:3000`

## Deployment (Vercel)

1. Push repo to GitHub.
2. Import project in Vercel.
3. Set env vars in Vercel project settings.
4. Deploy.

No `vercel.json` is required for this setup.

## Realtime / Freshness Note

Cards are dynamically generated, but caches still apply. Freshness depends on:
- `cache_seconds` query param
- downstream caching behavior (GitHub/Vercel/CDN)

## Project Structure

- `public/` - frontend generator UI
- `src/github.js` - GitHub API data fetch + aggregation
- `src/card.js` - SVG card rendering
- `src/themes.js` - theme definitions
- `src/handlers.js` - shared request handlers
- `src/server.js` - Express app entry
- `api/` - Vercel serverless endpoints

## Troubleshooting

- `username is required`
  - Missing `username` in query.
- Card not refreshing quickly
  - Lower `cache_seconds` (minimum 60).
- Vercel function errors
  - Check Vercel logs and ensure env vars are set.
- Rate limit issues
  - Set `GITHUB_TOKEN`.
