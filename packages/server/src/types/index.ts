export interface User {
  id: string;
  github_id: number;
  username: string;
  display_name?: string;
  avatar_url?: string;
  github_token: string;
  created_at: string;
  updated_at: string;
}

export interface Repository {
  id: string;
  user_id: string;
  github_id: number;
  owner: string;
  name: string;
  full_name: string;
  description?: string;
  default_branch: string;
  is_private: boolean;
  last_synced_at?: string;
  created_at: string;
}

export interface PullRequest {
  id: string;
  repo_id: string;
  github_id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed' | 'merged';
  author_login: string;
  author_avatar_url?: string;
  head_branch?: string;
  base_branch?: string;
  mergeable?: boolean;
  additions: number;
  deletions: number;
  changed_files: number;
  created_at: string;
  updated_at: string;
  merged_at?: string;
  closed_at?: string;
  readiness_score?: number;
  readiness_category?: 'ready' | 'needs_review' | 'blocked';
  ci_score?: number;
  review_score?: number;
  age_score?: number;
  conflict_score?: number;
  size_score?: number;
  last_scored_at?: string;
}

export interface Review {
  id: string;
  pr_id: string;
  github_id: number;
  reviewer_login: string;
  reviewer_avatar_url?: string;
  state: 'approved' | 'changes_requested' | 'commented' | 'pending' | 'dismissed';
  submitted_at?: string;
}

export interface CheckRun {
  id: string;
  pr_id: string;
  name: string;
  status?: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'timed_out' | 'action_required' | 'skipped';
  started_at?: string;
  completed_at?: string;
}

export interface Commit {
  id: string;
  repo_id: string;
  sha: string;
  message?: string;
  author_login?: string;
  author_email?: string;
  author_avatar_url?: string;
  additions: number;
  deletions: number;
  committed_at?: string;
}

export interface SyncLog {
  id: string;
  repo_id: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  prs_synced: number;
  commits_synced: number;
  error_message?: string;
}

export interface ReadinessScore {
  total: number;
  category: 'ready' | 'needs_review' | 'blocked';
  ci_score: number;
  review_score: number;
  age_score: number;
  conflict_score: number;
  size_score: number;
}

export interface DashboardData {
  overall_readiness: number;
  readiness_label: string;
  open_prs: number;
  open_prs_trend: number;
  merged_this_week: number;
  merged_this_week_trend: number;
  avg_review_time_hours: number;
  avg_review_time_trend: number;
  active_reviewers: number;
  active_reviewers_trend: number;
  distribution: {
    ready: number;
    needs_review: number;
    blocked: number;
    ready_pct: number;
    needs_review_pct: number;
    blocked_pct: number;
  };
  recent_prs: Array<PullRequest & { repo_full_name: string; reviews: Review[]; check_runs: CheckRun[] }>;
}

export interface TrendDataPoint {
  date: string;
  open: number;
  merged: number;
  closed: number;
}

export interface AuthorStats {
  login: string;
  avatar_url?: string;
  prs_opened: number;
  prs_merged: number;
  commits_count: number;
  avg_review_time_given_hours: number;
  review_participation_rate: number;
}

// Context types for Hono
export interface JWTPayload {
  sub: string; // user id
  github_id: number;
  username: string;
  iat: number;
  exp: number;
}
