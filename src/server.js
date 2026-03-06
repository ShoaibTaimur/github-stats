const express = require("express");
const path = require("path");
const { getProfileStats } = require("./github");
const { generateCardSvg, parseCardOptions } = require("./card");

const app = express();
const port = Number(process.env.PORT || 3000);
const defaultMaxRepos = 60;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/summary", async (req, res) => {
  const username = (req.query.username || "").trim();
  if (!username) {
    return res.status(400).json({ error: "username is required" });
  }

  try {
    const stats = await getProfileStats(username, {
      token: process.env.GITHUB_TOKEN || "",
      maxRepos: defaultMaxRepos
    });

    return res.json(stats);
  } catch (error) {
    return res.status(Number(error.status || 500)).json({
      error: error.message || "Failed to fetch GitHub profile stats"
    });
  }
});

async function handleCardRequest(req, res) {
  const username = (req.query.username || "").trim();
  if (!username) {
    return res.status(400).type("text/plain").send("username is required");
  }

  try {
    const stats = await getProfileStats(username, {
      token: process.env.GITHUB_TOKEN || "",
      maxRepos: defaultMaxRepos
    });

    const options = parseCardOptions(req.query);
    const svg = generateCardSvg(stats, options);

    res.setHeader("Cache-Control", "public, max-age=900");
    return res.type("image/svg+xml").send(svg);
  } catch (error) {
    return res
      .status(Number(error.status || 500))
      .type("text/plain")
      .send(error.message || "Failed to generate card");
  }
}

app.get("/api/card", handleCardRequest);
app.get("/api/card.svg", handleCardRequest);

app.get("*", (_req, res) => {
  return res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`GitHub stats generator running at http://localhost:${port}`);
  });
}

module.exports = app;
