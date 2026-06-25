-- Git Analytics Initial Schema Migration
-- Run this in your Supabase SQL editor or via the Supabase CLI

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id BIGINT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  github_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repositories (synced repos)
CREATE TABLE IF NOT EXISTS repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  github_id BIGINT NOT NULL,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  default_branch TEXT DEFAULT 'main',
  is_private BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, github_id)
);

-- Pull Requests
CREATE TABLE IF NOT EXISTS pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  github_id BIGINT NOT NULL,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  state TEXT NOT NULL,
  author_login TEXT NOT NULL,
  author_avatar_url TEXT,
  head_branch TEXT,
  base_branch TEXT,
  mergeable BOOLEAN,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  changed_files INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  merged_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  readiness_score INTEGER,
  readiness_category TEXT,
  ci_score INTEGER,
  review_score INTEGER,
  age_score INTEGER,
  conflict_score INTEGER,
  size_score INTEGER,
  last_scored_at TIMESTAMPTZ,
  UNIQUE(repo_id, number)
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id UUID REFERENCES pull_requests(id) ON DELETE CASCADE,
  github_id BIGINT NOT NULL,
  reviewer_login TEXT NOT NULL,
  reviewer_avatar_url TEXT,
  state TEXT NOT NULL,
  submitted_at TIMESTAMPTZ,
  UNIQUE(pr_id, github_id)
);

-- Check Runs (CI)
CREATE TABLE IF NOT EXISTS check_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id UUID REFERENCES pull_requests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT,
  conclusion TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Commits
CREATE TABLE IF NOT EXISTS commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  sha TEXT NOT NULL,
  message TEXT,
  author_login TEXT,
  author_email TEXT,
  author_avatar_url TEXT,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  committed_at TIMESTAMPTZ,
  UNIQUE(repo_id, sha)
);

-- Sync log
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  prs_synced INTEGER DEFAULT 0,
  commits_synced INTEGER DEFAULT 0,
  error_message TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_repositories_user_id ON repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_repo_id ON pull_requests(repo_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_state ON pull_requests(state);
CREATE INDEX IF NOT EXISTS idx_pull_requests_readiness_category ON pull_requests(readiness_category);
CREATE INDEX IF NOT EXISTS idx_pull_requests_author_login ON pull_requests(author_login);
CREATE INDEX IF NOT EXISTS idx_reviews_pr_id ON reviews(pr_id);
CREATE INDEX IF NOT EXISTS idx_check_runs_pr_id ON check_runs(pr_id);
CREATE INDEX IF NOT EXISTS idx_commits_repo_id ON commits(repo_id);
CREATE INDEX IF NOT EXISTS idx_commits_author_login ON commits(author_login);
CREATE INDEX IF NOT EXISTS idx_commits_committed_at ON commits(committed_at);
CREATE INDEX IF NOT EXISTS idx_sync_log_repo_id ON sync_log(repo_id);

-- Updated_at trigger for users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pull_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by the backend with service role key)
-- These policies are for future client-side access if needed
CREATE POLICY "Service role has full access to users"
  ON users FOR ALL
  USING (true);

CREATE POLICY "Service role has full access to repositories"
  ON repositories FOR ALL
  USING (true);

CREATE POLICY "Service role has full access to pull_requests"
  ON pull_requests FOR ALL
  USING (true);

CREATE POLICY "Service role has full access to reviews"
  ON reviews FOR ALL
  USING (true);

CREATE POLICY "Service role has full access to check_runs"
  ON check_runs FOR ALL
  USING (true);

CREATE POLICY "Service role has full access to commits"
  ON commits FOR ALL
  USING (true);

CREATE POLICY "Service role has full access to sync_log"
  ON sync_log FOR ALL
  USING (true);
