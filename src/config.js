function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const PORT = clamp(toNumber(process.env.PORT, 3000), 1, 65535);
const MAX_REPOS = clamp(toNumber(process.env.MAX_REPOS, 30), 1, 100);
const CARD_CACHE_SECONDS = clamp(
  toNumber(process.env.CARD_CACHE_SECONDS, 300),
  60,
  3600
);
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

module.exports = {
  PORT,
  MAX_REPOS,
  CARD_CACHE_SECONDS,
  GITHUB_TOKEN
};
