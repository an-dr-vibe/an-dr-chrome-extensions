const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

async function getToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, token => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(token);
    });
  });
}

async function gmailFetch(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail API ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function listFilters() {
  const data = await gmailFetch('/settings/filters');
  return data.filter || [];
}

export async function createFilter(criteria, action) {
  return gmailFetch('/settings/filters', {
    method: 'POST',
    body: JSON.stringify({ criteria, action }),
  });
}

export async function deleteFilter(id) {
  return gmailFetch(`/settings/filters/${id}`, { method: 'DELETE' });
}

export async function listLabels() {
  const data = await gmailFetch('/labels');
  return data.labels || [];
}
