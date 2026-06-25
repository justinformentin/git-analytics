import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { formatTimeAgo, cn } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  GitPullRequest, GitMerge, Clock, Users, TrendingUp, TrendingDown,
  CheckCircle2, AlertCircle, XCircle,
} from 'lucide-react';

function ReadinessGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? '#00ffff' : score >= 40 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        <circle
          cx="60" cy="60" r="45"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text x="60" y="55" textAnchor="middle" fill={color} fontSize="20" fontWeight="bold">
          {score}%
        </text>
        <text x="60" y="72" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">
          {label}
        </text>
      </svg>
      <p className="text-sm text-muted-foreground">Overall Readiness</p>
    </div>
  );
}

function StatCard({
  title, value, trend, icon: Icon, suffix = '',
}: {
  title: string;
  value: number | string;
  trend?: number;
  icon: React.ComponentType<{ className?: string }>;
  suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}{suffix}</p>
            {trend !== undefined && trend !== 0 && (
              <div className={cn('flex items-center gap-1 mt-1 text-xs', trend >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend)}% vs last week
              </div>
            )}
          </div>
          <div className="p-3 rounded-full bg-muted">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReadinessBadge({ category }: { category?: string }) {
  if (category === 'ready') {
    return <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Ready</Badge>;
  }
  if (category === 'needs_review') {
    return <Badge variant="warning"><AlertCircle className="h-3 w-3 mr-1" />Needs Review</Badge>;
  }
  return <Badge variant="danger"><XCircle className="h-3 w-3 mr-1" />Blocked</Badge>;
}

export default function DashboardPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
  });

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['dashboard-trend', 7],
    queryFn: () => dashboardApi.trend(7),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const dist = dashboard?.distribution || {};
  const totalDist = (dist.ready || 0) + (dist.needs_review || 0) + (dist.blocked || 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">PR readiness overview across your repositories</p>
      </div>

      {/* Top section: Gauge + Stat cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="flex items-center justify-center p-6">
          <ReadinessGauge
            score={dashboard?.overall_readiness || 0}
            label={dashboard?.readiness_label || 'No Data'}
          />
        </Card>
        <div className="col-span-4 grid grid-cols-2 gap-4">
          <StatCard
            title="Open PRs"
            value={dashboard?.open_prs || 0}
            trend={dashboard?.open_prs_trend}
            icon={GitPullRequest}
          />
          <StatCard
            title="Merged This Week"
            value={dashboard?.merged_this_week || 0}
            trend={dashboard?.merged_this_week_trend}
            icon={GitMerge}
          />
          <StatCard
            title="Avg Review Time"
            value={dashboard?.avg_review_time_hours || 0}
            suffix="h"
            icon={Clock}
          />
          <StatCard
            title="Active Reviewers"
            value={dashboard?.active_reviewers || 0}
            icon={Users}
          />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-base">PR Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-48" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Line type="monotone" dataKey="open" stroke="#00ffff" strokeWidth={2} dot={false} name="Opened" />
                  <Line type="monotone" dataKey="merged" stroke="#10b981" strokeWidth={2} dot={false} name="Merged" />
                  <Line type="monotone" dataKey="closed" stroke="#f59e0b" strokeWidth={2} dot={false} name="Closed" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Readiness Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Ready', color: 'bg-emerald-400', count: dist.ready || 0 },
              { label: 'Needs Review', color: 'bg-amber-400', count: dist.needs_review || 0 },
              { label: 'Blocked', color: 'bg-red-400', count: dist.blocked || 0 },
            ].map(({ label, color, count }) => {
              const pct = totalDist > 0 ? Math.round((count / totalDist) * 100) : 0;
              return (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', color)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recent PRs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Pull Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {(dashboard?.recent_prs || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GitPullRequest className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No pull requests yet. Add a repository to get started.</p>
            </div>
          ) : (
            (dashboard?.recent_prs || []).map((pr: any, idx: number) => (
              <div key={pr.id}>
                <div className="flex items-center gap-4 py-4">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={pr.author_avatar_url} />
                    <AvatarFallback>{pr.author_login?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">#{pr.number}</span>
                      <span className="font-medium text-sm truncate">{pr.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{pr.repo_full_name}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{formatTimeAgo(pr.updated_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {(pr.reviews || []).slice(0, 3).map((r: any) => (
                        <Avatar key={r.id} className="h-6 w-6 border-2 border-card">
                          <AvatarImage src={r.reviewer_avatar_url} />
                          <AvatarFallback className="text-[10px]">{r.reviewer_login[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <ReadinessBadge category={pr.readiness_category} />
                    <span className="text-sm font-mono text-muted-foreground w-8 text-right">
                      {pr.readiness_score}
                    </span>
                  </div>
                </div>
                {idx < (dashboard?.recent_prs || []).length - 1 && <Separator />}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
