const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { readJSON, writeJSON } = require('./store');

function readVersion(versionPath) {
  try {
    return fs.readFileSync(versionPath, 'utf8').trim();
  } catch (err) {
    console.warn('Could not read version.txt, using default version');
    return '0.0.0';
  }
}

function createApp(options) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const store = (options && options.store) || { readJSON, writeJSON };

  const versionPath = (options && options.versionPath)
    ? options.versionPath
    : path.join(__dirname, '..', '..', 'version.txt');

  const version = readVersion(versionPath);

  // ── Core routes ──
  app.get('/', (req, res) => {
    res.json({ message: 'DevOps Quiz API', version, env: process.env.NODE_ENV || 'development' });
  });

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/version', (req, res) => {
    res.json({ version });
  });

  // ── Auth ──
  app.post('/auth/login', (req, res) => {
    const { username, role } = req.body;
    if (!username || !role) return res.status(400).json({ error: 'Username and role are required' });
    if (!['student', 'teacher'].includes(role)) return res.status(400).json({ error: 'Role must be student or teacher' });

    const users = store.readJSON('users.json');
    let user = users.find(u => u.username === username && u.role === role);

    if (user) return res.json({ user });

    // Check if username taken with different role
    if (users.find(u => u.username === username)) {
      return res.status(409).json({ error: 'Username already exists with a different role' });
    }

    user = { id: (users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1), username, role, created_at: new Date().toISOString() };
    users.push(user);
    store.writeJSON('users.json', users);
    res.status(201).json({ user });
  });

  // ── Questions ──
  app.get('/questions', (req, res) => {
    let questions = store.readJSON('questions.json');
    const { difficulty, topic } = req.query;
    if (topic) questions = questions.filter(q => q.topic.toLowerCase() === topic.toLowerCase());
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      questions = questions.filter(q => q.difficulty === difficulty);
    }
    res.json({ questions });
  });

  app.get('/questions/topics', (req, res) => {
    const questions = store.readJSON('questions.json');
    const topicMap = {};
    questions.forEach(q => {
      if (!topicMap[q.topic]) topicMap[q.topic] = { easy: 0, medium: 0, hard: 0 };
      topicMap[q.topic][q.difficulty]++;
    });
    const topics = Object.entries(topicMap).map(([topic, difficulties]) => ({
      topic,
      count: difficulties.easy + difficulties.medium + difficulties.hard,
      difficulties
    }));
    res.json({ topics });
  });

  app.get('/questions/:id', (req, res) => {
    const questions = store.readJSON('questions.json');
    const q = questions.find(q => q.id === Number(req.params.id));
    if (!q) return res.status(404).json({ error: 'Question not found' });
    res.json({ question: q });
  });

  app.post('/questions', (req, res) => {
    const { question, options, correct, difficulty, topic } = req.body;
    if (!question || !options || !correct || !difficulty || !topic) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!options.A || !options.B || !options.C || !options.D) {
      return res.status(400).json({ error: 'All four options (A,B,C,D) are required' });
    }
    if (!['A', 'B', 'C', 'D'].includes(correct)) {
      return res.status(400).json({ error: 'correct must be A, B, C, or D' });
    }
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({ error: 'difficulty must be easy, medium, or hard' });
    }

    const questions = store.readJSON('questions.json');
    const newQ = {
      id: questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1,
      topic, difficulty, question, options, correct
    };
    questions.push(newQ);
    store.writeJSON('questions.json', questions);
    res.status(201).json({ question: newQ });
  });

  app.put('/questions/:id', (req, res) => {
    const questions = store.readJSON('questions.json');
    const idx = questions.findIndex(q => q.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Question not found' });

    const { question, options, correct, difficulty, topic } = req.body;
    if (question) questions[idx].question = question;
    if (options) questions[idx].options = { ...questions[idx].options, ...options };
    if (correct) questions[idx].correct = correct;
    if (difficulty) questions[idx].difficulty = difficulty;
    if (topic) questions[idx].topic = topic;

    store.writeJSON('questions.json', questions);
    res.json({ question: questions[idx] });
  });

  app.delete('/questions/:id', (req, res) => {
    const questions = store.readJSON('questions.json');
    const idx = questions.findIndex(q => q.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Question not found' });
    questions.splice(idx, 1);
    store.writeJSON('questions.json', questions);
    res.json({ message: 'Deleted' });
  });

  // ── Submit & Results ──
  app.post('/submit', (req, res) => {
    const { userId, answers, difficulty, topic } = req.body;
    if (!userId || !answers || !difficulty || !topic) {
      return res.status(400).json({ error: 'userId, answers, difficulty, and topic are required' });
    }

    const users = store.readJSON('users.json');
    if (!users.find(u => u.id === Number(userId))) {
      return res.status(404).json({ error: 'User not found' });
    }

    const questions = store.readJSON('questions.json');
    const answerIds = Object.keys(answers).map(Number);
    let score = 0;
    const details = [];
    answerIds.forEach(qid => {
      const q = questions.find(q => q.id === qid);
      if (!q) return;
      const isCorrect = answers[qid] === q.correct;
      if (isCorrect) score++;
      details.push({ questionId: qid, userAnswer: answers[qid], correctAnswer: q.correct, isCorrect });
    });

    const results = store.readJSON('results.json');
    const result = {
      id: results.length > 0 ? Math.max(...results.map(r => r.id)) + 1 : 1,
      userId: Number(userId), score, total: details.length,
      difficulty, topic, answers: details,
      completedAt: new Date().toISOString()
    };
    results.push(result);
    store.writeJSON('results.json', results);

    res.status(201).json({
      resultId: result.id, score, total: details.length,
      percentage: details.length > 0 ? Math.round((score / details.length) * 100) : 0,
      details
    });
  });

  app.get('/results/:userId', (req, res) => {
    const results = store.readJSON('results.json');
    const userResults = results.filter(r => r.userId === Number(req.params.userId)).reverse();
    res.json({ results: userResults });
  });

  app.get('/results', (req, res) => {
    const results = store.readJSON('results.json');
    const users = store.readJSON('users.json');
    const enriched = results.map(r => {
      const user = users.find(u => u.id === r.userId);
      return { ...r, username: user ? user.username : 'Unknown' };
    }).reverse();
    res.json({ results: enriched });
  });

  return app;
}

module.exports = { createApp, readVersion };
