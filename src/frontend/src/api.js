const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

async function request(url, options = {}) {
  const res = await fetch(`${API}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const api = {
  login: (username, role) => request('/auth/login', { method: 'POST', body: { username, role } }),
  getTopics: () => request('/questions/topics'),
  getQuestions: (topic, difficulty) => request(`/questions?topic=${encodeURIComponent(topic)}&difficulty=${encodeURIComponent(difficulty)}`),
  getAllQuestions: () => request('/questions'),
  createQuestion: (data) => request('/questions', { method: 'POST', body: data }),
  updateQuestion: (id, data) => request(`/questions/${id}`, { method: 'PUT', body: data }),
  deleteQuestion: (id) => request(`/questions/${id}`, { method: 'DELETE' }),
  submitQuiz: (userId, answers, difficulty, topic) => request('/submit', { method: 'POST', body: { userId, answers, difficulty, topic } }),
  getResults: (userId) => request(`/results/${userId}`),
  getAllResults: () => request('/results')
};

export default api;
