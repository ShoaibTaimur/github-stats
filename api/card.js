const { getProfileStats } = require("../src/github");
const { generateCardSvg, parseCardOptions } = require("../src/card");

module.exports = async function handler(req, res) {
  const username = (req.query.username || "").trim();
  if (!username) {
    return res.status(400).type("text/plain").send("username is required");
  }

  try {
    const stats = await getProfileStats(username, {
      token: process.env.GITHUB_TOKEN || "",
      maxRepos: 60
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
