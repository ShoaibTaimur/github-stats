const metrics = [
  ["repos", "Repositories"],
  ["stars", "Stars"],
  ["forks", "Forks"],
  ["followers", "Followers"],
  ["following", "Following"],
  ["lines", "Estimated Lines"],
  ["scanned", "Scanned Repos"],
  ["issues", "Open Issues"],
  ["contributions", "Contributions"]
];

const defaultChecked = ["repos", "stars", "forks", "followers", "following", "lines"];

const metricsRoot = document.getElementById("metrics");
const generateBtn = document.getElementById("generate");
const usernameInput = document.getElementById("username");
const themeInput = document.getElementById("theme");
const titleInput = document.getElementById("title");
const preview = document.getElementById("preview");
const markdownEl = document.getElementById("markdown");
const statusEl = document.getElementById("status");
const copyBtn = document.getElementById("copy");

for (const [id, label] of metrics) {
  const item = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.value = id;
  checkbox.checked = defaultChecked.includes(id);

  item.append(checkbox, document.createTextNode(label));
  metricsRoot.appendChild(item);
}

function selectedMetrics() {
  return Array.from(metricsRoot.querySelectorAll("input:checked")).map((el) => el.value);
}

function buildCardUrl(username) {
  const params = new URLSearchParams({
    username,
    theme: themeInput.value
  });

  const show = selectedMetrics();
  if (show.length) {
    params.set("show", show.join(","));
  }

  const title = titleInput.value.trim();
  if (title) {
    params.set("title", title);
  }

  return `${location.origin}/api/card?${params.toString()}`;
}

async function generate() {
  const username = usernameInput.value.trim();
  if (!username) {
    statusEl.textContent = "Enter a GitHub username.";
    return;
  }

  statusEl.textContent = "Generating...";

  try {
    const summaryRes = await fetch(`/api/summary?username=${encodeURIComponent(username)}`);
    const summaryData = await summaryRes.json();

    if (!summaryRes.ok) {
      throw new Error(summaryData.error || "Could not load this profile");
    }

    const cardUrl = buildCardUrl(username);
    preview.src = cardUrl;
    preview.alt = `${username} GitHub stats card`;

    markdownEl.value = `![${username} GitHub Stats](${cardUrl})`;
    statusEl.textContent = `Done. Card ready for ${summaryData.profile.username}.`;
  } catch (error) {
    preview.removeAttribute("src");
    markdownEl.value = "";
    statusEl.textContent = error.message;
  }
}

generateBtn.addEventListener("click", generate);
copyBtn.addEventListener("click", async () => {
  if (!markdownEl.value) {
    statusEl.textContent = "Generate your card first.";
    return;
  }

  await navigator.clipboard.writeText(markdownEl.value);
  statusEl.textContent = "Code copied.";
});

usernameInput.value = "octocat";
generate();
