const weddingDate = new Date('2026-08-16T11:00:00');

function updateCountdown() {
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  const now = new Date();
  const diff = weddingDate - now;

  if (diff <= 0) {
    daysEl.textContent = '000';
    hoursEl.textContent = '00';
    minutesEl.textContent = '00';
    secondsEl.textContent = '00';
    return;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  daysEl.textContent = String(days).padStart(3, '0');
  hoursEl.textContent = String(hours).padStart(2, '0');
  minutesEl.textContent = String(minutes).padStart(2, '0');
  secondsEl.textContent = String(seconds).padStart(2, '0');
}

updateCountdown();
setInterval(updateCountdown, 1000);

const dietaryOption = document.getElementById('dietaryOption');
const dietaryDetailsField = document.getElementById('dietaryDetailsField');
const form = document.getElementById('rsvpForm');
const formMessage = document.getElementById('formMessage');
const successState = document.getElementById('successState');

if (dietaryOption && dietaryDetailsField) {
  dietaryOption.addEventListener('change', () => {
    const showOther = dietaryOption.value === 'Other/Multiple Allergies';
    dietaryDetailsField.classList.toggle('hidden', !showOther);
  });
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (formMessage) {
      formMessage.textContent = '';
    }

    const formData = new FormData(form);

    const payload = {
      fullName: String(formData.get('fullName') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      dietaryOption: String(formData.get('dietaryOption') || '').trim(),
      dietaryDetails: String(formData.get('dietaryDetails') || '').trim()
    };

    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        if (formMessage) {
          formMessage.textContent =
            result.message || 'Unable to submit RSVP. Please try again.';
        }
        return;
      }

      form.reset();
      dietaryDetailsField?.classList.add('hidden');
      form.classList.add('hidden');
      successState?.classList.remove('hidden');
    } catch (error) {
      if (formMessage) {
        formMessage.textContent =
          'Network error. Please refresh the page and try again.';
      }
    }
  });
}

async function loadAdminDashboard() {
  const statsTotal = document.getElementById('statsTotal');
  const statsPlusOne = document.getElementById('statsPlusOne');
  const statsGuests = document.getElementById('statsGuests');
  const tableBody = document.getElementById('adminTableBody');

  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="7">Loading RSVPs...</td></tr>`;

  try {
    const response = await fetch('/api/rsvps', {
      headers: {
        Accept: 'application/json'
      }
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.message || 'Unable to load RSVPs.');
    }

    if (statsTotal) statsTotal.textContent = result.stats.totalRsvps;
    if (statsPlusOne) statsPlusOne.textContent = result.stats.plusOnes;
    if (statsGuests) statsGuests.textContent = result.stats.totalGuests;

    if (!result.rsvps.length) {
      tableBody.innerHTML = `<tr><td colspan="7">No RSVPs yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = result.rsvps
      .map((entry) => {
        return `
          <tr>
            <td>${escapeHtml(entry.full_name)}</td>
            <td>${escapeHtml(entry.email)}</td>
            <td>${escapeHtml(entry.phone)}</td>
            <td>${escapeHtml(entry.dietary_option)}</td>
            <td>${escapeHtml(entry.dietary_details || '-')}</td>
            <td>${formatDate(entry.created_at)}</td>
            <td>
              <button class="delete-button" data-id="${entry.id}">Delete</button>
            </td>
          </tr>
        `;
      })
      .join('');

    tableBody.querySelectorAll('.delete-button').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.id;
        if (!id) return;

        const confirmed = window.confirm('Delete this RSVP?');
        if (!confirmed) return;

        try {
          const response = await fetch(`/api/rsvp/${id}`, {
            method: 'DELETE',
            headers: {
              Accept: 'application/json'
            }
          });

          const result = await response.json();

          if (!response.ok || !result.ok) {
            throw new Error(result.message || 'Delete failed.');
          }

          await loadAdminDashboard();
        } catch (error) {
          window.alert('Unable to delete RSVP right now.');
        }
      });
    });
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="7">Unable to load RSVPs.</td></tr>`;
  }
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

loadAdminDashboard();
