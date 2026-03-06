const { getTheme } = require("./themes");

const FIXED_METRICS = ["repos", "stars", "followers", "following"];

function parseCardOptions(query) {
  const theme = typeof query.theme === "string" ? query.theme : "dark";
  return {
    theme,
    show: FIXED_METRICS
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

function metricRows(stats) {
  const counters = stats.counters;
  const profile = stats.profile;

  return [
    ["Repositories", profile.publicRepos],
    ["Stars", counters.stars],
    ["Followers", profile.followers],
    ["Following", profile.following]
  ].map(([label, value]) => ({
    label,
    value: formatNumber(value)
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

function buildLanguageSegments(stats) {
  const palette = [
    "#3b82f6",
    "#22c55e",
    "#f59e0b",
    "#ec4899",
    "#8b5cf6",
    "#06b6d4",
    "#ef4444",
    "#84cc16"
  ];

  const all = Array.isArray(stats.languages?.all) ? stats.languages.all : [];
  const totalBytes = Number(stats.languages?.totalBytes || 0);

  if (!all.length || totalBytes <= 0) {
    return [{ language: "No language data", percent: 100, color: "#64748b" }];
  }

  return all
    .map((item, index) => ({
      language: item.language,
      percent: (Number(item.bytes || 0) / totalBytes) * 100,
      color: palette[index % palette.length]
    }))
    .filter((item) => item.percent > 0);
}

function generateCardSvg(stats, options) {
  const theme = getTheme(options.theme);
  const tiles = metricRows(stats);
  const segments = buildLanguageSegments(stats);

  const width = 760;
  const height = 420;

  const donutCenterX = 138;
  const donutCenterY = 152;
  const donutRadius = 74;
  const donutStroke = 22;

  let currentAngle = 0;
  const donutArcs = segments
    .map((item) => {
      const sweep = (item.percent / 100) * 360;
      const start = currentAngle;
      const end = currentAngle + Math.max(1.4, sweep);
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

  const shownLanguages = segments.slice(0, 5);
  const extraCount = Math.max(0, segments.length - shownLanguages.length);

  const legend = shownLanguages
    .map((item, index) => {
      const y = 262 + index * 24;
      return `
        <circle cx="42" cy="${y - 4}" r="5" fill="${item.color}" />
        <text x="55" y="${y}" fill="${theme.text}" font-size="13" font-weight="600">${xmlEscape(item.language)} ${item.percent.toFixed(1)}%</text>
      `;
    })
    .join("\n");

  const extraLabel =
    extraCount > 0
      ? `<text x="42" y="${262 + shownLanguages.length * 24}" fill="${theme.muted}" font-size="12">+${extraCount} more languages</text>`
      : "";

  const tileSvg = tiles
    .map((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 290 + col * 222;
      const y = 156 + row * 102;

      return `
        <rect x="${x}" y="${y}" width="206" height="82" rx="12" fill="${theme.tile}" stroke="${theme.border}" />
        <text x="${x + 14}" y="${y + 28}" fill="${theme.muted}" font-size="13" font-weight="600">${xmlEscape(item.label)}</text>
        <text x="${x + 14}" y="${y + 58}" fill="${theme.text}" font-size="28" font-weight="700">${xmlEscape(item.value)}</text>
      `;
    })
    .join("\n");

  const memberSinceYear = stats.profile.createdAt
    ? new Date(stats.profile.createdAt).getUTCFullYear()
    : "--";

  const heading = `${stats.profile.username} GitHub Stats`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GitHub profile stats" style="font-family: Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <linearGradient id="bgFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.card}" />
      <stop offset="100%" stop-color="#0b172e" />
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" rx="16" fill="url(#bgFill)"/>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="15" fill="none" stroke="${theme.border}" />

  <rect x="20" y="20" width="240" height="380" rx="14" fill="#0d203e" opacity="0.52"/>

  <circle cx="${donutCenterX}" cy="${donutCenterY}" r="${donutRadius}" fill="none" stroke="${theme.track}" stroke-width="${donutStroke}" opacity="0.35"/>
  ${donutArcs}

  <text x="${donutCenterX}" y="148" text-anchor="middle" fill="${theme.text}" font-size="30" font-weight="700">${xmlEscape(formatNumber(stats.profile.publicRepos))}</text>
  <text x="${donutCenterX}" y="172" text-anchor="middle" fill="${theme.muted}" font-size="12" font-weight="600">PUBLIC REPOS</text>

  <text x="42" y="234" fill="${theme.text}" font-size="14" font-weight="700">Used Languages</text>
  ${legend}
  ${extraLabel}

  <text x="290" y="58" fill="${theme.text}" font-size="30" font-weight="700">${xmlEscape(stats.profile.username)}</text>
  <text x="290" y="84" fill="${theme.muted}" font-size="16" font-weight="600">${xmlEscape(stats.profile.name || "GitHub User")}</text>
  <text x="290" y="106" fill="${theme.muted}" font-size="13">Member since ${memberSinceYear}</text>

  <rect x="290" y="118" width="438" height="24" rx="8" fill="${theme.tile}" stroke="${theme.border}" />
  <text x="302" y="135" fill="${theme.text}" font-size="13" font-weight="600">${xmlEscape(heading)}</text>

  ${tileSvg}

  <text x="20" y="404" fill="${theme.muted}" font-size="11">Generated from public GitHub data</text>
</svg>`;
}

module.exports = {
  parseCardOptions,
  generateCardSvg
};
