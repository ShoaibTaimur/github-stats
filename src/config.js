function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toBoolean(value, fallback = false) {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

const PORT = clamp(toNumber(process.env.PORT, 3000), 1, 65535);
const MAX_REPOS = clamp(toNumber(process.env.MAX_REPOS, 30), 1, 100);
const ALL_REPOS_MODE = toBoolean(process.env.ALL_REPOS_MODE, true);
const ALL_REPOS_HARD_LIMIT = clamp(
  toNumber(process.env.ALL_REPOS_HARD_LIMIT, 300),
  50,
  2000
);
const GITHUB_REQUEST_TIMEOUT_MS = clamp(
  toNumber(process.env.GITHUB_REQUEST_TIMEOUT_MS, 8000),
  2000,
  20000
);
const CARD_CACHE_SECONDS = clamp(
  toNumber(process.env.CARD_CACHE_SECONDS, 300),
  60,
  3600
);
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

module.exports = {
  PORT,
  MAX_REPOS,
  ALL_REPOS_MODE,
  ALL_REPOS_HARD_LIMIT,
  GITHUB_REQUEST_TIMEOUT_MS,
  CARD_CACHE_SECONDS,
  GITHUB_TOKEN
};
