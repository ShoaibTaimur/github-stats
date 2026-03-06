# GitHub Stats Create

Dark-theme GitHub stats card generator for profile `README.md` embeds.

Users can create a custom card, copy Markdown, and paste it into their GitHub profile README. The card image is generated from live GitHub API data whenever the image URL is fetched.

## Features

- Dark-first web UI for building cards
- Custom title, theme, and visible metrics
- Markdown + direct card URL copy buttons
- Configurable cache interval per card (`cache_seconds`)
- Works with Express locally and Vercel serverless routes

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set values.

3. Run in dev mode:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Environment Variables

- `PORT` default: `3000`
- `GITHUB_TOKEN` optional, recommended to avoid strict rate limits
- `MAX_REPOS` default: `30` (range `1-100`)
- `CARD_CACHE_SECONDS` default: `300` (range `60-3600`)

## Embed Example

```md
![yourname GitHub Stats](https://your-domain.com/api/card?username=yourname&theme=dark&show=repos,stars,forks,followers,following,lines&cache_seconds=300)
```

## Notes

- "Estimated Lines" is an approximation based on repository size metadata.
- Contributions require `GITHUB_TOKEN`; otherwise the field may show `--`.
- Refresh cadence depends on your `cache_seconds` and downstream caching behavior.

## Deploy

Deploy to Vercel by importing this repo. The project works with Vercel auto-detection and does not require `vercel.json`.
