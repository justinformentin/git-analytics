import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
  Outlet,
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import DashboardPage from './pages/Dashboard';
import PullsPage from './pages/Pulls';
import PRDetailPage from './pages/PRDetail';
import CommitsPage from './pages/Commits';
import AuthorsPage from './pages/Authors';
import ReposPage from './pages/Repos';
import SettingsPage from './pages/Settings';
import LoginPage from './pages/Login';
import AuthCallbackPage from './pages/AuthCallback';
import AuthErrorPage from './pages/AuthError';

function isAuthenticated() {
  return !!localStorage.getItem('auth_token');
}

// Root route
const rootRoute = createRootRoute({
  component: Outlet,
});

// Auth layout route
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_app',
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
  },
  component: AppLayout,
});

// App routes
const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  component: DashboardPage,
});

const pullsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/pulls',
  component: PullsPage,
});

const prDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/pulls/$owner/$repo/$number',
  component: PRDetailPage,
});

const commitsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/commits',
  component: CommitsPage,
});

const authorsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/authors',
  component: AuthorsPage,
});

const reposRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/repos',
  component: ReposPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settings',
  component: SettingsPage,
});

// Public routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginPage,
});

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  component: AuthCallbackPage,
});

const authErrorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/error',
  component: AuthErrorPage,
});

const routeTree = rootRoute.addChildren([
  appRoute.addChildren([
    indexRoute,
    pullsRoute,
    prDetailRoute,
    commitsRoute,
    authorsRoute,
    reposRoute,
    settingsRoute,
  ]),
  loginRoute,
  authCallbackRoute,
  authErrorRoute,
]);

export function createAppRouter(_queryClient: QueryClient) {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}
