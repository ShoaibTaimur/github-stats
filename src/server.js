const express = require("express");
const path = require("path");
const { PORT } = require("./config");
const { summaryHandler, cardHandler } = require("./handlers");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));
app.get("/api/summary", summaryHandler);
app.get("/api/card", cardHandler);
app.get("/api/card.svg", cardHandler);

app.get("*", (_req, res) => {
  return res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`GitHub stats generator running at http://localhost:${PORT}`);
  });
}

module.exports = app;
