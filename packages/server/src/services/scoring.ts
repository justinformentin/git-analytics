import type { Review, CheckRun, ReadinessScore } from '../types/index.js';

interface ScoringInput {
  reviews: Review[];
  checkRuns: CheckRun[];
  createdAt: string;
  mergeable?: boolean | null;
  additions: number;
  deletions: number;
}

export function computeReadinessScore(input: ScoringInput): ReadinessScore {
  const ciScore = computeCIScore(input.checkRuns);
  const reviewScore = computeReviewScore(input.reviews);
  const ageScore = computeAgeScore(input.createdAt);
  const conflictScore = computeConflictScore(input.mergeable);
  const sizeScore = computeSizeScore(input.additions + input.deletions);

  const total = Math.max(0, Math.min(100, ciScore + reviewScore + ageScore + conflictScore + sizeScore));

  let category: 'ready' | 'needs_review' | 'blocked';
  if (total >= 70) {
    category = 'ready';
  } else if (total >= 40) {
    category = 'needs_review';
  } else {
    category = 'blocked';
  }

  return { total, category, ci_score: ciScore, review_score: reviewScore, age_score: ageScore, conflict_score: conflictScore, size_score: sizeScore };
}

function computeCIScore(checkRuns: CheckRun[]): number {
  // CI status (25%): all passing = 25, some failing = 10, pending = 15, none = 20
  if (checkRuns.length === 0) return 20;

  const completed = checkRuns.filter(c => c.status === 'completed');
  const pending = checkRuns.filter(c => c.status !== 'completed');
  const failing = completed.filter(c => c.conclusion === 'failure' || c.conclusion === 'timed_out' || c.conclusion === 'action_required');
  const passing = completed.filter(c => c.conclusion === 'success' || c.conclusion === 'neutral' || c.conclusion === 'skipped');

  if (pending.length > 0 && failing.length === 0) return 15;
  if (failing.length > 0) return 10;
  if (passing.length === completed.length && completed.length > 0) return 25;
  return 20;
}

function computeReviewScore(reviews: Review[]): number {
  // Review state (30%): approved = 30, no reviews = 0, changes requested = -10, pending reviews = 15
  if (reviews.length === 0) return 0;

  const hasApproval = reviews.some(r => r.state === 'approved');
  const hasChangesRequested = reviews.some(r => r.state === 'changes_requested');
  const hasPending = reviews.some(r => r.state === 'pending');

  if (hasApproval && !hasChangesRequested) return 30;
  if (hasChangesRequested) return -10;
  if (hasPending) return 15;
  return 0;
}

function computeAgeScore(createdAt: string): number {
  // PR age/staleness (15%): <1 day = 15, 1-3 days = 12, 3-7 days = 8, >7 days = 3
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays < 1) return 15;
  if (ageDays < 3) return 12;
  if (ageDays < 7) return 8;
  return 3;
}

function computeConflictScore(mergeable?: boolean | null): number {
  // Merge conflicts (15%): clean = 15, conflicts = 0
  if (mergeable === false) return 0;
  return 15; // unknown or true = clean
}

function computeSizeScore(totalLines: number): number {
  // Size/risk (15%): <100 lines = 15, 100-500 = 10, 500-1000 = 5, >1000 = 2
  if (totalLines < 100) return 15;
  if (totalLines < 500) return 10;
  if (totalLines < 1000) return 5;
  return 2;
}
