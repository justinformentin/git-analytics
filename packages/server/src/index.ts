import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';

import auth from './routes/auth.js';
import repos from './routes/repos.js';
import pulls from './routes/pulls.js';
import commits from './routes/commits.js';
import authors from './routes/authors.js';
import dashboard from './routes/dashboard.js';

const app = new Hono();

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: [frontendUrl],
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}));

// Routes
app.route('/api/auth', auth);
app.route('/api/repos', repos);
app.route('/api/pulls', pulls);
app.route('/api/commits', commits);
app.route('/api/authors', authors);
app.route('/api/dashboard', dashboard);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// Not found handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

const port = parseInt(process.env.PORT || '3001');
console.log(`Server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
