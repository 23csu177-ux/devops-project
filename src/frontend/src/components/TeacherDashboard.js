import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

const ALL_TOPICS = ['Git', 'Docker', 'Kubernetes', 'Jenkins', 'CI/CD', 'DevSecOps'];
const ALL_DIFFS = ['easy', 'medium', 'hard'];

function QuestionModal({ question, onClose, onSave }) {
  const [form, setForm] = useState({
    question: '', A: '', B: '', C: '', D: '', correct: 'A', difficulty: 'medium', topic: 'Docker'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (question) {
      setForm({
        question: question.question,
        A: question.options.A,
        B: question.options.B,
        C: question.options.C,
        D: question.options.D,
        correct: question.correct,
        difficulty: question.difficulty,
        topic: question.topic
      });
    }
  }, [question]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.question || !form.A || !form.B || !form.C || !form.D || !form.topic) {
      setError('All fields are required'); return;
    }
    setLoading(true);
    setError('');
    try {
      const body = {
        question: form.question,
        options: { A: form.A, B: form.B, C: form.C, D: form.D },
        correct: form.correct,
        difficulty: form.difficulty,
        topic: form.topic
      };
      if (question) await api.updateQuestion(question.id, body);
      else await api.createQuestion(body);
      onSave();
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{question ? 'Edit Question' : 'Add New Question'}</h3>
        {error && <div className="error-box">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Question</label>
            <textarea className="form-input" value={form.question} onChange={e => set('question', e.target.value)} maxLength={1000} />
          </div>
          {['A', 'B', 'C', 'D'].map(l => (
            <div className="form-group" key={l}>
              <label>Option {l}</label>
              <input className="form-input" value={form[l]} onChange={e => set(l, e.target.value)} maxLength={255} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Correct Answer</label>
              <select className="form-input" value={form.correct} onChange={e => set('correct', e.target.value)}>
                {['A','B','C','D'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Difficulty</label>
              <select className="form-input" value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
                {ALL_DIFFS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Topic</label>
              <select className="form-input" value={form.topic} onChange={e => set('topic', e.target.value)}>
                {ALL_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-btns">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (question ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeacherDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('questions');
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterTopic, setFilterTopic] = useState('');
  const [filterDiff, setFilterDiff] = useState('');

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try { const d = await api.getAllQuestions(); setQuestions(d.questions || []); } catch (_) { /* ignore */ }
    setLoading(false);
  }, []);

  const loadResults = useCallback(async () => {
    try { const d = await api.getAllResults(); setResults(d.results || []); } catch (_) { /* ignore */ }
  }, []);

  useEffect(() => { loadQuestions(); loadResults(); }, [loadQuestions, loadResults]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try { await api.deleteQuestion(id); loadQuestions(); } catch (_) { /* ignore */ }
  };

  const handleSave = () => { setShowModal(false); setEditing(null); loadQuestions(); };

  const filtered = questions.filter(q =>
    (!filterTopic || q.topic === filterTopic) && (!filterDiff || q.difficulty === filterDiff)
  );

  const totalStudents = [...new Set(results.map(r => r.userId))].length;
  const avgScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + (r.score / r.total) * 100, 0) / results.length)
    : 0;

  const diffColor = { easy: 'var(--success)', medium: 'var(--warning)', hard: 'var(--error)' };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">🚀 DevOps Quiz — Teacher</div>
        <div className="nav-right">
          <span className="nav-user">{user.username}</span>
          <span className="badge badge-teacher">Teacher</span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <div className="container">
        {/* Stats */}
        <div className="stats-row" style={{ marginTop: 24 }}>
          <div className="stat-box"><div className="stat-val">{questions.length}</div><div className="stat-lbl">Questions</div></div>
          <div className="stat-box"><div className="stat-val">{totalStudents}</div><div className="stat-lbl">Students</div></div>
          <div className="stat-box"><div className="stat-val">{results.length}</div><div className="stat-lbl">Attempts</div></div>
          <div className="stat-box"><div className="stat-val">{avgScore}%</div><div className="stat-lbl">Avg Score</div></div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${tab === 'questions' ? 'active' : ''}`} onClick={() => setTab('questions')}>Questions</button>
          <button className={`tab ${tab === 'results' ? 'active' : ''}`} onClick={() => setTab('results')}>Results</button>
        </div>

        {/* QUESTIONS TAB */}
        {tab === 'questions' && (
          <div className="card">
            <div className="card-hdr">
              <h2>Questions ({filtered.length})</h2>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowModal(true); }}>+ Add</button>
            </div>

            {/* Filters */}
            <div className="filter-row">
              <button className={`filter-chip ${!filterTopic ? 'active' : ''}`} onClick={() => setFilterTopic('')}>All Topics</button>
              {ALL_TOPICS.map(t => (
                <button key={t} className={`filter-chip ${filterTopic === t ? 'active' : ''}`} onClick={() => setFilterTopic(filterTopic === t ? '' : t)}>{t}</button>
              ))}
            </div>
            <div className="filter-row">
              <button className={`filter-chip ${!filterDiff ? 'active' : ''}`} onClick={() => setFilterDiff('')}>All Levels</button>
              {ALL_DIFFS.map(d => (
                <button key={d} className={`filter-chip ${filterDiff === d ? 'active' : ''}`} onClick={() => setFilterDiff(filterDiff === d ? '' : d)}>{d}</button>
              ))}
            </div>

            {loading ? <div className="loading">Loading...</div> : filtered.length === 0 ? (
              <div className="empty"><div className="empty-icon">📚</div><p>No questions found</p></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>ID</th><th>Question</th><th>Topic</th><th>Diff</th><th>Ans</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map(q => (
                    <tr key={q.id}>
                      <td>{q.id}</td>
                      <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.question}</td>
                      <td>{q.topic}</td>
                      <td><span style={{ color: diffColor[q.difficulty], fontWeight: 700, fontSize: '0.82rem' }}>{q.difficulty}</span></td>
                      <td><strong>{q.correct}</strong></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(q); setShowModal(true); }}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(q.id)}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* RESULTS TAB */}
        {tab === 'results' && (
          <div className="card">
            <div className="card-hdr"><h2>Student Results ({results.length})</h2></div>
            {results.length === 0 ? (
              <div className="empty"><div className="empty-icon">📊</div><p>No results yet</p></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>#</th><th>Student</th><th>Date</th><th>Topic</th><th>Diff</th><th>Score</th><th>%</th></tr></thead>
                <tbody>
                  {results.map((r, i) => {
                    const p = Math.round((r.score / r.total) * 100);
                    return (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td>{r.username || `User #${r.userId}`}</td>
                        <td>{new Date(r.completedAt).toLocaleDateString()}</td>
                        <td>{r.topic || '-'}</td>
                        <td><span style={{ color: diffColor[r.difficulty], fontWeight: 700, fontSize: '0.82rem' }}>{r.difficulty}</span></td>
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

        {showModal && (
          <QuestionModal
            question={editing}
            onClose={() => { setShowModal(false); setEditing(null); }}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
}
