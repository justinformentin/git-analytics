import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from '../types/index.js';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production'
);

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload as unknown as JWTPayload;
}

export const authMiddleware = createMiddleware<{
  Variables: { user: JWTPayload };
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const cookieToken = getCookieToken(c.req.raw);

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : cookieToken;

  if (!token) {
    throw new HTTPException(401, { message: 'Unauthorized: No token provided' });
  }

  try {
    const payload = await verifyToken(token);
    c.set('user', payload);
    await next();
  } catch {
    throw new HTTPException(401, { message: 'Unauthorized: Invalid token' });
  }
});

function getCookieToken(request: Request): string | undefined {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return undefined;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const tokenCookie = cookies.find(c => c.startsWith('auth_token='));
  return tokenCookie?.split('=')[1];
}
