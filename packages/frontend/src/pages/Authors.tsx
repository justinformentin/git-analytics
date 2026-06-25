import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { authorsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp, Users, GitPullRequest, GitMerge, GitCommit, Star } from 'lucide-react';

export default function AuthorsPage() {
  const [sortBy, setSortBy] = useState<string>('prs_opened');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: authors, isLoading } = useQuery({
    queryKey: ['authors'],
    queryFn: authorsApi.list,
  });

  const sorted = [...(authors || [])].sort((a: any, b: any) => {
    const aVal = a[sortBy] || 0;
    const bVal = b[sortBy] || 0;
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Authors</h1>
        <p className="text-muted-foreground">Contributor metrics and activity</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Contributors', value: (authors || []).length, icon: Users },
          { label: 'Most PRs', value: sorted[0]?.login || '—', icon: GitPullRequest },
          { label: 'Total PRs Opened', value: (authors || []).reduce((s: number, a: any) => s + a.prs_opened, 0), icon: GitMerge },
          { label: 'Total Commits', value: (authors || []).reduce((s: number, a: any) => s + a.commits_count, 0), icon: GitCommit },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-muted">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Authors Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {isLoading ? '...' : `${(authors || []).length} Contributors`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Author</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('prs_opened')}
                >
                  <div className="flex items-center gap-1">PRs Opened <SortIcon field="prs_opened" /></div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('prs_merged')}
                >
                  <div className="flex items-center gap-1">PRs Merged <SortIcon field="prs_merged" /></div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('commits_count')}
                >
                  <div className="flex items-center gap-1">Commits <SortIcon field="commits_count" /></div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('review_participation_rate')}
                >
                  <div className="flex items-center gap-1">Review Rate <SortIcon field="review_participation_rate" /></div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(5)].map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No contributors found. Sync repositories to see author data.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((author: any, idx: number) => (
                  <TableRow key={author.login}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={author.avatar_url} />
                          <AvatarFallback>{author.login[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{author.login}</div>
                          {idx === 0 && <Badge variant="default" className="text-xs mt-0.5"><Star className="h-3 w-3 mr-1" />Top Contributor</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <GitPullRequest className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono">{author.prs_opened}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <GitMerge className="h-3 w-3 text-emerald-400" />
                        <span className="font-mono">{author.prs_merged}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <GitCommit className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono">{author.commits_count}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${author.review_participation_rate}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-10 text-right">
                          {author.review_participation_rate}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
