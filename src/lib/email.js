const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || '/.netlify/functions';

export async function sendEmail(type, recipientEmail, data = {}) {
  try {
    await fetch(`${FUNCTIONS_URL}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, recipientEmail, data }),
    });
  } catch (err) {
    console.warn('Email send skipped (no functions server):', err.message);
  }
}
