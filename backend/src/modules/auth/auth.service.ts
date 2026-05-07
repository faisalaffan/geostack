import { FastifyRequest } from 'fastify';

interface JwtPayload {
  sub: string;
  realm_access?: { roles: string[] };
  org_id?: string;
  org_slug?: string;
  preferred_username?: string;
  email?: string;
}

interface UserInfo {
  id: string;
  username: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: string;
}

export function getUserFromToken(request: FastifyRequest): UserInfo {
  const user = request.user as JwtPayload;
  return {
    id: user.sub,
    username: user.preferred_username || '',
    email: user.email || '',
    organizationId: user.org_id || '',
    organizationName: user.org_slug || '',
    role: user.realm_access?.roles?.includes('admin') ? 'admin' : 'viewer',
  };
}
