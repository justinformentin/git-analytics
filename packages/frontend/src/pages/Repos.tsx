import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { reposApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeAgo } from '@/lib/utils';
import {
  FolderGit2, RefreshCw, Plus, Search, Lock, Globe, Trash2,
  CheckCircle2, AlertCircle, Clock,
} from 'lucide-react';

export default function ReposPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [searchGitHub, setSearchGitHub] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [syncingRepos, setSyncingRepos] = useState<Set<string>>(new Set());

  const { data: repos, isLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: reposApi.list,
  });

  const { data: githubRepos, isLoading: githubLoading } = useQuery({
    queryKey: ['repos-github'],
    queryFn: reposApi.search,
    enabled: addDialogOpen,
  });

  const addMutation = useMutation({
    mutationFn: reposApi.add,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['repos'] });
      setAddDialogOpen(false);
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ owner, name }: { owner: string; name: string }) => reposApi.remove(owner, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['repos'] }),
  });

  const handleSync = async (owner: string, name: string, id: string) => {
    setSyncingRepos(s => new Set([...s, id]));
    try {
      await reposApi.sync(owner, name);
      setTimeout(() => {
        setSyncingRepos(s => { const n = new Set(s); n.delete(id); return n; });
        qc.invalidateQueries({ queryKey: ['repos'] });
      }, 2000);
    } catch {
      setSyncingRepos(s => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  const filteredGitHub = (githubRepos || []).filter((r: any) =>
    r.full_name.toLowerCase().includes(searchGitHub.toLowerCase())
  );

  const syncedIds = new Set((repos || []).map((r: any) => r.github_id));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Repositories</h1>
          <p className="text-muted-foreground">Manage your synced repositories</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Repository
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Repository</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search your GitHub repos..."
                  value={searchGitHub}
                  onChange={e => setSearchGitHub(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {githubLoading ? (
                  [...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)
                ) : filteredGitHub.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-sm">No repositories found</p>
                ) : (
                  filteredGitHub.map((repo: any) => {
                    const alreadyAdded = syncedIds.has(repo.github_id);
                    return (
                      <div key={repo.github_id} className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          {repo.is_private ? <Lock className="h-3 w-3 text-muted-foreground" /> : <Globe className="h-3 w-3 text-muted-foreground" />}
                          <div>
                            <p className="text-sm font-medium">{repo.full_name}</p>
                            {repo.description && <p className="text-xs text-muted-foreground truncate max-w-[250px]">{repo.description}</p>}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={alreadyAdded ? 'secondary' : 'default'}
                          disabled={alreadyAdded || addMutation.isPending}
                          onClick={() => addMutation.mutate(repo)}
                        >
                          {alreadyAdded ? 'Added' : 'Add'}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Repos grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : (repos || []).length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FolderGit2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No repositories yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Click "Add Repository" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {(repos || []).map((repo: any) => {
            const isSyncing = syncingRepos.has(repo.id);
            return (
              <Card key={repo.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {repo.is_private ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Globe className="h-4 w-4 text-muted-foreground" />}
                      <CardTitle className="text-base">{repo.full_name}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeMutation.mutate({ owner: repo.owner, name: repo.name })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {repo.description && (
                    <CardDescription className="text-xs">{repo.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {repo.last_synced_at ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        <span>Last synced {formatTimeAgo(repo.last_synced_at)}</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 text-amber-400" />
                        <span>Never synced</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{repo.default_branch}</Badge>
                    {repo.is_private && <Badge variant="secondary" className="text-xs">Private</Badge>}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={isSyncing}
                    onClick={() => handleSync(repo.owner, repo.name, repo.id)}
                  >
                    {isSyncing ? (
                      <><RefreshCw className="h-3 w-3 mr-2 animate-spin" />Syncing...</>
                    ) : (
                      <><RefreshCw className="h-3 w-3 mr-2" />Sync Now</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
