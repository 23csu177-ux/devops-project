import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

const TOPIC_ICONS = { Git: '🔀', Docker: '🐳', Kubernetes: '☸️', Jenkins: '🔧', 'CI/CD': '🔄', DevSecOps: '🔒' };
const TIMER_SECONDS = 30;

export default function StudentDashboard({ user, onLogout }) {
  const [view, setView] = useState('topics');       // topics | quiz | score | history
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  // Load topics on mount
  useEffect(() => {
    api.getTopics().then(d => setTopics(d.topics || [])).catch(() => {});
    api.getResults(user.id).then(d => setHistory(d.results || [])).catch(() => {});
  }, [user.id]);

  // Timer logic
  useEffect(() => {
    if (view !== 'quiz' || revealed) return;
    setTimeLeft(TIMER_SECONDS);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [view, current, revealed]);

  // Auto-reveal when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && view === 'quiz' && !revealed) setRevealed(true);
  }, [timeLeft, view, revealed]);

  const startQuiz = async (topic, diff) => {
    setLoading(true);
    try {
      const data = await api.getQuestions(topic, diff);
      const qs = data.questions || [];
      if (qs.length === 0) { alert('No questions found'); setLoading(false); return; }
      setSelectedTopic(topic);
      setDifficulty(diff);
      setQuestions(qs);
      setCurrent(0);
      setAnswers({});
      setRevealed(false);
      setResult(null);
      setView('quiz');
    } catch { alert('Failed to load questions'); }
    setLoading(false);
  };

  const pickAnswer = (letter) => {
    if (revealed) return;
    setAnswers(prev => ({ ...prev, [questions[current].id]: letter }));
    setRevealed(true);
    clearInterval(timerRef.current);
  };

  const nextQuestion = () => {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setRevealed(false);
    }
  };

  const submitQuiz = async () => {
    setLoading(true);
    try {
      const data = await api.submitQuiz(user.id, answers, difficulty, selectedTopic);
      setResult(data);
      setView('score');
      api.getResults(user.id).then(d => setHistory(d.results || [])).catch(() => {});
    } catch { alert('Failed to submit quiz'); }
    setLoading(false);
  };

  const goHome = () => {
    setView('topics');
    setResult(null);
    setQuestions([]);
    api.getTopics().then(d => setTopics(d.topics || [])).catch(() => {});
  };

  const q = questions[current];
  const pct = (timeLeft / TIMER_SECONDS) * 100;
  const timerClass = timeLeft <= 5 ? 'danger' : timeLeft <= 10 ? 'warning' : '';

  // Score ring helpers
  const circumference = 2 * Math.PI * 72;

  return (
    <div className="app">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-brand">🚀 DevOps Quiz</div>
        <div className="nav-right">
          <span className="nav-user">{user.username}</span>
          <span className="badge badge-student">Student</span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <div className="container">
        {/* Tab bar for topics / history */}
        {(view === 'topics' || view === 'history') && (
          <div className="tabs" style={{ marginTop: 24 }}>
            <button className={`tab ${view === 'topics' ? 'active' : ''}`} onClick={() => setView('topics')}>Topics</button>
            <button className={`tab ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}>History</button>
          </div>
        )}

        {/* ── TOPICS VIEW ─────────────────── */}
        {view === 'topics' && (
          <>
            <h1 className="page-title">Choose a Topic</h1>
            <p className="page-subtitle">Pick a topic and difficulty to start your quiz</p>
            <div className="topics-grid">
              {topics.map(t => (
                <TopicCard key={t.topic} topic={t} icon={TOPIC_ICONS[t.topic] || '📘'} onStart={startQuiz} loading={loading} />
              ))}
            </div>
          </>
        )}

        {/* ── HISTORY VIEW ────────────────── */}
        {view === 'history' && (
          <div className="card">
            <div className="card-hdr"><h2>Quiz History</h2></div>
            {history.length === 0 ? (
              <div className="empty"><div className="empty-icon">📊</div><p>No quiz attempts yet</p></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>#</th><th>Date</th><th>Topic</th><th>Difficulty</th><th>Score</th><th>%</th></tr></thead>
                <tbody>
                  {history.map((r, i) => {
                    const p = Math.round((r.score / r.total) * 100);
                    return (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td>{new Date(r.completedAt).toLocaleDateString()}</td>
                        <td>{r.topic || '-'}</td>
                        <td>{r.difficulty}</td>
                        <td>{r.score}/{r.total}</td>
                        <td className={p >= 70 ? 'pct-good' : p >= 40 ? 'pct-ok' : 'pct-bad'}>{p}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── QUIZ VIEW ───────────────────── */}
        {view === 'quiz' && q && (
          <>
            <div className="quiz-header">
              <div className="quiz-info">
                <span className="quiz-badge quiz-badge-topic">{selectedTopic}</span>
                <span className={`quiz-badge quiz-badge-diff-${difficulty}`}>{difficulty}</span>
              </div>
              <span className="quiz-progress-text">Question {current + 1} of {questions.length}</span>
            </div>

            {/* Timer */}
            <div className={`timer-text ${timerClass}`}>{timeLeft}s</div>
            <div className="timer-bar-container">
              <div className={`timer-bar ${timerClass}`} style={{ width: `${pct}%` }} />
            </div>

            {/* Question */}
            <div className="question-card" key={q.id}>
              <span className="q-number">Q{current + 1}</span>
              <p className="q-text">{q.question}</p>
              <div className="options-list">
                {['A', 'B', 'C', 'D'].map(letter => {
                  let cls = 'option';
                  if (revealed) {
                    if (letter === q.correct) cls += ' correct';
                    else if (letter === answers[q.id] && letter !== q.correct) cls += ' incorrect';
                  } else if (answers[q.id] === letter) {
                    cls += ' selected';
                  }
                  return (
                    <button key={letter} className={cls} onClick={() => pickAnswer(letter)} disabled={revealed}>
                      <span className="opt-letter">{letter}</span>
                      <span>{q.options[letter]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="quiz-nav">
              {revealed && current < questions.length - 1 && (
                <button className="btn btn-primary" onClick={nextQuestion}>Next Question →</button>
              )}
              {revealed && current === questions.length - 1 && (
                <button className="btn btn-primary" onClick={submitQuiz} disabled={loading}>
                  {loading ? 'Submitting...' : 'Finish Quiz'}
                </button>
              )}
            </div>
          </>
        )}

        {/* ── SCORE VIEW ──────────────────── */}
        {view === 'score' && result && (
          <div className="score-screen">
            <div className="score-ring">
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle className="score-ring-bg" cx="90" cy="90" r="72" />
                <circle
                  className="score-ring-fill"
                  cx="90" cy="90" r="72"
                  stroke={result.percentage >= 70 ? 'var(--success)' : result.percentage >= 40 ? 'var(--warning)' : 'var(--error)'}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (circumference * result.percentage) / 100}
                />
              </svg>
              <div className="score-ring-text">{result.percentage}%</div>
            </div>
            <div className="score-label">{result.percentage >= 70 ? 'Great Job! 🎉' : result.percentage >= 40 ? 'Good Effort! 💪' : 'Keep Practicing! 📚'}</div>
            <div className="score-detail">You scored {result.score} out of {result.total}</div>

            {/* Bar chart */}
            <div className="score-bar-chart">
              <BarItem label="Correct" value={result.score} max={result.total} cls="bar-correct" />
              <BarItem label="Wrong" value={result.total - result.score - (result.total - Object.keys(answers).length)} max={result.total} cls="bar-incorrect" />
              <BarItem label="Skipped" value={result.total - Object.keys(answers).length} max={result.total} cls="bar-skipped" />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={goHome}>Back to Topics</button>
              <button className="btn btn-ghost" onClick={() => startQuiz(selectedTopic, difficulty)}>Retry</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Topic Card Sub-Component ────────────── */
function TopicCard({ topic, icon, onStart, loading }) {
  const [diff, setDiff] = useState(null);
  return (
    <div className="topic-card">
      <div className="topic-icon">{icon}</div>
      <div className="topic-name">{topic.topic}</div>
      <div className="topic-count">{topic.count} questions</div>
      <div className="difficulty-tabs">
        {['easy', 'medium', 'hard'].map(d => {
          const cnt = topic.difficulties[d] || 0;
          return (
            <button
              key={d}
              className={`diff-tab ${d} ${diff === d ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setDiff(d); onStart(topic.topic, d); }}
              disabled={cnt === 0 || loading}
            >
              <span className="diff-count">{cnt}</span>{d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Bar Item Sub-Component ──────────────── */
function BarItem({ label, value, max, cls }) {
  const h = max > 0 ? Math.max((value / max) * 100, 4) : 4;
  return (
    <div className="bar-item">
      <div className={`bar ${cls}`} style={{ height: `${h}%` }} />
      <span className="bar-label">{value} {label}</span>
    </div>
  );
}
