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
  const theme = typeof query.theme === "string" ? query.theme : "dark";

  const showValues =
    typeof query.show === "string" && query.show.trim().length
      ? query.show
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean)
      : DEFAULT_METRICS;
  const show = [...new Set(showValues)];

  const title = typeof query.title === "string" ? query.title.trim() : "";

  return {
    theme,
    show: show.length ? show : DEFAULT_METRICS,
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

function valueFontSize(value) {
  const length = String(value).length;
  if (length > 10) {
    return 32;
  }
  if (length > 7) {
    return 35;
  }
  return 38;
}

function drawLanguageBars(topLanguages, y, theme) {
  const languageLabelX = 438;
  const languagePercentX = 812;
  const languageBarX = 438;
  const languageBarWidth = 374;

  if (!topLanguages.length) {
    return `<text x="${languageLabelX}" y="${y}" fill="${theme.muted}" font-size="16">No language data available.</text>`;
  }

  return topLanguages
    .map((item, i) => {
      const rowY = y + i * 48;
      const barWidth = Math.max(
        8,
        Math.round((item.percent / 100) * languageBarWidth)
      );
      return `
        <text x="${languageLabelX}" y="${rowY}" fill="${theme.muted}" font-size="15">${xmlEscape(item.language)}</text>
        <text x="${languagePercentX}" y="${rowY}" text-anchor="end" fill="${theme.text}" font-size="15" font-weight="700">${item.percent.toFixed(1)}%</text>
        <rect x="${languageBarX}" y="${rowY + 10}" width="${languageBarWidth}" height="14" rx="7" fill="${theme.track}" />
        <rect x="${languageBarX}" y="${rowY + 10}" width="${barWidth}" height="14" rx="7" fill="url(#accentFill)" />
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

  const cardHeight = 660;
  const title = options.title || `${stats.profile.username} GitHub Stats`;

  const featuredSvg = featured
    .map((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 32 + col * 420;
      const y = 100 + row * 126;

      return `
        <rect x="${x}" y="${y}" width="390" height="104" rx="16" fill="${theme.tile}" stroke="${theme.border}" />
        <text x="${x + 20}" y="${y + 36}" fill="${theme.muted}" font-size="16">${xmlEscape(item.label)}</text>
        <text x="${x + 20}" y="${y + 80}" fill="${theme.text}" font-size="${valueFontSize(item.value)}" font-weight="800">${xmlEscape(item.value)}</text>
      `;
    })
    .join("\n");

  const extraSvg = extra
    .map((item, index) => {
      const y = 408 + index * 34;
      return `
        <text x="32" y="${y}" fill="${theme.muted}" font-size="16">${xmlEscape(item.label)}</text>
        <text x="392" y="${y}" text-anchor="end" fill="${theme.text}" font-size="18" font-weight="700">${xmlEscape(item.value)}</text>
      `;
    })
    .join("\n");

  const languagesY = 408;
  const langSvg = drawLanguageBars(topLanguages, languagesY, theme);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="780" height="600" viewBox="0 0 860 ${cardHeight}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GitHub profile stats">
  <defs>
    <linearGradient id="cardBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.card}" />
      <stop offset="100%" stop-color="${theme.tile}" />
    </linearGradient>
    <linearGradient id="accentFill" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${theme.accent}" />
      <stop offset="100%" stop-color="#53d0ff" />
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-opacity="0.18" />
    </filter>
  </defs>

  <rect width="860" height="${cardHeight}" rx="20" fill="${theme.card}" />
  <rect width="860" height="${cardHeight}" rx="20" fill="url(#cardBg)" opacity="0.24" />
  <rect x="1" y="1" width="858" height="${cardHeight - 2}" rx="19" fill="none" stroke="${theme.border}" />
  <circle cx="748" cy="-30" r="170" fill="${theme.accent}" opacity="0.07" />
  <circle cx="100" cy="700" r="220" fill="${theme.accent}" opacity="0.04" />

  <text x="32" y="50" fill="${theme.text}" font-size="42" font-weight="800">${xmlEscape(title)}</text>
  <text x="32" y="80" fill="${theme.muted}" font-size="22">@${xmlEscape(stats.profile.username)} | ${xmlEscape(stats.profile.name || "GitHub user")}</text>

  <g filter="url(#softShadow)">
    ${featuredSvg}
  </g>

  <text x="32" y="376" fill="${theme.text}" font-size="38" font-weight="800">More Stats</text>
  ${extraSvg}

  <text x="438" y="376" fill="${theme.text}" font-size="38" font-weight="800">Top Languages</text>
  ${langSvg}

  <text x="32" y="626" fill="${theme.muted}" font-size="17">Generated from public GitHub data</text>
</svg>`;
}

module.exports = {
  parseCardOptions,
  generateCardSvg
};
