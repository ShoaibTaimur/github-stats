const { getProfileStats } = require("../src/github");
const { generateCardSvg, parseCardOptions } = require("../src/card");

function getQueryValue(req, key) {
  const value = req?.query?.[key];
  if (Array.isArray(value)) {
    return String(value[0] || "");
  }
  return typeof value === "string" ? value : "";
}

module.exports = async function handler(req, res) {
  const username = getQueryValue(req, "username").trim();
  if (!username) {
    return res.status(400).type("text/plain").send("username is required");
  }

  try {
    const stats = await getProfileStats(username, {
      token: process.env.GITHUB_TOKEN || "",
      maxRepos: 30
    });

    const options = parseCardOptions(req.query);
    const svg = generateCardSvg(stats, options);

    res.setHeader("Cache-Control", "public, max-age=900");
    return res.status(200).type("image/svg+xml").send(svg);
  } catch (error) {
    return res
      .status(Number(error.status || 500))
      .type("text/plain")
      .send(error.message || "Failed to generate card");
  }
};
