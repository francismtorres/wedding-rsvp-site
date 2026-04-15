const loadButton = document.getElementById('loadDashboard');
const adminKeyInput = document.getElementById('adminKey');
const adminMessage = document.getElementById('adminMessage');
const tableBody = document.getElementById('rsvpTableBody');

function getHeaders() {
  const key = adminKeyInput.value.trim();
  return key ? { 'x-admin-key': key } : {};
}

async function loadDashboard() {
  adminMessage.textContent = 'Loading dashboard...';
  try {
    const response = await fetch('/api/admin/rsvps', { headers: getHeaders() });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unable to load dashboard.');
    }

    document.getElementById('totalRsvps').textContent = data.stats.totalRsvps;
    document.getElementById('plusOnes').textContent = data.stats.rsvpsWithPlusOne;
    document.getElementById('totalGuests').textContent = data.stats.totalGuests;

    if (!data.rsvps.length) {
      tableBody.innerHTML = '<tr><td colspan="6">No RSVPs submitted yet.</td></tr>';
    } else {
      tableBody.innerHTML = data.rsvps
        .map(
          (rsvp) => `
            <tr>
              <td>${escapeHtml(rsvp.full_name)}</td>
              <td>${escapeHtml(rsvp.email)}</td>
              <td>${escapeHtml(rsvp.phone)}</td>
              <td>${escapeHtml(rsvp.dietary_option)}${
                rsvp.dietary_details ? `<br><small>${escapeHtml(rsvp.dietary_details)}</small>` : ''
              }</td>
              <td>${new Date(rsvp.created_at).toLocaleString()}</td>
              <td><button class="delete-button" data-id="${rsvp.id}">Delete</button></td>
            </tr>
          `
        )
        .join('');
    }

    adminMessage.textContent = '';
  } catch (error) {
    adminMessage.textContent = error.message;
  }
}

async function deleteRsvp(id) {
  const confirmed = window.confirm('Delete this RSVP?');
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/admin/rsvps/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unable to delete RSVP.');
    }

    await loadDashboard();
  } catch (error) {
    adminMessage.textContent = error.message;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

loadButton?.addEventListener('click', loadDashboard);

document.addEventListener('click', (event) => {
  const button = event.target.closest('.delete-button');
  if (!button) return;
  deleteRsvp(button.dataset.id);
});
