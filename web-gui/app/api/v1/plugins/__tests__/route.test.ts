import { NextRequest } from 'next/server';

import { GET, POST } from '../route';

// Mock the auth middleware
jest.mock('@/lib/middleware/api-auth', () => ({
  withApiAuth: (handler: any) => handler
}));

describe('/api/v1/plugins', () => {
  it('should return plugin endpoints information on GET', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/plugins');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('plugins');
    expect(data).toHaveProperty('endpoints');
    expect(data.endpoints).toHaveProperty('install');
    expect(data.endpoints).toHaveProperty('registry');
    expect(data.endpoints).toHaveProperty('docs');
  });

  it('should validate a valid plugin manifest on POST', async () => {
    const validManifest = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin',
      author: 'Test Author',
      main: 'class TestPlugin { async onLoad(api) { } } module.exports = TestPlugin;'
    };

    const request = new NextRequest('http://localhost:3000/api/v1/plugins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manifest: validManifest })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.manifest).toEqual(validManifest);
    expect(data.securityIssues).toEqual([]);
  });

  it('should reject plugin manifest with missing required fields', async () => {
    const invalidManifest = {
      name: 'Test Plugin',
      description: 'A test plugin'
      // Missing id, version, author, main
    };

    const request = new NextRequest('http://localhost:3000/api/v1/plugins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manifest: invalidManifest })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid plugin manifest');
    expect(data.missingFields).toContain('id');
    expect(data.missingFields).toContain('version');
    expect(data.missingFields).toContain('author');
    expect(data.missingFields).toContain('main');
  });

  it('should detect security issues in plugin code', async () => {
    const unsafeManifest = {
      id: 'unsafe-plugin',
      name: 'Unsafe Plugin',
      version: '1.0.0',
      description: 'An unsafe plugin',
      author: 'Test Author',
      main: 'eval("malicious code"); document.cookie = "hack";'
    };

    const request = new NextRequest('http://localhost:3000/api/v1/plugins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manifest: unsafeManifest })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(false);
    expect(data.securityIssues.length).toBeGreaterThan(0);
    expect(data.securityIssues).toContain('Plugin code contains eval() which is not allowed');
    expect(data.securityIssues).toContain('Plugin code attempts to access cookies directly');
  });

  it('should reject invalid version format', async () => {
    const invalidVersionManifest = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: 'invalid-version',
      description: 'A test plugin',
      author: 'Test Author',
      main: 'class TestPlugin { } module.exports = TestPlugin;'
    };

    const request = new NextRequest('http://localhost:3000/api/v1/plugins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manifest: invalidVersionManifest })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid version format. Expected: x.y.z');
  });

  it('should reject invalid plugin ID format', async () => {
    const invalidIdManifest = {
      id: 'Invalid_Plugin_ID!',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin',
      author: 'Test Author',
      main: 'class TestPlugin { } module.exports = TestPlugin;'
    };

    const request = new NextRequest('http://localhost:3000/api/v1/plugins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manifest: invalidIdManifest })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid plugin ID. Use lowercase letters, numbers, and hyphens only');
  });
});
