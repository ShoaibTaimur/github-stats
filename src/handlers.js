const { getProfileStats } = require("./github");
const { generateCardSvg, parseCardOptions } = require("./card");
const {
  GITHUB_TOKEN,
  MAX_REPOS,
  ALL_REPOS_MODE,
  ALL_REPOS_HARD_LIMIT,
  GITHUB_REQUEST_TIMEOUT_MS,
  LANGUAGE_FETCH_CONCURRENCY,
  STATS_CACHE_SECONDS,
  UNAUTH_MAX_REPOS,
  UNAUTH_LANGUAGE_FETCH_CONCURRENCY,
  CARD_CACHE_SECONDS
} = require("./config");

const statsCache = new Map();

function getQueryValue(req, key) {
  const value = req?.query?.[key];
  if (Array.isArray(value)) {
    return String(value[0] || "");
  }
  return typeof value === "string" ? value : "";
}

function getCacheSeconds(req) {
  const raw = getQueryValue(req, "cache_seconds").trim();
  if (!raw) {
    return CARD_CACHE_SECONDS;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return CARD_CACHE_SECONDS;
  }

  return Math.min(3600, Math.max(60, Math.round(value)));
}

function buildStatsOptions() {
  const hasToken = Boolean(GITHUB_TOKEN);
  const effectiveAllReposMode = hasToken ? ALL_REPOS_MODE : false;
  const effectiveMaxRepos = hasToken
    ? MAX_REPOS
    : Math.min(MAX_REPOS, UNAUTH_MAX_REPOS);
  const effectiveAllReposHardLimit = hasToken
    ? ALL_REPOS_HARD_LIMIT
    : Math.min(ALL_REPOS_HARD_LIMIT, UNAUTH_MAX_REPOS);
  const effectiveLanguageFetchConcurrency = hasToken
    ? LANGUAGE_FETCH_CONCURRENCY
    : Math.min(LANGUAGE_FETCH_CONCURRENCY, UNAUTH_LANGUAGE_FETCH_CONCURRENCY);

  return {
    token: GITHUB_TOKEN,
    maxRepos: effectiveMaxRepos,
    allReposMode: effectiveAllReposMode,
    allReposHardLimit: effectiveAllReposHardLimit,
    requestTimeoutMs: GITHUB_REQUEST_TIMEOUT_MS,
    languageFetchConcurrency: effectiveLanguageFetchConcurrency,
    requestContext: {
      hasToken
    }
  };
}

function buildStatsCacheKey(username, statsOptions) {
  return JSON.stringify({
    username: username.toLowerCase(),
    hasToken: Boolean(statsOptions.token),
    allReposMode: Boolean(statsOptions.allReposMode),
    maxRepos: statsOptions.maxRepos,
    hardLimit: statsOptions.allReposHardLimit,
    timeoutMs: statsOptions.requestTimeoutMs,
    concurrency: statsOptions.languageFetchConcurrency
  });
}

async function getStatsCached(username) {
  const statsOptions = buildStatsOptions();
  const key = buildStatsCacheKey(username, statsOptions);
  const now = Date.now();
  const ttlMs = STATS_CACHE_SECONDS * 1000;
  const cached = statsCache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = await getProfileStats(username, statsOptions);
  statsCache.set(key, {
    value,
    expiresAt: now + ttlMs
  });

  // Keep cache bounded.
  if (statsCache.size > 300) {
    const firstKey = statsCache.keys().next().value;
    if (firstKey) {
      statsCache.delete(firstKey);
    }
  }

  return value;
}

async function summaryHandler(req, res) {
  const username = getQueryValue(req, "username").trim();
  if (!username) {
    return res.status(400).json({ error: "username is required" });
  }

  try {
    const stats = await getStatsCached(username);

    return res.status(200).json(stats);
  } catch (error) {
    return res.status(Number(error.status || 500)).json({
      error: error.message || "Failed to fetch GitHub profile stats"
    });
  }
}

async function cardHandler(req, res) {
  const username = getQueryValue(req, "username").trim();
  if (!username) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(400).send("username is required");
  }

  try {
    const stats = await getStatsCached(username);

    const options = parseCardOptions(req.query);
    const svg = generateCardSvg(stats, options);
    const cacheSeconds = getCacheSeconds(req);

    res.setHeader(
      "Cache-Control",
      `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}, stale-while-revalidate=60`
    );
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    return res.status(200).send(svg);
  } catch (error) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res
      .status(Number(error.status || 500))
      .send(error.message || "Failed to generate card");
  }
}

module.exports = {
  summaryHandler,
  cardHandler,
  getQueryValue
};
