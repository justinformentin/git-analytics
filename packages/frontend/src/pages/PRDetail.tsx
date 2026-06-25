import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { pullsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { formatTimeAgo, formatDate } from '@/lib/utils';
import { CheckCircle2, AlertCircle, XCircle, Clock, GitBranch, Plus, Minus, FileCode } from 'lucide-react';

function ReadinessBadge({ category }: { category?: string }) {
  if (category === 'ready') return <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Ready</Badge>;
  if (category === 'needs_review') return <Badge variant="warning"><AlertCircle className="h-3 w-3 mr-1" />Needs Review</Badge>;
  return <Badge variant="danger"><XCircle className="h-3 w-3 mr-1" />Blocked</Badge>;
}

function ScoreBar({ label, score, max, color }: { label: string; score: number; max: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{score}/{max}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(score / max) * 100}%` }} />
      </div>
    </div>
  );
}

function CheckRunIcon({ status, conclusion }: { status?: string; conclusion?: string }) {
  if (conclusion === 'success') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (conclusion === 'failure' || conclusion === 'timed_out') return <XCircle className="h-4 w-4 text-red-400" />;
  if (status === 'in_progress') return <Clock className="h-4 w-4 text-amber-400 animate-spin" />;
  return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
}

export default function PRDetailPage() {
  const { owner, repo, number } = useParams({ strict: false }) as { owner: string; repo: string; number: string };

  const { data: pr, isLoading } = useQuery({
    queryKey: ['pr-detail', owner, repo, number],
    queryFn: () => pullsApi.get(owner, repo, parseInt(number)),
    enabled: !!(owner && repo && number),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!pr) return <div className="p-6 text-muted-foreground">PR not found</div>;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold">{pr.title}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>#{pr.number}</span>
              <span>·</span>
              <span>{pr.repo_full_name}</span>
              <span>·</span>
              <span>by {pr.author_login}</span>
              <span>·</span>
              <span>{formatDate(pr.created_at)}</span>
            </div>
          </div>
          <ReadinessBadge category={pr.readiness_category} />
        </div>
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{pr.head_branch}</span>
          <span className="text-muted-foreground">→</span>
          <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{pr.base_branch}</span>
          {pr.mergeable === false && <Badge variant="danger" className="text-xs">Has Conflicts</Badge>}
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Readiness Score Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl font-bold text-primary">{pr.readiness_score}</div>
              <div className="text-muted-foreground">/100</div>
              <ReadinessBadge category={pr.readiness_category} />
            </div>
            <ScoreBar label="CI Status" score={pr.ci_score || 0} max={25} color="bg-cyan-400" />
            <ScoreBar label="Review State" score={Math.max(0, pr.review_score || 0)} max={30} color="bg-blue-400" />
            <ScoreBar label="PR Age" score={pr.age_score || 0} max={15} color="bg-purple-400" />
            <ScoreBar label="Merge Conflicts" score={pr.conflict_score || 0} max={15} color="bg-orange-400" />
            <ScoreBar label="Size / Risk" score={pr.size_score || 0} max={15} color="bg-pink-400" />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Changes</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-emerald-400">
                  <Plus className="h-4 w-4" /><span className="font-mono">{pr.additions}</span>
                </div>
                <div className="flex items-center gap-1 text-red-400">
                  <Minus className="h-4 w-4" /><span className="font-mono">{pr.deletions}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                <FileCode className="h-4 w-4" /><span>{pr.changed_files} files changed</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatTimeAgo(pr.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{formatTimeAgo(pr.updated_at)}</span>
              </div>
              {pr.merged_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Merged</span>
                  <span>{formatTimeAgo(pr.merged_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Reviews ({(pr.reviews || []).length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(pr.reviews || []).length === 0 ? (
            <p className="text-muted-foreground text-sm">No reviews yet</p>
          ) : (
            (pr.reviews || []).map((review: any) => (
              <div key={review.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={review.reviewer_avatar_url} />
                  <AvatarFallback>{review.reviewer_login[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <span className="font-medium text-sm">{review.reviewer_login}</span>
                  {review.submitted_at && <span className="text-xs text-muted-foreground ml-2">{formatTimeAgo(review.submitted_at)}</span>}
                </div>
                <Badge
                  variant={review.state === 'approved' ? 'success' : review.state === 'changes_requested' ? 'danger' : 'secondary'}
                  className="capitalize text-xs"
                >
                  {review.state.replace('_', ' ')}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">CI Checks ({(pr.check_runs || []).length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(pr.check_runs || []).length === 0 ? (
            <p className="text-muted-foreground text-sm">No CI checks found</p>
          ) : (
            (pr.check_runs || []).map((check: any) => (
              <div key={check.id} className="flex items-center gap-3 py-2">
                <CheckRunIcon status={check.status} conclusion={check.conclusion} />
                <span className="flex-1 text-sm">{check.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{check.conclusion || check.status || 'unknown'}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
