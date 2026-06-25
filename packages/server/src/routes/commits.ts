import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { supabase } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import type { JWTPayload } from '../types/index.js';

const commits = new Hono<{ Variables: { user: JWTPayload } }>();

commits.use('/*', authMiddleware);

commits.get('/', async (c) => {
  const user = c.get('user');
  const repo = c.req.query('repo');
  const author = c.req.query('author');
  const since = c.req.query('since');
  const until = c.req.query('until');
  const page = parseInt(c.req.query('page') || '1');
  const perPage = parseInt(c.req.query('per_page') || '50');

  const { data: userRepos } = await supabase
    .from('repositories')
    .select('id, full_name')
    .eq('user_id', user.sub);

  if (!userRepos || userRepos.length === 0) return c.json({ data: [], total: 0 });

  const repoIds = userRepos.map(r => r.id);

  let query = supabase
    .from('commits')
    .select('*, repositories!inner(full_name, owner, name)')
    .in('repo_id', repoIds);

  if (repo) {
    const targetRepo = userRepos.find(r => r.full_name === repo);
    if (targetRepo) query = query.eq('repo_id', targetRepo.id);
  }
  if (author) query = query.ilike('author_login', `%${author}%`);
  if (since) query = query.gte('committed_at', since);
  if (until) query = query.lte('committed_at', until);

  query = query
    .order('committed_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  const { data, error } = await query;

  if (error) throw new HTTPException(500, { message: 'Failed to fetch commits' });

  return c.json({ data: data || [], total: data?.length || 0 });
});

export default commits;
