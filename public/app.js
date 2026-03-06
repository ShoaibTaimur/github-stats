const generateBtn = document.getElementById("generate");
const usernameInput = document.getElementById("username");
const themeInput = document.getElementById("theme");
const refreshInput = document.getElementById("refresh");
const preview = document.getElementById("preview");
const markdownEl = document.getElementById("markdown");
const cardUrlEl = document.getElementById("cardUrl");
const statusEl = document.getElementById("status");
const metaEl = document.getElementById("meta");
const copyBtn = document.getElementById("copy");
const copyUrlBtn = document.getElementById("copyUrl");

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.classList.remove("ok", "error");
  if (type) {
    statusEl.classList.add(type);
  }
}

function buildCardUrl(username) {
  const params = new URLSearchParams({
    username,
    theme: themeInput.value,
    cache_seconds: refreshInput.value
  });

  return `${location.origin}/api/card?${params.toString()}`;
}

async function copyText(value) {
  if (!value) {
    return false;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to legacy fallback.
    }
  }

  const temp = document.createElement("textarea");
  temp.value = value;
  temp.setAttribute("readonly", "");
  temp.style.position = "absolute";
  temp.style.left = "-9999px";
  document.body.appendChild(temp);
  temp.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  document.body.removeChild(temp);
  return copied;
}

async function generate() {
  const username = usernameInput.value.trim();
  if (!username) {
    setStatus("Enter a GitHub username.", "error");
    return;
  }

  setStatus("Generating card...", null);

  try {
    const summaryRes = await fetch(
      `/api/summary?username=${encodeURIComponent(username)}`
    );
    const summaryData = await summaryRes.json();

    if (!summaryRes.ok) {
      throw new Error(summaryData.error || "Could not load this profile");
    }

    const cardUrl = buildCardUrl(username);
    const markdown = `![${summaryData.profile.username} GitHub Stats](${cardUrl})`;

    preview.src = cardUrl;
    preview.alt = `${summaryData.profile.username} GitHub stats card`;
    markdownEl.value = markdown;
    cardUrlEl.value = cardUrl;

    metaEl.textContent = `${summaryData.profile.publicRepos} repos, ${summaryData.profile.followers} followers`;
    setStatus(
      `Card ready for ${summaryData.profile.username}. Paste the Markdown into README.md.`,
      "ok"
    );
  } catch (error) {
    preview.removeAttribute("src");
    markdownEl.value = "";
    cardUrlEl.value = "";
    metaEl.textContent = "No profile loaded.";
    setStatus(error.message, "error");
  }
}

generateBtn.addEventListener("click", generate);

copyBtn.addEventListener("click", async () => {
  if (!markdownEl.value) {
    setStatus("Generate your card first.", "error");
    return;
  }
  const copied = await copyText(markdownEl.value);
  setStatus(
    copied ? "Markdown copied." : "Copy failed. Copy manually.",
    copied ? "ok" : "error"
  );
});

copyUrlBtn.addEventListener("click", async () => {
  if (!cardUrlEl.value) {
    setStatus("Generate your card first.", "error");
    return;
  }
  const copied = await copyText(cardUrlEl.value);
  setStatus(
    copied ? "Card URL copied." : "Copy failed. Copy manually.",
    copied ? "ok" : "error"
  );
});

usernameInput.value = "octocat";
generate();
