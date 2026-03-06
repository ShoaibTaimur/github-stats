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

function buildLanguageSegments(stats, theme) {
  const palette = theme.langPalette || [
    "#3b82f6",
    "#22c55e",
    "#f59e0b",
    "#ec4899",
    "#8b5cf6",
    "#06b6d4"
  ];

  const all = Array.isArray(stats.languages?.all) ? stats.languages.all : [];
  const totalBytes = Number(stats.languages?.totalBytes || 0);

  if (!all.length || totalBytes <= 0) {
    return [{ language: "No language data", percent: 100, color: theme.muted }];
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
  const segments = buildLanguageSegments(stats, theme);

  const width = 780;
  const height = 450;

  const donutCenterX = 146;
  const donutCenterY = 214;
  const donutRadius = 74;
  const donutStroke = 20;

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

  const bars = segments.slice(0, 4)
    .map((item, index) => {
      const y = 336 + index * 26;
      const barWidth = Math.max(8, Math.round((item.percent / 100) * 214));
      return `
        <text x="290" y="${y}" fill="${theme.muted}" font-size="12" font-weight="600">${xmlEscape(item.language)}</text>
        <text x="726" y="${y}" text-anchor="end" fill="${theme.text}" font-size="12" font-weight="700">${item.percent.toFixed(1)}%</text>
        <rect x="380" y="${y - 9}" width="214" height="10" rx="5" fill="${theme.track}" opacity="0.85" />
        <rect x="380" y="${y - 9}" width="${barWidth}" height="10" rx="5" fill="${item.color}" />
      `;
    })
    .join("\n");

  const tileSvg = tiles
    .map((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 290 + col * 220;
      const y = 138 + row * 90;

      return `
        <rect x="${x}" y="${y}" width="204" height="74" rx="12" fill="${theme.tile}" stroke="${theme.border}" />
        <text x="${x + 14}" y="${y + 27}" fill="${theme.muted}" font-size="12" font-weight="600">${xmlEscape(item.label)}</text>
        <text x="${x + 14}" y="${y + 55}" fill="${theme.text}" font-size="24" font-weight="700">${xmlEscape(item.value)}</text>
      `;
    })
    .join("\n");

  const memberSinceYear = stats.profile.createdAt
    ? new Date(stats.profile.createdAt).getUTCFullYear()
    : "--";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GitHub profile stats" style="font-family: Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <linearGradient id="bgFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.card}" />
      <stop offset="100%" stop-color="${theme.bg2 || theme.card}" />
    </linearGradient>
    <linearGradient id="accentStrip" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${theme.accent}" />
      <stop offset="100%" stop-color="${theme.accent2 || theme.accent}" />
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" rx="16" fill="url(#bgFill)"/>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="15" fill="none" stroke="${theme.border}" />

  <rect x="20" y="20" width="740" height="84" rx="12" fill="${theme.panel || theme.tile}" stroke="${theme.border}" />
  <rect x="20" y="102" width="740" height="3" fill="url(#accentStrip)" opacity="0.75" />

  <text x="38" y="54" fill="${theme.text}" font-size="26" font-weight="700">${xmlEscape(stats.profile.username)} GitHub Stats</text>
  <text x="38" y="80" fill="${theme.muted}" font-size="14">${xmlEscape(stats.profile.name || "GitHub User")} | Member since ${memberSinceYear}</text>

  <rect x="20" y="124" width="250" height="306" rx="14" fill="${theme.panel || theme.tile}" stroke="${theme.border}" />
  <circle cx="${donutCenterX}" cy="${donutCenterY}" r="${donutRadius}" fill="none" stroke="${theme.track}" stroke-width="${donutStroke}" opacity="0.35"/>
  ${donutArcs}
  <text x="${donutCenterX}" y="208" text-anchor="middle" fill="${theme.text}" font-size="30" font-weight="700">${xmlEscape(formatNumber(stats.profile.publicRepos))}</text>
  <text x="${donutCenterX}" y="230" text-anchor="middle" fill="${theme.muted}" font-size="11" font-weight="600">PUBLIC REPOS</text>

  <rect x="290" y="124" width="470" height="196" rx="14" fill="${theme.panel || theme.tile}" stroke="${theme.border}" />
  ${tileSvg}

  <rect x="290" y="334" width="470" height="96" rx="14" fill="${theme.panel || theme.tile}" stroke="${theme.border}" />
  <text x="308" y="322" fill="${theme.text}" font-size="14" font-weight="700">Used Languages</text>
  ${bars}

  <text x="20" y="444" fill="${theme.muted}" font-size="11">Generated from public GitHub data</text>
</svg>`;
}

module.exports = {
  parseCardOptions,
  generateCardSvg
};
