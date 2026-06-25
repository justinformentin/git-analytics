import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { commitsApi, reposApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeAgo, shortenSha } from '@/lib/utils';
import { GitCommit, Plus, Minus } from 'lucide-react';

export default function CommitsPage() {
  const [author, setAuthor] = useState('');
  const [repo, setRepo] = useState('');

  const { data: repos } = useQuery({
    queryKey: ['repos'],
    queryFn: reposApi.list,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['commits', { author, repo }],
    queryFn: () => commitsApi.list({ author, repo }),
  });

  const commits = data?.data || [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commits</h1>
        <p className="text-muted-foreground">Commit history across your repositories</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Input
              placeholder="Filter by author..."
              value={author}
              onChange={e => setAuthor(e.target.value)}
              className="max-w-xs"
            />
            <Select value={repo} onValueChange={setRepo}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="All repositories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All repositories</SelectItem>
                {(repos || []).map((r: any) => (
                  <SelectItem key={r.id} value={r.full_name}>{r.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Commits List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitCommit className="h-4 w-4" />
            {isLoading ? '...' : `${commits.length} Commits`}
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : commits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GitCommit className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No commits found. Sync a repository to see commits.</p>
            </div>
          ) : (
            commits.map((commit: any) => (
              <div key={commit.id} className="flex items-start gap-3 p-4 hover:bg-muted/30">
                <Avatar className="h-8 w-8 mt-0.5">
                  <AvatarImage src={commit.author_avatar_url} />
                  <AvatarFallback className="text-xs">
                    {commit.author_login?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {commit.message?.split('\n')[0] || 'No message'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="font-mono text-primary">{shortenSha(commit.sha)}</span>
                    <span>·</span>
                    <span>{commit.author_login || commit.author_email || 'Unknown'}</span>
                    <span>·</span>
                    <span>{commit.repositories?.full_name}</span>
                    {commit.committed_at && (
                      <>
                        <span>·</span>
                        <span>{formatTimeAgo(commit.committed_at)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs shrink-0">
                  {commit.additions > 0 && (
                    <span className="flex items-center text-emerald-400">
                      <Plus className="h-3 w-3" />{commit.additions}
                    </span>
                  )}
                  {commit.deletions > 0 && (
                    <span className="flex items-center text-red-400">
                      <Minus className="h-3 w-3" />{commit.deletions}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
