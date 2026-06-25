import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { pullsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatTimeAgo } from '@/lib/utils';
import { GitPullRequest, Search, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

function ReadinessBadge({ category }: { category?: string }) {
  if (category === 'ready') return <Badge variant="success" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Ready</Badge>;
  if (category === 'needs_review') return <Badge variant="warning" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" />Needs Review</Badge>;
  if (category === 'blocked') return <Badge variant="danger" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Blocked</Badge>;
  return <Badge variant="outline" className="text-xs">Unknown</Badge>;
}

function StateBadge({ state }: { state: string }) {
  if (state === 'open') return <Badge variant="success" className="text-xs">Open</Badge>;
  if (state === 'merged') return <Badge variant="default" className="text-xs">Merged</Badge>;
  return <Badge variant="secondary" className="text-xs">Closed</Badge>;
}

export default function PullsPage() {
  const [search, setSearch] = useState('');
  const [readiness, setReadiness] = useState('');
  const [state, setState] = useState('open');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedPr, setExpandedPr] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pulls', { search, readiness, state, sortBy, sortDir }],
    queryFn: () => pullsApi.list({ search, readiness, state, sort: sortBy, dir: sortDir }),
  });

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pull Requests</h1>
        <p className="text-muted-foreground">All PRs across your synced repositories</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search pull requests..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="w-36"><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="merged">Merged</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Select value={readiness} onValueChange={setReadiness}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Readiness" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Readiness</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base flex items-center gap-2">
            <GitPullRequest className="h-4 w-4" />
            {isLoading ? '...' : `${data?.total || 0} Pull Requests`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('number')}>
                  <div className="flex items-center gap-1">PR <SortIcon field="number" /></div>
                </TableHead>
                <TableHead>Repository</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('readiness_score')}>
                  <div className="flex items-center gap-1">Readiness <SortIcon field="readiness_score" /></div>
                </TableHead>
                <TableHead>State</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('updated_at')}>
                  <div className="flex items-center gap-1">Updated <SortIcon field="updated_at" /></div>
                </TableHead>
                <TableHead>Reviewers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : (data?.data || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No pull requests found</TableCell>
                </TableRow>
              ) : (
                (data?.data || []).flatMap((pr: any) => {
                  const rows = [
                    <TableRow key={pr.id} className="cursor-pointer" onClick={() => setExpandedPr(expandedPr === pr.id ? null : pr.id)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={pr.author_avatar_url} />
                            <AvatarFallback className="text-[10px]">{pr.author_login[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm truncate max-w-[200px]">{pr.title}</div>
                            <div className="text-xs text-muted-foreground">#{pr.number} by {pr.author_login}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><span className="text-sm text-muted-foreground">{pr.repo_full_name || pr.repositories?.full_name}</span></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ReadinessBadge category={pr.readiness_category} />
                          <span className="text-xs text-muted-foreground font-mono">{pr.readiness_score}</span>
                        </div>
                      </TableCell>
                      <TableCell><StateBadge state={pr.state} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatTimeAgo(pr.updated_at)}</TableCell>
                      <TableCell>
                        <div className="flex -space-x-2">
                          {(pr.reviews || []).slice(0, 3).map((r: any) => (
                            <Avatar key={r.id} className="h-6 w-6 border-2 border-card">
                              <AvatarImage src={r.reviewer_avatar_url} />
                              <AvatarFallback className="text-[10px]">{r.reviewer_login[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                          ))}
                          {(pr.reviews || []).length === 0 && <span className="text-xs text-muted-foreground">No reviews</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ];
                  if (expandedPr === pr.id) {
                    rows.push(
                      <TableRow key={`${pr.id}-detail`}>
                        <TableCell colSpan={6} className="bg-muted/30 p-4">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground mb-1">Branches</p>
                              <p><span className="font-mono text-xs bg-muted px-1 rounded">{pr.head_branch}</span> → <span className="font-mono text-xs bg-muted px-1 rounded">{pr.base_branch}</span></p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Changes</p>
                              <p className="text-emerald-400">+{pr.additions}</p>
                              <p className="text-red-400">-{pr.deletions}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Score</p>
                              {[['CI', pr.ci_score, 25], ['Reviews', Math.max(0, pr.review_score || 0), 30], ['Age', pr.age_score, 15], ['Conflicts', pr.conflict_score, 15], ['Size', pr.size_score, 15]].map(([label, score, max]) => (
                                <div key={String(label)} className="flex justify-between">
                                  <span className="text-muted-foreground">{label}</span>
                                  <span>{score}/{max}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return rows;
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
