import { useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, User, Key, Shield, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      localStorage.removeItem('auth_token');
      qc.clear();
      navigate({ to: '/login' });
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ) : user ? (
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="text-xl">{user.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{user.display_name || user.username}</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
                <Badge variant="success" className="mt-1 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  GitHub Connected
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Unable to load user info</p>
          )}
        </CardContent>
      </Card>

      {/* OAuth Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            OAuth Token
          </CardTitle>
          <CardDescription>Your GitHub OAuth token status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-500/20">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-sm">Token Active</p>
              <p className="text-xs text-muted-foreground">
                Your GitHub OAuth token is valid and has <code className="bg-muted px-1 rounded text-xs">repo</code> and <code className="bg-muted px-1 rounded text-xs">read:user</code> scopes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync Preferences</CardTitle>
          <CardDescription>Configure automatic sync behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-sync</p>
              <p className="text-xs text-muted-foreground">Automatically sync repositories every hour</p>
            </div>
            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Webhook sync</p>
              <p className="text-xs text-muted-foreground">Sync on GitHub push events</p>
            </div>
            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sign out</p>
              <p className="text-xs text-muted-foreground">Sign out of your Git Analytics account</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {logoutMutation.isPending ? 'Signing out...' : 'Sign Out'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
