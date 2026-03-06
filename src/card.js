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

function clampText(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
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

  const width = 820;
  const padding = 20;
  const headerHeight = 86;
  const gap = 14;

  const leftPanelX = padding;
  const leftPanelY = padding + headerHeight + gap;
  const leftPanelWidth = 258;

  const rightPanelX = leftPanelX + leftPanelWidth + gap;
  const rightPanelWidth = width - padding - rightPanelX;
  const statsPanelY = leftPanelY;
  const statsPanelHeight = 190;

  const languageRowHeight = 26;
  const languageRows = Math.max(1, segments.length);
  const languagePanelY = statsPanelY + statsPanelHeight + gap;
  const languagePanelHeight = 22 + 18 + languageRows * languageRowHeight + 12;

  const footerY = languagePanelY + languagePanelHeight + 18;
  const contentBottom = footerY + 6;
  const leftPanelHeight = contentBottom - leftPanelY;
  const height = Math.max(contentBottom + padding, 500);

  const donutCenterX = leftPanelX + Math.round(leftPanelWidth / 2);
  const donutCenterY = leftPanelY + 98;
  const donutRadius = 76;
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

  const bars = segments
    .map((item, index) => {
      const y = languagePanelY + 42 + index * languageRowHeight;
      const label = clampText(item.language, 20);
      const barWidth = Math.max(8, Math.round((item.percent / 100) * 210));
      return `
        <text x="${rightPanelX + 18}" y="${y}" fill="${theme.muted}" font-size="12" font-weight="600">${xmlEscape(label)}</text>
        <text x="${rightPanelX + rightPanelWidth - 18}" y="${y}" text-anchor="end" fill="${theme.text}" font-size="12" font-weight="700">${item.percent.toFixed(1)}%</text>
        <rect x="${rightPanelX + 180}" y="${y - 9}" width="210" height="10" rx="5" fill="${theme.track}" opacity="0.85" />
        <rect x="${rightPanelX + 180}" y="${y - 9}" width="${barWidth}" height="10" rx="5" fill="${item.color}" />
      `;
    })
    .join("\n");

  const tileSvg = tiles
    .map((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = rightPanelX + 18 + col * 216;
      const y = statsPanelY + 22 + row * 84;

      return `
        <rect x="${x}" y="${y}" width="198" height="70" rx="12" fill="${theme.tile}" stroke="${theme.border}" />
        <text x="${x + 14}" y="${y + 27}" fill="${theme.muted}" font-size="12" font-weight="600">${xmlEscape(item.label)}</text>
        <text x="${x + 14}" y="${y + 53}" fill="${theme.text}" font-size="23" font-weight="700">${xmlEscape(item.value)}</text>
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

  <rect x="${padding}" y="${padding}" width="${width - padding * 2}" height="${headerHeight}" rx="12" fill="${theme.panel || theme.tile}" stroke="${theme.border}" />
  <rect x="${padding}" y="${padding + headerHeight - 4}" width="${width - padding * 2}" height="3" fill="url(#accentStrip)" opacity="0.75" />

  <text x="${padding + 18}" y="${padding + 34}" fill="${theme.text}" font-size="26" font-weight="700">${xmlEscape(stats.profile.username)} GitHub Stats</text>
  <text x="${padding + 18}" y="${padding + 60}" fill="${theme.muted}" font-size="14">${xmlEscape(stats.profile.name || "GitHub User")} | Member since ${memberSinceYear}</text>

  <rect x="${leftPanelX}" y="${leftPanelY}" width="${leftPanelWidth}" height="${leftPanelHeight}" rx="14" fill="${theme.panel || theme.tile}" stroke="${theme.border}" />
  <circle cx="${donutCenterX}" cy="${donutCenterY}" r="${donutRadius}" fill="none" stroke="${theme.track}" stroke-width="${donutStroke}" opacity="0.35"/>
  ${donutArcs}
  <text x="${donutCenterX}" y="${donutCenterY - 6}" text-anchor="middle" fill="${theme.text}" font-size="30" font-weight="700">${xmlEscape(formatNumber(stats.profile.publicRepos))}</text>
  <text x="${donutCenterX}" y="${donutCenterY + 16}" text-anchor="middle" fill="${theme.muted}" font-size="11" font-weight="600">PUBLIC REPOS</text>
  <text x="${leftPanelX + 18}" y="${leftPanelY + 220}" fill="${theme.text}" font-size="13" font-weight="700">Language Distribution</text>
  <text x="${leftPanelX + 18}" y="${leftPanelY + 242}" fill="${theme.muted}" font-size="12">Donut represents all detected languages.</text>

  <rect x="${rightPanelX}" y="${statsPanelY}" width="${rightPanelWidth}" height="${statsPanelHeight}" rx="14" fill="${theme.panel || theme.tile}" stroke="${theme.border}" />
  <text x="${rightPanelX + 18}" y="${statsPanelY + 18}" fill="${theme.text}" font-size="13" font-weight="700">Core Stats</text>
  ${tileSvg}

  <rect x="${rightPanelX}" y="${languagePanelY}" width="${rightPanelWidth}" height="${languagePanelHeight}" rx="14" fill="${theme.panel || theme.tile}" stroke="${theme.border}" />
  <text x="${rightPanelX + 18}" y="${languagePanelY + 18}" fill="${theme.text}" font-size="13" font-weight="700">Used Languages</text>
  ${bars}

  <text x="${padding}" y="${footerY}" fill="${theme.muted}" font-size="11">Generated from public GitHub data</text>
</svg>`;
}

module.exports = {
  parseCardOptions,
  generateCardSvg
};
