const express = require('express');
const path = require('path');
const fs = require('fs/promises');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const RSVP_FILE = path.join(DATA_DIR, 'rsvps.json');
const FORMSPREE_ENDPOINT = (process.env.FORMSPREE_ENDPOINT || '').trim();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(RSVP_FILE);
  } catch {
    await fs.writeFile(RSVP_FILE, '[]', 'utf8');
  }
}

async function readRsvps() {
  await ensureDataFile();
  const raw = await fs.readFile(RSVP_FILE, 'utf8');
  return JSON.parse(raw);
}

async function writeRsvps(rsvps) {
  await ensureDataFile();
  await fs.writeFile(RSVP_FILE, JSON.stringify(rsvps, null, 2), 'utf8');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function safeText(value) {
  return String(value || '').trim();
}

async function forwardToFormspree(rsvp) {
  if (!FORMSPREE_ENDPOINT) {
    console.warn('FORMSPREE_ENDPOINT is missing. Skipping Formspree forward.');
    return { ok: false, skipped: true };
  }

  const payload = {
    fullName: rsvp.full_name,
    email: rsvp.email,
    phone: rsvp.phone,
    dietaryOption: rsvp.dietary_option,
    dietaryDetails: rsvp.dietary_details || '',
    submittedAt: rsvp.created_at,
    _subject: `New Wedding RSVP from ${rsvp.full_name}`
  };

  const response = await fetch(FORMSPREE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Formspree error ${response.status}: ${text}`);
  }

  return { ok: true };
}

app.post('/api/rsvp', async (req, res) => {
  try {
    const fullName = safeText(req.body.fullName);
    const email = normalizeEmail(req.body.email);
    const phone = safeText(req.body.phone);
    const dietaryOption = safeText(req.body.dietaryOption);
    const dietaryDetails = safeText(req.body.dietaryDetails);

    if (!fullName || !email || !phone || !dietaryOption) {
      return res.status(400).json({
        ok: false,
        message: 'Please complete all required fields.'
      });
    }

    const rsvps = await readRsvps();

    const duplicate = rsvps.find(
      (entry) => normalizeEmail(entry.email) === email
    );

    if (duplicate) {
      return res.status(409).json({
        ok: false,
        message: 'An RSVP has already been submitted with this email address.'
      });
    }

    const rsvp = {
      id: Date.now().toString(),
      full_name: fullName,
      email,
      phone,
      dietary_option: dietaryOption,
      dietary_details:
        dietaryOption === 'Other/Multiple Allergies' ? dietaryDetails : '',
      created_at: new Date().toISOString()
    };

    rsvps.unshift(rsvp);
    await writeRsvps(rsvps);

    try {
      await forwardToFormspree(rsvp);
    } catch (formspreeError) {
      console.error('Formspree forward failed:', formspreeError.message);
    }

    return res.json({
      ok: true,
      message: 'RSVP submitted successfully.'
    });
  } catch (error) {
    console.error('RSVP submit error:', error);
    return res.status(500).json({
      ok: false,
      message: 'Something went wrong while submitting your RSVP.'
    });
  }
});

app.get('/api/rsvps', async (_req, res) => {
  try {
    const rsvps = await readRsvps();

    return res.json({
      ok: true,
      rsvps,
      stats: {
        totalRsvps: rsvps.length,
        plusOnes: 0,
        totalGuests: rsvps.length
      }
    });
  } catch (error) {
    console.error('Read RSVPs error:', error);
    return res.status(500).json({
      ok: false,
      message: 'Unable to load RSVPs.'
    });
  }
});

app.delete('/api/rsvp/:id', async (req, res) => {
  try {
    const id = safeText(req.params.id);
    const rsvps = await readRsvps();
    const filtered = rsvps.filter((entry) => entry.id !== id);

    await writeRsvps(filtered);

    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete RSVP error:', error);
    return res.status(500).json({
      ok: false,
      message: 'Unable to delete RSVP.'
    });
  }
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Wedding RSVP site is running on port ${PORT}`);
});
