const USER_AGENT = "github-stats-create";

async function githubRequest(url, token) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    const details = await safeJson(response);
    const message =
      details?.message || `GitHub API request failed (${response.status})`;

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchUser(username, token) {
  return githubRequest(`https://api.github.com/users/${encodeURIComponent(username)}`, token);
}

async function fetchRepos(username, token, maxRepos) {
  const repos = [];
  let page = 1;

  while (repos.length < maxRepos) {
    const remaining = Math.max(1, Math.min(100, maxRepos - repos.length));
    const data = await githubRequest(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=${remaining}&page=${page}&type=owner&sort=updated`,
      token
    );

    if (!Array.isArray(data) || data.length === 0) {
      break;
    }

    repos.push(...data);
    if (data.length < remaining) {
      break;
    }

    page += 1;
  }

  return repos;
}

async function fetchRepoLanguages(repos, token) {
  const totals = {};

  // Keep requests stable to reduce chance of hitting rate limits quickly.
  for (const repo of repos) {
    if (!repo.languages_url) {
      continue;
    }

    try {
      const map = await githubRequest(repo.languages_url, token);
      for (const [language, bytes] of Object.entries(map)) {
        totals[language] = (totals[language] || 0) + Number(bytes || 0);
      }
    } catch {
      // Ignore per-repo language failures and continue.
    }
  }

  return totals;
}

async function fetchContributions(username, token) {
  if (!token) {
    return null;
  }

  const query = `query ($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
        }
      }
    }
  }`;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ query, variables: { login: username } })
  });

  if (!response.ok) {
    return null;
  }

  const data = await safeJson(response);
  if (data?.errors?.length) {
    return null;
  }

  return (
    data?.data?.user?.contributionsCollection?.contributionCalendar
      ?.totalContributions || null
  );
}

function computeLanguageStats(languageBytes) {
  const entries = Object.entries(languageBytes)
    .filter(([, bytes]) => Number(bytes) > 0)
    .sort((a, b) => b[1] - a[1]);

  const totalBytes = entries.reduce((sum, [, bytes]) => sum + bytes, 0);

  const topLanguages = entries.slice(0, 8).map(([language, bytes]) => ({
    language,
    bytes,
    percent: totalBytes ? (bytes / totalBytes) * 100 : 0,
    estimatedLines: Math.round(bytes / 40)
  }));

  const estimatedTotalLines = Math.round(totalBytes / 40);

  return {
    totalBytes,
    estimatedTotalLines,
    topLanguages,
    all: entries.map(([language, bytes]) => ({ language, bytes }))
  };
}

function sum(values) {
  return values.reduce((acc, value) => acc + Number(value || 0), 0);
}

async function getProfileStats(username, { token, maxRepos }) {
  const user = await fetchUser(username, token);
  const repos = await fetchRepos(username, token, maxRepos);
  const contributions = await fetchContributions(username, token);

  const stars = sum(repos.map((repo) => repo.stargazers_count));
  const forks = sum(repos.map((repo) => repo.forks_count));
  const openIssues = sum(repos.map((repo) => repo.open_issues_count));

  const languageBytes = await fetchRepoLanguages(repos, token);
  const languageStats = computeLanguageStats(languageBytes);

  return {
    profile: {
      username: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      profileUrl: user.html_url,
      bio: user.bio,
      followers: Number(user.followers || 0),
      following: Number(user.following || 0),
      publicRepos: Number(user.public_repos || repos.length),
      publicGists: Number(user.public_gists || 0),
      createdAt: user.created_at
    },
    counters: {
      repositoriesScanned: repos.length,
      stars,
      forks,
      openIssues,
      contributions
    },
    languages: languageStats,
    updatedAt: new Date().toISOString(),
    rateLimitHint: token
      ? "Authenticated mode enabled"
      : "No token configured; rate limits may apply"
  };
}

module.exports = {
  getProfileStats
};
