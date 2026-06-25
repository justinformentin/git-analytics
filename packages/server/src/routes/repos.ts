import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { supabase } from '../db/client.js';
import { getUserRepos } from '../services/github.js';
import { syncRepository } from '../services/sync.js';
import { authMiddleware } from '../middleware/auth.js';
import type { JWTPayload } from '../types/index.js';

const repos = new Hono<{ Variables: { user: JWTPayload } }>();

repos.use('/*', authMiddleware);

// List user's synced repositories
repos.get('/', async (c) => {
  const user = c.get('user');

  const { data, error } = await supabase
    .from('repositories')
    .select('*')
    .eq('user_id', user.sub)
    .order('created_at', { ascending: false });

  if (error) throw new HTTPException(500, { message: 'Failed to fetch repositories' });

  return c.json(data || []);
});

// Search user's GitHub repos (for adding)
repos.get('/search', async (c) => {
  const user = c.get('user');

  const { data: dbUser } = await supabase
    .from('users')
    .select('github_token')
    .eq('id', user.sub)
    .single();

  if (!dbUser) throw new HTTPException(404, { message: 'User not found' });

  const githubRepos = await getUserRepos(dbUser.github_token);
  return c.json(githubRepos.map(r => ({
    github_id: r.id,
    owner: r.owner.login,
    name: r.name,
    full_name: r.full_name,
    description: r.description,
    is_private: r.private,
    default_branch: r.default_branch,
  })));
});

// Add a repository
repos.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    github_id: number;
    owner: string;
    name: string;
    full_name: string;
    description?: string;
    is_private?: boolean;
    default_branch?: string;
  }>();

  const { data, error } = await supabase
    .from('repositories')
    .upsert({
      user_id: user.sub,
      github_id: body.github_id,
      owner: body.owner,
      name: body.name,
      full_name: body.full_name,
      description: body.description,
      is_private: body.is_private || false,
      default_branch: body.default_branch || 'main',
    }, { onConflict: 'user_id,github_id' })
    .select()
    .single();

  if (error) throw new HTTPException(500, { message: 'Failed to add repository' });

  return c.json(data, 201);
});

// Remove a repository
repos.delete('/:owner/:repo', async (c) => {
  const user = c.get('user');
  const { owner, repo } = c.req.param();

  const { error } = await supabase
    .from('repositories')
    .delete()
    .eq('user_id', user.sub)
    .eq('owner', owner)
    .eq('name', repo);

  if (error) throw new HTTPException(500, { message: 'Failed to remove repository' });

  return c.json({ message: 'Repository removed' });
});

// Sync a repository
repos.post('/:owner/:repo/sync', async (c) => {
  const user = c.get('user');
  const { owner, repo: repoName } = c.req.param();

  const { data: dbUser } = await supabase
    .from('users')
    .select('github_token')
    .eq('id', user.sub)
    .single();

  if (!dbUser) throw new HTTPException(404, { message: 'User not found' });

  const { data: repository } = await supabase
    .from('repositories')
    .select('*')
    .eq('user_id', user.sub)
    .eq('owner', owner)
    .eq('name', repoName)
    .single();

  if (!repository) throw new HTTPException(404, { message: 'Repository not found' });

  // Run sync asynchronously
  syncRepository(repository, dbUser.github_token).catch(console.error);

  return c.json({ message: 'Sync started', repo: repository });
});

// Get repo stats
repos.get('/:owner/:repo/stats', async (c) => {
  const user = c.get('user');
  const { owner, repo: repoName } = c.req.param();

  const { data: repository } = await supabase
    .from('repositories')
    .select('*')
    .eq('user_id', user.sub)
    .eq('owner', owner)
    .eq('name', repoName)
    .single();

  if (!repository) throw new HTTPException(404, { message: 'Repository not found' });

  const [prsResult, commitsResult, syncResult] = await Promise.all([
    supabase
      .from('pull_requests')
      .select('state, readiness_category, readiness_score')
      .eq('repo_id', repository.id),
    supabase
      .from('commits')
      .select('id')
      .eq('repo_id', repository.id),
    supabase
      .from('sync_log')
      .select('*')
      .eq('repo_id', repository.id)
      .order('started_at', { ascending: false })
      .limit(5),
  ]);

  const prs = prsResult.data || [];
  const openPrs = prs.filter(p => p.state === 'open');
  const avgScore = openPrs.length > 0
    ? Math.round(openPrs.reduce((sum, p) => sum + (p.readiness_score || 0), 0) / openPrs.length)
    : 0;

  return c.json({
    repository,
    stats: {
      total_prs: prs.length,
      open_prs: openPrs.length,
      avg_readiness_score: avgScore,
      total_commits: commitsResult.data?.length || 0,
    },
    recent_syncs: syncResult.data || [],
  });
});

export default repos;
