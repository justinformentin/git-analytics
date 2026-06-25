import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { supabase } from '../db/client.js';
import { buildOAuthUrl, exchangeCodeForToken, getAuthenticatedUser } from '../services/github.js';
import { signToken, authMiddleware } from '../middleware/auth.js';
import type { JWTPayload } from '../types/index.js';

const auth = new Hono<{ Variables: { user: JWTPayload } }>();

// Initiate GitHub OAuth
auth.post('/github', async (c) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL;

  if (!clientId || !callbackUrl) {
    throw new HTTPException(500, { message: 'GitHub OAuth not configured' });
  }

  const state = crypto.randomUUID();
  const url = buildOAuthUrl(clientId, callbackUrl, state);

  return c.json({ url, state });
});

// GitHub OAuth callback
auth.get('/github/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code) {
    throw new HTTPException(400, { message: 'Missing code parameter' });
  }

  const clientId = process.env.GITHUB_CLIENT_ID!;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET!;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  try {
    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(clientId, clientSecret, code);

    // Get user info from GitHub
    const githubUser = await getAuthenticatedUser(accessToken);

    // Upsert user in database
    const { data: user, error } = await supabase
      .from('users')
      .upsert({
        github_id: githubUser.id,
        username: githubUser.login,
        display_name: githubUser.name || githubUser.login,
        avatar_url: githubUser.avatar_url,
        github_token: accessToken,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'github_id' })
      .select()
      .single();

    if (error || !user) {
      throw new HTTPException(500, { message: 'Failed to create user' });
    }

    // Create JWT
    const token = await signToken({
      sub: user.id,
      github_id: user.github_id,
      username: user.username,
    });

    // Redirect to frontend with token
    const redirectUrl = new URL('/auth/callback', frontendUrl);
    redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('state', state || '');

    return c.redirect(redirectUrl.toString());
  } catch (error) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const errorUrl = new URL('/auth/error', frontendUrl);
    errorUrl.searchParams.set('message', error instanceof Error ? error.message : 'Auth failed');
    return c.redirect(errorUrl.toString());
  }
});

// Get current user
auth.get('/me', authMiddleware, async (c) => {
  const jwtUser = c.get('user');

  const { data: user, error } = await supabase
    .from('users')
    .select('id, github_id, username, display_name, avatar_url, created_at')
    .eq('id', jwtUser.sub)
    .single();

  if (error || !user) {
    throw new HTTPException(404, { message: 'User not found' });
  }

  return c.json(user);
});

// Logout
auth.post('/logout', authMiddleware, async (c) => {
  return c.json({ message: 'Logged out successfully' });
});

export default auth;
