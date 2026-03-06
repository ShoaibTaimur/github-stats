const { getProfileStats } = require("./github");
const { generateCardSvg, parseCardOptions } = require("./card");
const { GITHUB_TOKEN, MAX_REPOS, CARD_CACHE_SECONDS } = require("./config");

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
      maxRepos: MAX_REPOS
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
    return res.status(400).type("text/plain").send("username is required");
  }

  try {
    const stats = await getProfileStats(username, {
      token: GITHUB_TOKEN,
      maxRepos: MAX_REPOS
    });

    const options = parseCardOptions(req.query);
    const svg = generateCardSvg(stats, options);
    const cacheSeconds = getCacheSeconds(req);

    res.setHeader(
      "Cache-Control",
      `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}, stale-while-revalidate=60`
    );
    return res.status(200).type("image/svg+xml").send(svg);
  } catch (error) {
    return res
      .status(Number(error.status || 500))
      .type("text/plain")
      .send(error.message || "Failed to generate card");
  }
}

module.exports = {
  summaryHandler,
  cardHandler,
  getQueryValue
};
