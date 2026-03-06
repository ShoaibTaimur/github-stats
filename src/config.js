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
  toNumber(process.env.ALL_REPOS_HARD_LIMIT, 80),
  50,
  2000
);
const GITHUB_REQUEST_TIMEOUT_MS = clamp(
  toNumber(process.env.GITHUB_REQUEST_TIMEOUT_MS, 8000),
  2000,
  20000
);
const LANGUAGE_FETCH_CONCURRENCY = clamp(
  toNumber(process.env.LANGUAGE_FETCH_CONCURRENCY, 6),
  1,
  20
);
const STATS_CACHE_SECONDS = clamp(
  toNumber(process.env.STATS_CACHE_SECONDS, 180),
  30,
  900
);
const UNAUTH_MAX_REPOS = clamp(
  toNumber(process.env.UNAUTH_MAX_REPOS, 80),
  20,
  200
);
const UNAUTH_LANGUAGE_FETCH_CONCURRENCY = clamp(
  toNumber(process.env.UNAUTH_LANGUAGE_FETCH_CONCURRENCY, 2),
  1,
  6
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
  LANGUAGE_FETCH_CONCURRENCY,
  STATS_CACHE_SECONDS,
  UNAUTH_MAX_REPOS,
  UNAUTH_LANGUAGE_FETCH_CONCURRENCY,
  CARD_CACHE_SECONDS,
  GITHUB_TOKEN
};
