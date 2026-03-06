const { getProfileStats } = require("../src/github");

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
    return res.status(400).json({ error: "username is required" });
  }

  try {
    const stats = await getProfileStats(username, {
      token: process.env.GITHUB_TOKEN || "",
      maxRepos: 30
    });

    return res.status(200).json(stats);
  } catch (error) {
    return res.status(Number(error.status || 500)).json({
      error: error.message || "Failed to fetch GitHub profile stats"
    });
  }
};
