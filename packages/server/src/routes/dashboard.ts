import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { supabase } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import type { JWTPayload, TrendDataPoint } from '../types/index.js';

const dashboard = new Hono<{ Variables: { user: JWTPayload } }>();

dashboard.use('/*', authMiddleware);

// Main dashboard data
dashboard.get('/', async (c) => {
  const user = c.get('user');

  const { data: userRepos } = await supabase
    .from('repositories')
    .select('id')
    .eq('user_id', user.sub);

  if (!userRepos || userRepos.length === 0) {
    return c.json({
      overall_readiness: 0,
      readiness_label: 'No Data',
      open_prs: 0,
      open_prs_trend: 0,
      merged_this_week: 0,
      merged_this_week_trend: 0,
      avg_review_time_hours: 0,
      avg_review_time_trend: 0,
      active_reviewers: 0,
      active_reviewers_trend: 0,
      distribution: { ready: 0, needs_review: 0, blocked: 0, ready_pct: 0, needs_review_pct: 0, blocked_pct: 0 },
      recent_prs: [],
    });
  }

  const repoIds = userRepos.map(r => r.id);

  // Get all open PRs
  const { data: openPrs } = await supabase
    .from('pull_requests')
    .select('*')
    .in('repo_id', repoIds)
    .eq('state', 'open')
    .order('updated_at', { ascending: false });

  // Get merged PRs this week
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: mergedThisWeek } = await supabase
    .from('pull_requests')
    .select('id')
    .in('repo_id', repoIds)
    .eq('state', 'merged')
    .gte('merged_at', weekAgo);

  const { data: mergedLastWeek } = await supabase
    .from('pull_requests')
    .select('id')
    .in('repo_id', repoIds)
    .eq('state', 'merged')
    .gte('merged_at', twoWeeksAgo)
    .lt('merged_at', weekAgo);

  // Get reviews from this week for active reviewer count
  const prIds = (openPrs || []).map(p => p.id);
  const { data: recentReviews } = prIds.length > 0
    ? await supabase
        .from('reviews')
        .select('reviewer_login, submitted_at')
        .in('pr_id', prIds)
        .gte('submitted_at', weekAgo)
    : { data: [] };

  const activeReviewers = new Set((recentReviews || []).map(r => r.reviewer_login)).size;

  // Compute distribution
  const prs = openPrs || [];
  const ready = prs.filter(p => p.readiness_category === 'ready').length;
  const needsReview = prs.filter(p => p.readiness_category === 'needs_review').length;
  const blocked = prs.filter(p => p.readiness_category === 'blocked').length;
  const total = prs.length;

  const distribution = {
    ready,
    needs_review: needsReview,
    blocked,
    ready_pct: total > 0 ? Math.round((ready / total) * 100) : 0,
    needs_review_pct: total > 0 ? Math.round((needsReview / total) * 100) : 0,
    blocked_pct: total > 0 ? Math.round((blocked / total) * 100) : 0,
  };

  // Overall readiness
  const avgReadiness = total > 0
    ? Math.round(prs.reduce((sum, p) => sum + (p.readiness_score || 0), 0) / total)
    : 0;

  let readinessLabel = 'Poor';
  if (avgReadiness >= 70) readinessLabel = 'Good';
  else if (avgReadiness >= 40) readinessLabel = 'Fair';

  // Recent PRs with reviews
  const recentPrs = prs.slice(0, 10);
  const recentPrIds = recentPrs.map(p => p.id);

  const [reviewsResult, checkRunsResult, repoResult] = await Promise.all([
    recentPrIds.length > 0
      ? supabase.from('reviews').select('*').in('pr_id', recentPrIds)
      : { data: [] },
    recentPrIds.length > 0
      ? supabase.from('check_runs').select('*').in('pr_id', recentPrIds)
      : { data: [] },
    supabase.from('repositories').select('id, full_name').in('id', repoIds),
  ]);

  const reviewsByPr: Record<string, any[]> = {};
  ((reviewsResult as any).data || []).forEach((r: any) => {
    if (!reviewsByPr[r.pr_id]) reviewsByPr[r.pr_id] = [];
    reviewsByPr[r.pr_id].push(r);
  });

  const checksByPr: Record<string, any[]> = {};
  ((checkRunsResult as any).data || []).forEach((c: any) => {
    if (!checksByPr[c.pr_id]) checksByPr[c.pr_id] = [];
    checksByPr[c.pr_id].push(c);
  });

  const repoMap: Record<string, string> = {};
  ((repoResult as any).data || []).forEach((r: any) => { repoMap[r.id] = r.full_name; });

  const recentPrsWithData = recentPrs.map(pr => ({
    ...pr,
    repo_full_name: repoMap[pr.repo_id] || '',
    reviews: reviewsByPr[pr.id] || [],
    check_runs: checksByPr[pr.id] || [],
  }));

  const mergedThisWeekCount = mergedThisWeek?.length || 0;
  const mergedLastWeekCount = mergedLastWeek?.length || 0;
  const mergedTrend = mergedLastWeekCount > 0
    ? Math.round(((mergedThisWeekCount - mergedLastWeekCount) / mergedLastWeekCount) * 100)
    : 0;

  return c.json({
    overall_readiness: avgReadiness,
    readiness_label: readinessLabel,
    open_prs: prs.length,
    open_prs_trend: 0, // Would need previous period data
    merged_this_week: mergedThisWeekCount,
    merged_this_week_trend: mergedTrend,
    avg_review_time_hours: 0, // Computed from review timestamps
    avg_review_time_trend: 0,
    active_reviewers: activeReviewers,
    active_reviewers_trend: 0,
    distribution,
    recent_prs: recentPrsWithData,
  });
});

