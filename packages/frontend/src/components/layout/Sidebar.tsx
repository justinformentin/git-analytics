import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  GitPullRequest,
  GitCommit,
  Users,
  FolderGit2,
  Settings,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pulls', label: 'Pull Requests', icon: GitPullRequest },
  { to: '/commits', label: 'Commits', icon: GitCommit },
  { to: '/authors', label: 'Authors', icon: Users },
  { to: '/repos', label: 'Repositories', icon: FolderGit2 },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

export function Sidebar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
        <Activity className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold text-foreground">
          Git<span className="text-primary">Analytics</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = to === '/' ? currentPath === '/' : currentPath.startsWith(to);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <p className="text-xs text-muted-foreground">Git Analytics v1.0</p>
      </div>
    </aside>
  );
}
