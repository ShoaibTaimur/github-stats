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

function polarToCartesian(cx, cy, radius, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad)
  };
}

function arcPath(cx, cy, radius, startDeg, endDeg) {
  const start = polarToCartesian(cx, cy, radius, endDeg);
  const end = polarToCartesian(cx, cy, radius, startDeg);
  const largeArcFlag = endDeg - startDeg <= 180 ? "0" : "1";

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function buildLanguageSegments(topLanguages) {
  const palette = ["#33a7ff", "#ff4fa3", "#8bc34a", "#ffd54f", "#7e8dff"];

  const source = topLanguages.length
    ? topLanguages.slice(0, 5)
    : [{ language: "No data", percent: 100 }];

  return source.map((item, index) => ({
    language: item.language,
    percent: Number(item.percent || 0),
    color: palette[index % palette.length]
  }));
}

function generateCardSvg(stats, options) {
  const theme = getTheme(options.theme);
  const rows = metricRows(stats, options.show);
  const tiles = rows.slice(0, 4);
  const segments = buildLanguageSegments(stats.languages.topLanguages);

  const width = 900;
  const height = 520;

  const donutCenterX = 180;
  const donutCenterY = 190;
  const donutRadius = 103;
  const donutStroke = 34;

  let currentAngle = 0;
  const donutArcs = segments
    .filter((item) => item.percent > 0)
    .map((item) => {
      const sweep = (item.percent / 100) * 360;
      const start = currentAngle;
      const end = currentAngle + Math.max(2, sweep);
      currentAngle = end;

      return `<path d="${arcPath(
        donutCenterX,
        donutCenterY,
        donutRadius,
        start,
        end
      )}" stroke="${item.color}" stroke-width="${donutStroke}" fill="none" stroke-linecap="round"/>`;
    })
    .join("\n");

  const legend = segments
    .slice(0, 4)
    .map((item, index) => {
      const y = 332 + index * 28;
      return `
        <circle cx="82" cy="${y - 5}" r="6" fill="${item.color}" />
        <text x="98" y="${y}" fill="${theme.text}" font-size="27" font-weight="700">${xmlEscape(item.language)}: ${item.percent.toFixed(1)}%</text>
      `;
    })
    .join("\n");

  const tileSvg = tiles
    .map((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 342 + col * 274;
      const y = 238 + row * 105;

      return `
        <rect x="${x}" y="${y}" width="258" height="86" rx="14" fill="${theme.tile}" stroke="${theme.border}" />
        <text x="${x + 16}" y="${y + 32}" fill="${theme.muted}" font-size="24" font-weight="700">${xmlEscape(item.label)}</text>
        <text x="${x + 16}" y="${y + 67}" fill="${theme.text}" font-size="39" font-weight="800">${xmlEscape(item.value)}</text>
      `;
    })
    .join("\n");

  const memberSinceYear = stats.profile.createdAt
    ? new Date(stats.profile.createdAt).getUTCFullYear()
    : "--";

  const heading = options.title || `${stats.profile.username} GitHub Stats`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GitHub profile stats">
  <defs>
    <linearGradient id="bgFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.card}" />
      <stop offset="100%" stop-color="#032f3e" />
    </linearGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-opacity="0.22" />
    </filter>
  </defs>

  <rect width="${width}" height="${height}" rx="20" fill="url(#bgFill)"/>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="19" fill="none" stroke="${theme.border}" />

  <rect x="24" y="24" width="284" height="472" rx="18" fill="#002f3a" opacity="0.54"/>

  <circle cx="${donutCenterX}" cy="${donutCenterY}" r="${donutRadius}" fill="none" stroke="${theme.track}" stroke-width="${donutStroke}" opacity="0.42"/>
  <g filter="url(#softGlow)">
    ${donutArcs}
  </g>

  <text x="${donutCenterX}" y="186" text-anchor="middle" fill="${theme.text}" font-size="56" font-weight="800">${xmlEscape(formatNumber(stats.profile.publicRepos))}</text>
  <text x="${donutCenterX}" y="220" text-anchor="middle" fill="${theme.muted}" font-size="26" font-weight="700">REPOS</text>

  ${legend}

  <text x="342" y="68" fill="#1cff49" font-size="48" font-weight="900">${xmlEscape(stats.profile.username)}</text>
  <text x="342" y="103" fill="${theme.text}" font-size="36" font-weight="700">${xmlEscape(stats.profile.name || "GitHub User")}</text>
  <text x="342" y="132" fill="${theme.muted}" font-size="31">Member since ${memberSinceYear}</text>

  <rect x="342" y="150" width="532" height="70" rx="14" fill="${theme.tile}" stroke="${theme.border}" />
  <text x="608" y="193" text-anchor="middle" fill="${theme.text}" font-size="36" font-weight="800">${xmlEscape(heading)}</text>

  ${tileSvg}

  <text x="32" y="492" fill="${theme.muted}" font-size="17">Generated from public GitHub data</text>
</svg>`;
}

module.exports = {
  parseCardOptions,
  generateCardSvg
};
