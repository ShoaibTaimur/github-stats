const { getTheme } = require("./themes");

const DEFAULT_METRICS = [
  "repos",
  "stars",
  "forks",
  "followers",
  "following",
  "lines"
];

function parseCardOptions(query) {
  const theme = typeof query.theme === "string" ? query.theme : "clean";

  const show =
    typeof query.show === "string" && query.show.trim().length
      ? query.show
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean)
      : DEFAULT_METRICS;

  const title = typeof query.title === "string" ? query.title.trim() : "";

  return {
    theme,
    show,
    title
  };
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatNumber(value) {
  if (typeof value !== "number") {
    return String(value);
  }
  return Intl.NumberFormat("en-US").format(value);
}

function metricRows(stats, show) {
  const counters = stats.counters;
  const profile = stats.profile;

  const map = {
    repos: ["Repositories", profile.publicRepos],
    stars: ["Stars", counters.stars],
    forks: ["Forks", counters.forks],
    followers: ["Followers", profile.followers],
    following: ["Following", profile.following],
    contributions: ["Contributions", counters.contributions ?? "--"],
    lines: ["Estimated Lines", stats.languages.estimatedTotalLines],
    scanned: ["Scanned Repos", counters.repositoriesScanned],
    issues: ["Open Issues", counters.openIssues]
  };

  return show.filter((id) => map[id]).map((id) => ({
    id,
    label: map[id][0],
    value: formatNumber(map[id][1])
  }));
}

function drawLanguageBars(topLanguages, y, theme) {
  if (!topLanguages.length) {
    return `<text x="32" y="${y}" fill="${theme.muted}" font-size="17">No language data available.</text>`;
  }

  return topLanguages
    .map((item, i) => {
      const rowY = y + i * 33;
      const barWidth = Math.max(8, Math.round((item.percent / 100) * 360));
      return `
        <text x="32" y="${rowY}" fill="${theme.muted}" font-size="16">${xmlEscape(item.language)}</text>
        <text x="400" y="${rowY}" text-anchor="end" fill="${theme.text}" font-size="16" font-weight="700">${item.percent.toFixed(1)}%</text>
        <rect x="425" y="${rowY - 13}" width="360" height="12" rx="6" fill="${theme.track}" />
        <rect x="425" y="${rowY - 13}" width="${barWidth}" height="12" rx="6" fill="${theme.accent}" />
      `;
    })
    .join("\n");
}

function generateCardSvg(stats, options) {
  const theme = getTheme(options.theme);
  const rows = metricRows(stats, options.show);
  const topLanguages = stats.languages.topLanguages.slice(0, 5);

  const featured = rows.slice(0, 4);
  const extra = rows.slice(4, 10);

  const cardHeight = 610;
  const title = options.title || `${stats.profile.username} GitHub Stats`;

  const featuredSvg = featured
    .map((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 32 + col * 420;
      const y = 92 + row * 122;

      return `
        <rect x="${x}" y="${y}" width="390" height="100" rx="14" fill="${theme.tile}" stroke="${theme.border}" />
        <text x="${x + 20}" y="${y + 35}" fill="${theme.muted}" font-size="16">${xmlEscape(item.label)}</text>
        <text x="${x + 20}" y="${y + 75}" fill="${theme.text}" font-size="38" font-weight="800">${xmlEscape(item.value)}</text>
      `;
    })
    .join("\n");

  const extraSvg = extra
    .map((item, index) => {
      const y = 346 + index * 28;
      return `
        <text x="32" y="${y}" fill="${theme.muted}" font-size="16">${xmlEscape(item.label)}</text>
        <text x="400" y="${y}" text-anchor="end" fill="${theme.text}" font-size="17" font-weight="700">${xmlEscape(item.value)}</text>
      `;
    })
    .join("\n");

  const languagesY = 346;
  const langSvg = drawLanguageBars(topLanguages, languagesY, theme);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="860" height="${cardHeight}" viewBox="0 0 860 ${cardHeight}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GitHub profile stats">
  <rect width="860" height="${cardHeight}" rx="20" fill="${theme.card}" />
  <rect x="1" y="1" width="858" height="${cardHeight - 2}" rx="19" fill="none" stroke="${theme.border}" />

  <text x="32" y="48" fill="${theme.text}" font-size="34" font-weight="800">${xmlEscape(title)}</text>
  <text x="32" y="75" fill="${theme.muted}" font-size="17">@${xmlEscape(stats.profile.username)} | ${xmlEscape(stats.profile.name || "GitHub user")}</text>

  ${featuredSvg}

  <text x="32" y="316" fill="${theme.text}" font-size="22" font-weight="700">More Stats</text>
  ${extraSvg}

  <text x="425" y="316" fill="${theme.text}" font-size="22" font-weight="700">Top Languages</text>
  ${langSvg}

  <text x="32" y="580" fill="${theme.muted}" font-size="13">Generated from public GitHub data</text>
</svg>`;
}

module.exports = {
  parseCardOptions,
  generateCardSvg
};
