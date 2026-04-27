const API_URL = import.meta.env.VITE_BOT_API_URL || '';

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };
  const response = await fetch(url, config);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  }
  return response.json();
}

export async function sendCommand({ prompt, systemPrompt, conversationId }) {
  return request('/api/v1/command', {
    method: 'POST',
    body: JSON.stringify({ prompt, systemPrompt, conversationId }),
  });
}

export async function getStatus() {
  return request('/api/v1/status');
}

export async function getDiagnostico() {
  return request('/api/v1/diagnostico');
}

export async function sendWhatsApp({ to, message }) {
  return request('/api/v1/whatsapp/send', {
    method: 'POST',
    body: JSON.stringify({ to, message }),
  });
}
