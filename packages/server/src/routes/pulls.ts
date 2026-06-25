import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { supabase } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import type { JWTPayload } from '../types/index.js';

const pulls = new Hono<{ Variables: { user: JWTPayload } }>();

pulls.use('/*', authMiddleware);

// List PRs across all synced repos
pulls.get('/', async (c) => {
  const user = c.get('user');
  const readiness = c.req.query('readiness');
  const repo = c.req.query('repo');
  const author = c.req.query('author');
  const state = c.req.query('state') || 'open';
  const search = c.req.query('search');
  const sortBy = c.req.query('sort') || 'updated_at';
  const sortDir = c.req.query('dir') || 'desc';
  const page = parseInt(c.req.query('page') || '1');
  const perPage = parseInt(c.req.query('per_page') || '50');

  // Get user's repo IDs
  const { data: userRepos } = await supabase
    .from('repositories')
    .select('id, full_name, owner, name')
    .eq('user_id', user.sub);

  if (!userRepos || userRepos.length === 0) return c.json({ data: [], total: 0 });

  const repoIds = userRepos.map(r => r.id);

  let query = supabase
    .from('pull_requests')
    .select('*, repositories!inner(full_name, owner, name)')
    .in('repo_id', repoIds);

  if (state && state !== 'all') query = query.eq('state', state);
  if (readiness) query = query.eq('readiness_category', readiness);
  if (author) query = query.ilike('author_login', `%${author}%`);
  if (search) query = query.ilike('title', `%${search}%`);
  if (repo) {
    const targetRepo = userRepos.find(r => r.full_name === repo);
    if (targetRepo) query = query.eq('repo_id', targetRepo.id);
  }

  const validSortFields = ['updated_at', 'created_at', 'readiness_score', 'title', 'number'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'updated_at';
  query = query
    .order(sortField, { ascending: sortDir === 'asc' })
    .range((page - 1) * perPage, page * perPage - 1);

  const { data, error, count } = await query;

  if (error) throw new HTTPException(500, { message: 'Failed to fetch pull requests' });

  // Fetch reviews for each PR
  const prIds = (data || []).map((p: any) => p.id);
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .in('pr_id', prIds);

  const reviewsByPr: Record<string, any[]> = {};
  (reviews || []).forEach((r: any) => {
    if (!reviewsByPr[r.pr_id]) reviewsByPr[r.pr_id] = [];
    reviewsByPr[r.pr_id].push(r);
  });

  const result = (data || []).map((pr: any) => ({
    ...pr,
    repo_full_name: pr.repositories?.full_name,
    reviews: reviewsByPr[pr.id] || [],
  }));

  return c.json({ data: result, total: count || 0 });
});

// Get single PR detail
pulls.get('/:owner/:repo/:number', async (c) => {
  const user = c.get('user');
  const { owner, repo: repoName, number } = c.req.param();
  const prNumber = parseInt(number);

  const { data: repository } = await supabase
    .from('repositories')
    .select('*')
    .eq('user_id', user.sub)
    .eq('owner', owner)
    .eq('name', repoName)
    .single();

  if (!repository) throw new HTTPException(404, { message: 'Repository not found' });

  const { data: pr } = await supabase
    .from('pull_requests')
    .select('*')
    .eq('repo_id', repository.id)
    .eq('number', prNumber)
    .single();

  if (!pr) throw new HTTPException(404, { message: 'Pull request not found' });

  const [reviewsResult, checkRunsResult] = await Promise.all([
    supabase.from('reviews').select('*').eq('pr_id', pr.id),
    supabase.from('check_runs').select('*').eq('pr_id', pr.id),
  ]);

  return c.json({
    ...pr,
    repo_full_name: repository.full_name,
    reviews: reviewsResult.data || [],
    check_runs: checkRunsResult.data || [],
  });
});

export default pulls;
