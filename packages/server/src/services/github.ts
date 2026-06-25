import { Octokit } from '@octokit/rest';

export function createGitHubClient(token: string): Octokit {
  return new Octokit({ auth: token });
}

export async function getAuthenticatedUser(token: string) {
  const octokit = createGitHubClient(token);
  const { data } = await octokit.users.getAuthenticated();
  return data;
}

export async function getUserRepos(token: string, page = 1, perPage = 100) {
  const octokit = createGitHubClient(token);
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: perPage,
    page,
    visibility: 'all',
  });
  return data;
}

export async function getRepoPullRequests(
  token: string,
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'all',
  page = 1,
  perPage = 50
) {
  const octokit = createGitHubClient(token);
  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state,
    sort: 'updated',
    direction: 'desc',
    per_page: perPage,
    page,
  });
  return data;
}

export async function getPullRequestDetails(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number
) {
  const octokit = createGitHubClient(token);
  const { data } = await octokit.pulls.get({ owner, repo, pull_number: pullNumber });
  return data;
}

export async function getPullRequestReviews(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number
) {
  const octokit = createGitHubClient(token);
  const { data } = await octokit.pulls.listReviews({ owner, repo, pull_number: pullNumber });
  return data;
}

export async function getPullRequestCheckRuns(
  token: string,
  owner: string,
  repo: string,
  ref: string
) {
  const octokit = createGitHubClient(token);
  const { data } = await octokit.checks.listForRef({ owner, repo, ref });
  return data.check_runs;
}

export async function getRepoCommits(
  token: string,
  owner: string,
  repo: string,
  since?: string,
  page = 1,
  perPage = 100
) {
  const octokit = createGitHubClient(token);
  const { data } = await octokit.repos.listCommits({
    owner,
    repo,
    since,
    per_page: perPage,
    page,
  });
  return data;
}

export async function getCommitDetails(
  token: string,
  owner: string,
  repo: string,
  ref: string
) {
  const octokit = createGitHubClient(token);
  const { data } = await octokit.repos.getCommit({ owner, repo, ref });
  return data;
}

export function buildOAuthUrl(clientId: string, callbackUrl: string, state: string) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'repo read:user user:email',
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  clientId: string,
  clientSecret: string,
  code: string
): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const data = await response.json() as { access_token?: string; error?: string };
  if (data.error || !data.access_token) {
    throw new Error(data.error || 'Failed to exchange code for token');
  }
  return data.access_token;
}
