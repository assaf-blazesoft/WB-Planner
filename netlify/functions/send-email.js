/**
 * Netlify function: send transactional emails via Resend.
 * POST body: { type, recipientEmail, data }
 *
 * Types:
 *   invite        — new user invite
 *   task_assigned — task assigned to a user
 *   status_update — task status changed
 *   new_comment   — comment added to a task
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.FROM_EMAIL || 'noreply@winbonanza.com';
const APP_URL        = process.env.APP_URL    || 'https://wb-roadmap.netlify.app';

function buildSubject(type, data) {
  switch (type) {
    case 'invite':        return 'You have been invited to Winbonanza Planner';
    case 'task_assigned': return `Task assigned: ${data.taskTitle}`;
    case 'status_update': return `Task update: ${data.taskTitle}`;
    case 'new_comment':   return `New comment on: ${data.taskTitle}`;
    default:              return 'Winbonanza Planner notification';
  }
}

function buildHtml(type, data) {
  const base = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#f1f5f9;background:#1a1d27;padding:32px;border-radius:12px">
      <h2 style="color:#7F77DD;margin-top:0">Winbonanza Planner</h2>
  `;
  const footer = `
      <hr style="border-color:#2d3148;margin:24px 0">
      <p style="color:#94a3b8;font-size:12px">
        You can <a href="${APP_URL}" style="color:#7F77DD">open the planner here</a>.
      </p>
    </div>
  `;

  switch (type) {
    case 'invite':
      return base + `
        <p>${data.inviterName || 'Your admin'} has invited you to join Winbonanza Planner.</p>
        <a href="${data.appUrl || APP_URL}/accept-invite?token=${data.token}"
           style="display:inline-block;background:#7F77DD;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin:16px 0">
          Accept invite
        </a>
        <p style="color:#94a3b8;font-size:12px">This link expires in 7 days.</p>
      ` + footer;

    case 'task_assigned':
      return base + `
        <p><strong>${data.assignerName || 'Admin'}</strong> has assigned you a task:</p>
        <p style="font-size:16px;font-weight:600;color:#f1f5f9">${data.taskTitle}</p>
        <a href="${data.appUrl || APP_URL}"
           style="display:inline-block;background:#7F77DD;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin:16px 0">
          View task
        </a>
      ` + footer;

    case 'status_update':
      return base + `
        <p><strong>${data.updaterName || 'A user'}</strong> updated the status of a task you're assigned to:</p>
        <p style="font-size:16px;font-weight:600;color:#f1f5f9">${data.taskTitle}</p>
        <p>New status: <strong style="color:#7F77DD">${(data.newStatus || '').replace('_', ' ')}</strong></p>
      ` + footer;

    case 'new_comment':
      return base + `
        <p><strong>${data.commenterName || 'A user'}</strong> commented on <strong>${data.taskTitle}</strong>:</p>
        <blockquote style="border-left:3px solid #7F77DD;padding-left:12px;color:#94a3b8;margin:16px 0">
          ${data.comment}
        </blockquote>
      ` + footer;

    default:
      return base + '<p>You have a new notification in Winbonanza Planner.</p>' + footer;
  }
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — email not sent');
    return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: true }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { type, recipientEmail, data = {} } = body;
  if (!type || !recipientEmail) {
    return { statusCode: 400, body: 'Missing type or recipientEmail' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      [recipientEmail],
      subject: buildSubject(type, data),
      html:    buildHtml(type, data),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
    return { statusCode: 500, body: 'Email send failed' };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
