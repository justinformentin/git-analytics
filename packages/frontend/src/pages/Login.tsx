import { useState } from 'react';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Github, GitPullRequest, BarChart3, Users } from 'lucide-react';

const features = [
  { icon: GitPullRequest, text: 'PR readiness scoring (0-100)' },
  { icon: BarChart3, text: 'Commit trends & analytics' },
  { icon: Users, text: 'Author contribution metrics' },
  { icon: Activity, text: 'Review health & queue visibility' },
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGitHubLogin = async () => {
    setLoading(true);
    try {
      const { url, state } = await authApi.initOAuth();
      sessionStorage.setItem('oauth_state', state);
      window.location.href = url;
    } catch (error) {
      console.error('OAuth init failed:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Activity className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold">
              Git<span className="text-primary">Analytics</span>
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">
            PR readiness platform for GitHub maintainers
          </p>
          <ul className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-muted-foreground">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                {text}
              </li>
            ))}
          </ul>
          <div className="border-l-2 border-primary pl-4 text-sm text-muted-foreground">
            <p>Track which PRs are ready to merge, identify review bottlenecks, and keep your codebase moving.</p>
          </div>
        </div>

        <Card className="border-border/50">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl">Get Started</CardTitle>
            <CardDescription>
              Connect your GitHub account to start tracking PR readiness.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full h-12 text-base" onClick={handleGitHubLogin} disabled={loading}>
              <Github className="h-5 w-5 mr-2" />
              {loading ? 'Redirecting to GitHub...' : 'Continue with GitHub'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              We never write to your code. Read-only access only.
            </p>
            <div className="rounded-md border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1 text-foreground">Required permissions:</p>
              <ul className="space-y-1">
                <li>• <code className="bg-muted px-1 rounded">repo</code> — Read repository data, PRs, commits</li>
                <li>• <code className="bg-muted px-1 rounded">read:user</code> — Read your profile info</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
