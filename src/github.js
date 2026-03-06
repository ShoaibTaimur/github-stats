const USER_AGENT = "github-stats-create";
const DEFAULT_TIMEOUT_MS = 8000;

async function githubRequest(url, token, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/vnd.github+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("GitHub API request timed out");
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

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

async function fetchUser(username, token, timeoutMs) {
  return githubRequest(
    `https://api.github.com/users/${encodeURIComponent(username)}`,
    token,
    timeoutMs
  );
}

async function fetchRepos(username, token, maxRepos, timeoutMs) {
  const repos = [];
  let page = 1;

  while (repos.length < maxRepos) {
    const remaining = Math.max(1, Math.min(100, maxRepos - repos.length));
    const data = await githubRequest(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=${remaining}&page=${page}&type=owner&sort=updated`,
      token,
      timeoutMs
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

function estimateRepoLanguages(repos) {
  const totals = {};

  for (const repo of repos) {
    const language = repo.language;
    if (!language) {
      continue;
    }

    // Repo size is in KB; convert to bytes as a rough language-weight signal.
    const estimatedBytes = Math.max(1024, Number(repo.size || 0) * 1024);
    totals[language] = (totals[language] || 0) + estimatedBytes;
  }

  return totals;
}

async function mapWithConcurrency(items, concurrency, worker) {
  const safeConcurrency = Math.max(1, Math.min(20, Number(concurrency || 1)));
  const results = new Array(items.length);
  let index = 0;

  async function runWorker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;

      try {
        results[currentIndex] = await worker(items[currentIndex], currentIndex);
      } catch {
        results[currentIndex] = null;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(safeConcurrency, items.length) }, () =>
      runWorker()
    )
  );

  return results;
}

async function fetchRepoLanguageTotals(
  repos,
  token,
  timeoutMs,
  languageFetchConcurrency
) {
  if (!repos.length) {
    return { totals: {}, failedRepos: 0 };
  }

  const responses = await mapWithConcurrency(
    repos,
    languageFetchConcurrency,
    async (repo) => {
      if (!repo?.languages_url) {
        return null;
      }

      return githubRequest(repo.languages_url, token, timeoutMs);
    }
  );

  const totals = {};
  let failedRepos = 0;

  for (const item of responses) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      failedRepos += 1;
      continue;
    }

    for (const [language, bytes] of Object.entries(item)) {
      const safeBytes = Number(bytes || 0);
      if (safeBytes <= 0) {
        continue;
      }
      totals[language] = (totals[language] || 0) + safeBytes;
    }
  }

  return { totals, failedRepos };
}

async function fetchContributions(username, token, timeoutMs = DEFAULT_TIMEOUT_MS) {
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ query, variables: { login: username } }),
      signal: controller.signal
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }

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

async function getProfileStats(
  username,
  {
    token,
    maxRepos,
    allReposMode,
    allReposHardLimit,
    requestTimeoutMs,
    languageFetchConcurrency
  }
) {
  const timeoutMs = Math.max(
    2000,
    Math.min(20000, Number(requestTimeoutMs || DEFAULT_TIMEOUT_MS))
  );
  const safeMaxRepos = Math.max(1, Math.min(100, Number(maxRepos || 30)));
  const safeAllReposHardLimit = Math.max(
    50,
    Math.min(2000, Number(allReposHardLimit || 300))
  );
  const repoTarget = allReposMode ? safeAllReposHardLimit : safeMaxRepos;

  const user = await fetchUser(username, token, timeoutMs);
  const repos = await fetchRepos(username, token, repoTarget, timeoutMs);
  const contributions = await fetchContributions(username, token, timeoutMs);

  const stars = sum(repos.map((repo) => repo.stargazers_count));
  const forks = sum(repos.map((repo) => repo.forks_count));
  const openIssues = sum(repos.map((repo) => repo.open_issues_count));

  const {
    totals: preciseLanguageBytes,
    failedRepos: failedLanguageRepos
  } = await fetchRepoLanguageTotals(
    repos,
    token,
    timeoutMs,
    languageFetchConcurrency
  );
  const preciseLanguageCount = Object.keys(preciseLanguageBytes).length;
  const languageBytes =
    preciseLanguageCount > 0 ? preciseLanguageBytes : estimateRepoLanguages(repos);
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
      : "No token configured; rate limits may apply",
    scanConfig: {
      allReposMode: Boolean(allReposMode),
      targetRepos: repoTarget,
      hardLimit: safeAllReposHardLimit,
      languageFetchConcurrency: Math.max(
        1,
        Math.min(20, Number(languageFetchConcurrency || 1))
      )
    },
    languageScan: {
      source: preciseLanguageCount > 0 ? "repo_languages_api" : "repo_primary_language_fallback",
      repositoriesAttempted: repos.length,
      repositoriesFailed: failedLanguageRepos
    }
  };
}

module.exports = {
  getProfileStats
};
