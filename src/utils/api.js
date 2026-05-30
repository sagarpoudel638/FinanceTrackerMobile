const BASE_URL = 'https://financetrackerbackend-jxbb.onrender.com/api/v1';

// ─── Generic fetch helper ─────────────────────────────────────────────────────

const request = async (method, path, body = null, token = null) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${BASE_URL}${path}`, options);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { message: 'Network error. Check your internet connection.' } };
  }
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const apiSignup = (name, email, password, confirmPassword) =>
  request('POST', '/auth/signup', { name, email, password, confirmPassword });

export const apiLogin = (email, password) =>
  request('POST', '/auth/login', { email, password });

export const apiResendVerification = (email) =>
  request('POST', '/auth/resend-verification', { email });

export const apiVerifyToken = (token) =>
  request('GET', '/auth/verify', null, token);

// ─── Transactions ─────────────────────────────────────────────────────────────

export const apiGetTransactions = (token) =>
  request('GET', '/transactions', null, token);

export const apiCreateTransaction = (token, title, income, expenses) =>
  request('POST', '/transactions/transaction', { title, income, expenses }, token);

export const apiUpdateTransaction = (token, id, title, income, expenses) =>
  request('PATCH', `/transactions/${id}`, { title, income, expenses }, token);

export const apiDeleteTransaction = (token, id) =>
  request('DELETE', `/transactions/${id}`, null, token);

// ─── AI Suggestions ───────────────────────────────────────────────────────────

export const apiGetSuggestions = (token) =>
  request('GET', '/transactions/suggestions', null, token);
