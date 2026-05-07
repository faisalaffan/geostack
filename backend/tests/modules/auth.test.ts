import { describe, it, expect } from 'vitest';
import { getUserFromToken } from '../../src/modules/auth/auth.service.js';
import type { FastifyRequest } from 'fastify';

describe('getUserFromToken', () => {
  it('extracts user info from JWT payload', () => {
    const mockRequest = {
      user: {
        sub: 'user-123',
        preferred_username: 'demo',
        email: 'demo@test.com',
        org_id: 'org-1',
        org_slug: 'demo_org',
        realm_access: { roles: ['admin'] },
      },
    } as unknown as FastifyRequest;

    const result = getUserFromToken(mockRequest);

    expect(result.id).toBe('user-123');
    expect(result.username).toBe('demo');
    expect(result.role).toBe('admin');
    expect(result.organizationId).toBe('org-1');
  });

  it('defaults role to viewer for non-admin users', () => {
    const mockRequest = {
      user: {
        sub: 'user-456',
        preferred_username: 'viewer',
        email: 'viewer@test.com',
        org_id: 'org-1',
        org_slug: 'demo_org',
        realm_access: { roles: [] },
      },
    } as unknown as FastifyRequest;

    const result = getUserFromToken(mockRequest);
    expect(result.role).toBe('viewer');
  });
});
