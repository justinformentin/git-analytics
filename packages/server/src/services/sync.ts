import { supabase } from '../db/client.js';
import {
  createGitHubClient,
  getRepoPullRequests,
  getPullRequestDetails,
  getPullRequestReviews,
  getPullRequestCheckRuns,
  getRepoCommits,
  getCommitDetails,
} from './github.js';
import { computeReadinessScore } from './scoring.js';
import type { Repository } from '../types/index.js';

export async function syncRepository(repo: Repository, githubToken: string): Promise<void> {
  // Create sync log entry
  const { data: syncLogEntry } = await supabase
    .from('sync_log')
    .insert({
      repo_id: repo.id,
      status: 'running',
    })
    .select()
    .single();

  const syncLogId = syncLogEntry?.id;
  let prsSync = 0;
  let commitsSync = 0;

  try {
    // Sync pull requests
    const prs = await getRepoPullRequests(githubToken, repo.owner, repo.name, 'all', 1, 50);

    for (const pr of prs) {
      const details = await getPullRequestDetails(githubToken, repo.owner, repo.name, pr.number);
      const reviews = await getPullRequestReviews(githubToken, repo.owner, repo.name, pr.number);
      const checkRuns = await getPullRequestCheckRuns(githubToken, repo.owner, repo.name, details.head.sha);

      // Compute readiness score
      const scoreInput = {
        reviews: reviews.map(r => ({
          id: '',
          pr_id: '',
          github_id: r.id,
          reviewer_login: r.user?.login || 'unknown',
          reviewer_avatar_url: r.user?.avatar_url,
          state: r.state.toLowerCase() as any,
          submitted_at: r.submitted_at,
        })),
        checkRuns: checkRuns.map(c => ({
          id: '',
          pr_id: '',
          name: c.name,
          status: c.status as any,
          conclusion: c.conclusion as any,
          started_at: c.started_at || undefined,
          completed_at: c.completed_at || undefined,
        })),
        createdAt: pr.created_at,
        mergeable: details.mergeable,
        additions: details.additions,
        deletions: details.deletions,
      };
      const score = computeReadinessScore(scoreInput);

      // Upsert pull request
      const { data: prRecord } = await supabase
        .from('pull_requests')
        .upsert({
          repo_id: repo.id,
          github_id: pr.id,
          number: pr.number,
          title: pr.title,
          body: pr.body,
          state: pr.merged_at ? 'merged' : pr.state,
          author_login: pr.user?.login || 'unknown',
          author_avatar_url: pr.user?.avatar_url,
          head_branch: pr.head.ref,
          base_branch: pr.base.ref,
          mergeable: details.mergeable,
          additions: details.additions,
          deletions: details.deletions,
          changed_files: details.changed_files,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          merged_at: pr.merged_at,
          closed_at: pr.closed_at,
          readiness_score: score.total,
          readiness_category: score.category,
          ci_score: score.ci_score,
          review_score: score.review_score,
          age_score: score.age_score,
          conflict_score: score.conflict_score,
          size_score: score.size_score,
          last_scored_at: new Date().toISOString(),
        }, { onConflict: 'repo_id,number' })
        .select()
        .single();

      if (prRecord) {
        // Upsert reviews
        for (const review of reviews) {
          await supabase.from('reviews').upsert({
            pr_id: prRecord.id,
            github_id: review.id,
            reviewer_login: review.user?.login || 'unknown',
            reviewer_avatar_url: review.user?.avatar_url,
            state: review.state.toLowerCase(),
            submitted_at: review.submitted_at,
          }, { onConflict: 'pr_id,github_id' });
        }

        // Delete and re-insert check runs (they change frequently)
        await supabase.from('check_runs').delete().eq('pr_id', prRecord.id);
        for (const checkRun of checkRuns) {
          await supabase.from('check_runs').insert({
            pr_id: prRecord.id,
            name: checkRun.name,
            status: checkRun.status,
            conclusion: checkRun.conclusion,
            started_at: checkRun.started_at,
            completed_at: checkRun.completed_at,
          });
        }
      }

      prsSync++;
    }

    // Sync commits (last 90 days)
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const commits = await getRepoCommits(githubToken, repo.owner, repo.name, since, 1, 100);

    for (const commit of commits) {
      try {
        const details = await getCommitDetails(githubToken, repo.owner, repo.name, commit.sha);
        await supabase.from('commits').upsert({
          repo_id: repo.id,
          sha: commit.sha,
          message: commit.commit.message,
          author_login: commit.author?.login,
          author_email: commit.commit.author?.email,
          author_avatar_url: commit.author?.avatar_url,
          additions: details.stats?.additions || 0,
          deletions: details.stats?.deletions || 0,
          committed_at: commit.commit.author?.date,
        }, { onConflict: 'repo_id,sha' });
        commitsSync++;
      } catch {
        // Skip commit if details fetch fails
      }
    }

    // Update last_synced_at
    await supabase
      .from('repositories')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', repo.id);

    // Update sync log
    if (syncLogId) {
      await supabase
        .from('sync_log')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          prs_synced: prsSync,
          commits_synced: commitsSync,
        })
        .eq('id', syncLogId);
    }
  } catch (error) {
    if (syncLogId) {
      await supabase
        .from('sync_log')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', syncLogId);
    }
    throw error;
  }
}