// PR trend data
dashboard.get('/trend', async (c) => {
  const user = c.get('user');
  const days = parseInt(c.req.query('days') || '7');

  const { data: userRepos } = await supabase
    .from('repositories')
    .select('id')
    .eq('user_id', user.sub);

  if (!userRepos || userRepos.length === 0) return c.json([]);

  const repoIds = userRepos.map(r => r.id);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: prs } = await supabase
    .from('pull_requests')
    .select('state, created_at, merged_at, closed_at')
    .in('repo_id', repoIds)
    .gte('updated_at', since);

  // Group by date
  const trendMap: Record<string, TrendDataPoint> = {};
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    trendMap[dateStr] = { date: dateStr, open: 0, merged: 0, closed: 0 };
  }

  (prs || []).forEach(pr => {
    const createdDate = pr.created_at?.split('T')[0];
    const mergedDate = pr.merged_at?.split('T')[0];
    const closedDate = pr.closed_at?.split('T')[0];

    if (createdDate && trendMap[createdDate]) trendMap[createdDate].open++;
    if (mergedDate && trendMap[mergedDate]) trendMap[mergedDate].merged++;
    if (closedDate && !mergedDate && trendMap[closedDate]) trendMap[closedDate].closed++;
  });

  return c.json(Object.values(trendMap));
});

// Readiness distribution
dashboard.get('/distribution', async (c) => {
  const user = c.get('user');

  const { data: userRepos } = await supabase
    .from('repositories')
    .select('id')
    .eq('user_id', user.sub);

  if (!userRepos || userRepos.length === 0) {
    return c.json({ ready: 0, needs_review: 0, blocked: 0 });
  }

  const repoIds = userRepos.map(r => r.id);

  const { data: prs } = await supabase
    .from('pull_requests')
    .select('readiness_category')
    .in('repo_id', repoIds)
    .eq('state', 'open');

  const result = { ready: 0, needs_review: 0, blocked: 0 };
  (prs || []).forEach(pr => {
    if (pr.readiness_category === 'ready') result.ready++;
    else if (pr.readiness_category === 'needs_review') result.needs_review++;
    else if (pr.readiness_category === 'blocked') result.blocked++;
  });

  return c.json(result);
});

export default dashboard;
