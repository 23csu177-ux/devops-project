import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
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
