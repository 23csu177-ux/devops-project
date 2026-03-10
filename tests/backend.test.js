const request = require('supertest');
const path = require('path');
const { createApp, readVersion } = require('../src/backend/app');

let app;

beforeAll(() => {
  app = createApp();
});

describe('GET /', () => {
  it('should return message, version, and env', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Hello');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('env');
  });

  it('should return a valid version string', async () => {
    const res = await request(app).get('/');
    expect(res.body.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should return JSON content type', async () => {
    const res = await request(app).get('/');
    expect(res.headers['content-type']).toMatch(/json/);
  });
});

describe('GET /health', () => {
  it('should return status 200', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
  });

  it('should return status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('should return JSON content type', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['content-type']).toMatch(/json/);
  });
});

describe('GET /version', () => {
  it('should return version info', async () => {
    const res = await request(app).get('/version');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('version');
    expect(res.body.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('CORS headers', () => {
  it('should include CORS headers', async () => {
    const res = await request(app).get('/');
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });
});

describe('Unknown routes', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.statusCode).toBe(404);
  });
});

describe('readVersion', () => {
  it('should read version from a valid file path', () => {
    const versionPath = path.join(__dirname, '..', 'version.txt');
    const version = readVersion(versionPath);
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should return 0.0.0 when version file does not exist', () => {
    const version = readVersion('/nonexistent/path/version.txt');
    expect(version).toBe('0.0.0');
  });
});

describe('createApp with missing version file', () => {
  it('should use fallback version when file is missing', async () => {
    const fallbackApp = createApp({ versionPath: '/nonexistent/version.txt' });
    const res = await request(fallbackApp).get('/');
    expect(res.body.version).toBe('0.0.0');
  });

  it('should still respond to health check with missing version', async () => {
    const fallbackApp = createApp({ versionPath: '/nonexistent/version.txt' });
    const res = await request(fallbackApp).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
