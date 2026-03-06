const { getProfileStats } = require("./github");
const { generateCardSvg, parseCardOptions } = require("./card");
const {
  GITHUB_TOKEN,
  MAX_REPOS,
  ALL_REPOS_MODE,
  ALL_REPOS_HARD_LIMIT,
  GITHUB_REQUEST_TIMEOUT_MS,
  CARD_CACHE_SECONDS
} = require("./config");

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

async function summaryHandler(req, res) {
  const username = getQueryValue(req, "username").trim();
  if (!username) {
    return res.status(400).json({ error: "username is required" });
  }

  try {
    const stats = await getProfileStats(username, {
      token: GITHUB_TOKEN,
      maxRepos: MAX_REPOS,
      allReposMode: ALL_REPOS_MODE,
      allReposHardLimit: ALL_REPOS_HARD_LIMIT,
      requestTimeoutMs: GITHUB_REQUEST_TIMEOUT_MS
    });

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
    const stats = await getProfileStats(username, {
      token: GITHUB_TOKEN,
      maxRepos: MAX_REPOS,
      allReposMode: ALL_REPOS_MODE,
      allReposHardLimit: ALL_REPOS_HARD_LIMIT,
      requestTimeoutMs: GITHUB_REQUEST_TIMEOUT_MS
    });

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
