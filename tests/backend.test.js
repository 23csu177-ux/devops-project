const request = require('supertest');
const path = require('path');
const { createApp, readVersion } = require('../src/backend/app');

// In-memory mock store
let storeData;

function mockStore() {
  return {
    readJSON: (file) => JSON.parse(JSON.stringify(storeData[file] || [])),
    writeJSON: (file, data) => { storeData[file] = data; }
  };
}

let app;

beforeEach(() => {
  storeData = {
    'users.json': [{ id: 1, username: 'admin', role: 'teacher' }],
    'questions.json': [
      { id: 1, topic: 'Docker', difficulty: 'easy', question: 'What is Docker?', options: { A: 'Container', B: 'VM', C: 'OS', D: 'Language' }, correct: 'A' },
      { id: 2, topic: 'Git', difficulty: 'hard', question: 'What is rebase?', options: { A: 'Merge', B: 'Rebase', C: 'Pull', D: 'Push' }, correct: 'B' }
    ],
    'results.json': []
  };
  app = createApp({ store: mockStore() });
});

// ═══════════════════════════════════════════════════
// Core routes
// ═══════════════════════════════════════════════════

describe('GET /', () => {
  it('should return message, version, and env', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'DevOps Quiz API');
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
  it('should return status 200 with ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /version', () => {
  it('should return version info', async () => {
    const res = await request(app).get('/version');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('version');
  });
});

describe('CORS headers', () => {
  it('should include CORS headers', async () => {
    const res = await request(app).get('/');
    expect(res.headers['access-control-allow-origin']).toBeDefined();
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
  it('should use fallback version', async () => {
    const fallbackApp = createApp({ versionPath: '/nonexistent/version.txt', store: mockStore() });
    const res = await request(fallbackApp).get('/');
    expect(res.body.version).toBe('0.0.0');
  });
});

// ═══════════════════════════════════════════════════
// Auth routes
// ═══════════════════════════════════════════════════

describe('POST /auth/login', () => {
  it('should return 400 when username is missing', async () => {
    const res = await request(app).post('/auth/login').send({ role: 'student' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when role is invalid', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'test', role: 'admin' });
    expect(res.statusCode).toBe(400);
  });

  it('should return existing user if found', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'admin', role: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(res.body.user.username).toBe('admin');
  });

  it('should create new user when not found', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'newstudent', role: 'student' });
    expect(res.statusCode).toBe(201);
    expect(res.body.user.username).toBe('newstudent');
    expect(res.body.user.role).toBe('student');
  });

  it('should return 409 if username exists with different role', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'admin', role: 'student' });
    expect(res.statusCode).toBe(409);
  });
});

// ═══════════════════════════════════════════════════
// Question routes
// ═══════════════════════════════════════════════════

describe('GET /questions', () => {
  it('should return all questions', async () => {
    const res = await request(app).get('/questions');
    expect(res.statusCode).toBe(200);
    expect(res.body.questions).toHaveLength(2);
  });

  it('should filter by difficulty', async () => {
    const res = await request(app).get('/questions?difficulty=easy');
    expect(res.statusCode).toBe(200);
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.questions[0].difficulty).toBe('easy');
  });

  it('should filter by topic', async () => {
    const res = await request(app).get('/questions?topic=Git');
    expect(res.statusCode).toBe(200);
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.questions[0].topic).toBe('Git');
  });
});

describe('GET /questions/topics', () => {
  it('should return topic summary', async () => {
    const res = await request(app).get('/questions/topics');
    expect(res.statusCode).toBe(200);
    expect(res.body.topics).toBeDefined();
  });
});

describe('POST /questions', () => {
  it('should return 400 when fields are missing', async () => {
    const res = await request(app).post('/questions').send({ question: 'incomplete' });
    expect(res.statusCode).toBe(400);
  });

  it('should create a question with valid data', async () => {
    const newQ = {
      question: 'What is CI?', options: { A: 'Integration', B: 'Delivery', C: 'Deploy', D: 'None' },
      correct: 'A', difficulty: 'easy', topic: 'CI/CD'
    };
    const res = await request(app).post('/questions').send(newQ);
    expect(res.statusCode).toBe(201);
    expect(res.body.question.id).toBe(3);
    expect(res.body.question.topic).toBe('CI/CD');
  });

  it('should return 400 for invalid correct answer', async () => {
    const res = await request(app).post('/questions').send({
      question: 'Q?', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correct: 'E', difficulty: 'easy', topic: 'Git'
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('PUT /questions/:id', () => {
  it('should update an existing question', async () => {
    const res = await request(app).put('/questions/1').send({ question: 'Updated?' });
    expect(res.statusCode).toBe(200);
    expect(res.body.question.question).toBe('Updated?');
  });

  it('should return 404 for non-existent question', async () => {
    const res = await request(app).put('/questions/999').send({ question: 'No' });
    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /questions/:id', () => {
  it('should delete an existing question', async () => {
    const res = await request(app).delete('/questions/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Deleted');
  });

  it('should return 404 for non-existent question', async () => {
    const res = await request(app).delete('/questions/999');
    expect(res.statusCode).toBe(404);
  });
});

// ═══════════════════════════════════════════════════
// Submit & Results
// ═══════════════════════════════════════════════════

describe('POST /submit', () => {
  it('should return 400 when required fields missing', async () => {
    const res = await request(app).post('/submit').send({ userId: 1 });
    expect(res.statusCode).toBe(400);
  });

  it('should return 404 for non-existent user', async () => {
    const res = await request(app).post('/submit').send({ userId: 999, answers: { 1: 'A' }, difficulty: 'easy', topic: 'Docker' });
    expect(res.statusCode).toBe(404);
  });

  it('should submit and return score', async () => {
    const res = await request(app).post('/submit').send({
      userId: 1, answers: { 1: 'A', 2: 'C' }, difficulty: 'easy', topic: 'Docker'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.score).toBe(1);
    expect(res.body.total).toBe(2);
    expect(res.body.percentage).toBe(50);
  });
});

describe('GET /results/:userId', () => {
  it('should return empty results for new user', async () => {
    const res = await request(app).get('/results/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.results).toHaveLength(0);
  });
});

describe('GET /results', () => {
  it('should return all results with username', async () => {
    // Submit first
    await request(app).post('/submit').send({ userId: 1, answers: { 1: 'A' }, difficulty: 'easy', topic: 'Docker' });
    const res = await request(app).get('/results');
    expect(res.statusCode).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    expect(res.body.results[0].username).toBe('admin');
  });
});
