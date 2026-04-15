const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'rsvps.json');
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;
const EMAIL_TO = process.env.EMAIL_TO || 'davidwedskate08@gmail.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Wedding RSVP <onboarding@resend.dev>';

async function ensureStorage() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    await fsp.writeFile(DATA_FILE, JSON.stringify({ nextId: 1, rsvps: [] }, null, 2));
  }
}

async function readData() {
  await ensureStorage();
  const raw = await fsp.readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

async function writeData(data) {
  await fsp.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.json': return 'application/json; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

async function serveFile(res, filePath) {
  try {
    const resolved = path.normalize(filePath);
    if (!resolved.startsWith(PUBLIC_DIR)) {
      sendJson(res, 403, { error: 'Forbidden' });
      return;
    }
    const content = await fsp.readFile(resolved);
    res.writeHead(200, { 'Content-Type': getContentType(resolved) });
    res.end(content);
  } catch {
    sendJson(res, 404, { error: 'Not found' });
  }
}

function isAuthorized(reqUrl, headers) {
  if (!ADMIN_KEY) return true;
  const providedHeader = headers['x-admin-key'];
  const providedQuery = reqUrl.searchParams.get('key');
  return providedHeader === ADMIN_KEY || providedQuery === ADMIN_KEY;
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function sendEmailNotification(rsvp) {
  if (!RESEND_API_KEY) return { sent: false, reason: 'RESEND_API_KEY not configured' };

  const html = `
    <h2>New Wedding RSVP</h2>
    <p><strong>Name:</strong> ${rsvp.full_name}</p>
    <p><strong>Email:</strong> ${rsvp.email}</p>
    <p><strong>Phone:</strong> ${rsvp.phone}</p>
    <p><strong>Dietary Restrictions:</strong> ${rsvp.dietary_option}</p>
    <p><strong>Additional Details:</strong> ${rsvp.dietary_details || 'None'}</p>
    <p><strong>Submitted:</strong> ${rsvp.created_at}</p>
    <p><a href="${SITE_URL}/admin">Open Admin Dashboard</a></p>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [EMAIL_TO],
      subject: `New RSVP from ${rsvp.full_name}`,
      html
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Email send failed: ${text}`);
  }

  return { sent: true };
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, SITE_URL);

  try {
    if (req.method === 'GET' && reqUrl.pathname === '/') {
      return serveFile(res, path.join(PUBLIC_DIR, 'index.html'));
    }

    if (req.method === 'GET' && reqUrl.pathname === '/admin') {
      return serveFile(res, path.join(PUBLIC_DIR, 'admin.html'));
    }

    if (req.method === 'GET' && reqUrl.pathname.startsWith('/assets/')) {
      return serveFile(res, path.join(PUBLIC_DIR, reqUrl.pathname));
    }

    if (req.method === 'GET' && ['/styles.css', '/script.js', '/admin.js'].includes(reqUrl.pathname)) {
      return serveFile(res, path.join(PUBLIC_DIR, reqUrl.pathname));
    }

    if (req.method === 'GET' && reqUrl.pathname === '/api/health') {
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && reqUrl.pathname === '/api/rsvp') {
      const body = await parseBody(req);
      const fullName = String(body.fullName || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const phone = String(body.phone || '').trim();
      const dietaryOption = String(body.dietaryOption || '').trim();
      const dietaryDetails = String(body.dietaryDetails || '').trim();

      if (!fullName || !email || !phone || !dietaryOption) {
        return sendJson(res, 400, { error: 'Please complete all required fields.' });
      }

      const data = await readData();
      if (data.rsvps.some((item) => item.email === email)) {
        return sendJson(res, 409, { error: 'An RSVP with this email has already been submitted.' });
      }

      const rsvp = {
        id: data.nextId++,
        full_name: fullName,
        email,
        phone,
        dietary_option: dietaryOption,
        dietary_details: dietaryDetails,
        created_at: new Date().toISOString()
      };

      data.rsvps.unshift(rsvp);
      await writeData(data);

      let emailStatus = { sent: false };
      try {
        emailStatus = await sendEmailNotification(rsvp);
      } catch (error) {
        emailStatus = { sent: false, reason: error.message };
      }

      return sendJson(res, 201, {
        success: true,
        message: 'Thank you for your RSVP.',
        rsvp,
        emailStatus
      });
    }

    if (req.method === 'GET' && reqUrl.pathname === '/api/admin/rsvps') {
      if (!isAuthorized(reqUrl, req.headers)) {
        return sendJson(res, 401, { error: 'Unauthorized' });
      }

      const data = await readData();
      return sendJson(res, 200, {
        stats: {
          totalRsvps: data.rsvps.length,
          rsvpsWithPlusOne: 0,
          totalGuests: data.rsvps.length
        },
        rsvps: data.rsvps
      });
    }

    if (req.method === 'DELETE' && reqUrl.pathname.startsWith('/api/admin/rsvps/')) {
      if (!isAuthorized(reqUrl, req.headers)) {
        return sendJson(res, 401, { error: 'Unauthorized' });
      }

      const id = Number(reqUrl.pathname.split('/').pop());
      const data = await readData();
      const before = data.rsvps.length;
      data.rsvps = data.rsvps.filter((item) => item.id !== id);

      if (before === data.rsvps.length) {
        return sendJson(res, 404, { error: 'RSVP not found.' });
      }

      await writeData(data);
      return sendJson(res, 200, { success: true });
    }

    const fallbackPath = path.join(PUBLIC_DIR, reqUrl.pathname);
    if (req.method === 'GET' && fs.existsSync(fallbackPath)) {
      return serveFile(res, fallbackPath);
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: 'Internal server error' });
  }
});

ensureStorage().then(() => {
  server.listen(PORT, () => {
    console.log(`Wedding RSVP website running at ${SITE_URL}`);
  });
});
