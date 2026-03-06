const { getProfileStats } = require("../src/github");

module.exports = async function handler(req, res) {
  const username = (req.query.username || "").trim();
  if (!username) {
    return res.status(400).json({ error: "username is required" });
  }

  try {
    const stats = await getProfileStats(username, {
      token: process.env.GITHUB_TOKEN || "",
      maxRepos: 60
    });

    return res.status(200).json(stats);
  } catch (error) {
    return res.status(Number(error.status || 500)).json({
      error: error.message || "Failed to fetch GitHub profile stats"
    });
  }
};
