import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { supabase } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import type { JWTPayload, AuthorStats } from '../types/index.js';

const authors = new Hono<{ Variables: { user: JWTPayload } }>();

authors.use('/*', authMiddleware);

authors.get('/', async (c) => {
  const user = c.get('user');

  const { data: userRepos } = await supabase
    .from('repositories')
    .select('id')
    .eq('user_id', user.sub);

  if (!userRepos || userRepos.length === 0) return c.json([]);

  const repoIds = userRepos.map(r => r.id);

  // Get all PRs
  const { data: prs } = await supabase
    .from('pull_requests')
    .select('author_login, author_avatar_url, state, created_at, merged_at')
    .in('repo_id', repoIds);

  // Get all commits
  const { data: commitsList } = await supabase
    .from('commits')
    .select('author_login, author_avatar_url, committed_at')
    .in('repo_id', repoIds);

  // Get all reviews
  const { data: prIds } = await supabase
    .from('pull_requests')
    .select('id, created_at')
    .in('repo_id', repoIds);

  const prIdList = (prIds || []).map(p => p.id);
  const { data: reviewsList } = prIdList.length > 0
    ? await supabase
        .from('reviews')
        .select('reviewer_login, reviewer_avatar_url, submitted_at, pr_id')
        .in('pr_id', prIdList)
    : { data: [] };

  // Aggregate by author
  const authorMap: Record<string, AuthorStats & { avatar_url?: string }> = {};

  (prs || []).forEach(pr => {
    const login = pr.author_login;
    if (!authorMap[login]) {
      authorMap[login] = {
        login,
        avatar_url: pr.author_avatar_url,
        prs_opened: 0,
        prs_merged: 0,
        commits_count: 0,
        avg_review_time_given_hours: 0,
        review_participation_rate: 0,
      };
    }
    authorMap[login].prs_opened++;
    if (pr.state === 'merged' || pr.merged_at) authorMap[login].prs_merged++;
  });

  (commitsList || []).forEach(commit => {
    const login = commit.author_login;
    if (!login) return;
    if (!authorMap[login]) {
      authorMap[login] = {
        login,
        avatar_url: commit.author_avatar_url,
        prs_opened: 0,
        prs_merged: 0,
        commits_count: 0,
        avg_review_time_given_hours: 0,
        review_participation_rate: 0,
      };
    }
    authorMap[login].commits_count++;
  });

  // Compute review participation
  const totalPrCount = (prs || []).length;
  const reviewsByReviewer: Record<string, number> = {};
  (reviewsList || []).forEach(r => {
    reviewsByReviewer[r.reviewer_login] = (reviewsByReviewer[r.reviewer_login] || 0) + 1;
  });

  Object.keys(reviewsByReviewer).forEach(login => {
    if (!authorMap[login]) {
      authorMap[login] = {
        login,
        avatar_url: (reviewsList || []).find(r => r.reviewer_login === login)?.reviewer_avatar_url,
        prs_opened: 0,
        prs_merged: 0,
        commits_count: 0,
        avg_review_time_given_hours: 0,
        review_participation_rate: 0,
      };
    }
    authorMap[login].review_participation_rate = totalPrCount > 0
      ? Math.round((reviewsByReviewer[login] / totalPrCount) * 100)
      : 0;
  });

  const result = Object.values(authorMap).sort((a, b) => b.prs_opened - a.prs_opened);
  return c.json(result);
});

export default authors;
