const weddingDate = new Date('2026-08-16T11:00:00');

function updateCountdown() {
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) {
    return;
  }

  const now = new Date();
  const diff = weddingDate.getTime() - now.getTime();

  if (diff <= 0) {
    daysEl.textContent = '000';
    hoursEl.textContent = '00';
    minutesEl.textContent = '00';
    secondsEl.textContent = '00';
    return;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  daysEl.textContent = String(days).padStart(3, '0');
  hoursEl.textContent = String(hours).padStart(2, '0');
  minutesEl.textContent = String(minutes).padStart(2, '0');
  secondsEl.textContent = String(seconds).padStart(2, '0');
}

function initCountdown() {
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

function initRsvpForm() {
  const form = document.getElementById('rsvpForm');
  const attendanceStatus = document.getElementById('attendanceStatus');
  const attendanceDetails = document.getElementById('attendanceDetails');
  const dietaryOption = document.getElementById('dietaryOption');
  const dietaryDetailsField = document.getElementById('dietaryDetailsField');
  const dietaryDetailsTextarea = dietaryDetailsField
    ? dietaryDetailsField.querySelector('textarea')
    : null;
  const formMessage = document.getElementById('formMessage');
  const successState = document.getElementById('successState');
  const submitButton = form ? form.querySelector('button[type="submit"]') : null;
  const phoneInput = form ? form.querySelector('input[name="phone"]') : null;

  if (!form) {
    return;
  }

  function toggleDietaryDetails() {
    if (!dietaryOption || !dietaryDetailsField) {
      return;
    }

    const showOther = dietaryOption.value === 'Other/Multiple Allergies';
    dietaryDetailsField.classList.toggle('hidden', !showOther);

    if (dietaryDetailsTextarea) {
      dietaryDetailsTextarea.required = showOther;
      if (!showOther) {
        dietaryDetailsTextarea.value = '';
      }
    }
  }

  function toggleAttendanceDetails() {
    if (!attendanceStatus || !attendanceDetails) {
      return;
    }

    const isDecline = attendanceStatus.value === 'Regretfully Decline';
    attendanceDetails.classList.toggle('hidden', isDecline);

    if (phoneInput) {
      phoneInput.required = !isDecline;
      if (isDecline) {
        phoneInput.value = '';
      }
    }

    if (dietaryOption) {
      dietaryOption.required = !isDecline;
      if (isDecline) {
        dietaryOption.value = '';
      }
    }

    if (dietaryDetailsField) {
      dietaryDetailsField.classList.add('hidden');
    }

    if (dietaryDetailsTextarea) {
      dietaryDetailsTextarea.required = false;
      if (isDecline) {
        dietaryDetailsTextarea.value = '';
      }
    }

    if (!isDecline) {
      toggleDietaryDetails();
    }
  }

  if (attendanceStatus) {
    attendanceStatus.addEventListener('change', toggleAttendanceDetails);
    toggleAttendanceDetails();
  }

  if (dietaryOption) {
    dietaryOption.addEventListener('change', toggleDietaryDetails);
    toggleDietaryDetails();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (formMessage) {
      formMessage.textContent = '';
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';
    }

    const formData = new FormData(form);

    const payload = {
      attendanceStatus: String(formData.get('attendanceStatus') || '').trim(),
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

      let result = {};
      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        if (formMessage) {
          formMessage.textContent =
            result.message || 'Unable to submit RSVP. Please try again.';
        }
        return;
      }

      form.reset();
      toggleAttendanceDetails();
      toggleDietaryDetails();

      if (formMessage) {
        formMessage.textContent = '';
      }

      form.classList.add('hidden');

      if (successState) {
        successState.classList.remove('hidden');
      }
    } catch (error) {
      if (formMessage) {
        formMessage.textContent =
          'Network error. Please refresh the page and try again.';
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit RSVP';
      }
    }
  });
}

async function loadAdminDashboard() {
  const statsTotal = document.getElementById('statsTotal');
  const statsPlusOne = document.getElementById('statsPlusOne');
  const statsGuests = document.getElementById('statsGuests');
  const tableBody = document.getElementById('adminTableBody');

  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = '<tr><td colspan="8">Loading RSVPs...</td></tr>';

  try {
    const response = await fetch('/api/rsvps', {
      headers: {
        Accept: 'application/json'
      }
    });

    let result = {};
    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (!response.ok || !result.ok) {
      throw new Error(result.message || 'Unable to load RSVPs.');
    }

    if (statsTotal) {
      statsTotal.textContent = String(result.stats?.totalRsvps ?? 0);
    }

    if (statsPlusOne) {
      statsPlusOne.textContent = String(result.stats?.plusOnes ?? 0);
    }

    if (statsGuests) {
      statsGuests.textContent = String(result.stats?.totalGuests ?? 0);
    }

    if (!Array.isArray(result.rsvps) || result.rsvps.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8">No RSVPs yet.</td></tr>';
      return;
    }

    tableBody.innerHTML = result.rsvps
      .map((entry) => {
        return `
          <tr>
            <td>${escapeHtml(entry.attendance_status || '-')}</td>
            <td>${escapeHtml(entry.full_name)}</td>
            <td>${escapeHtml(entry.email)}</td>
            <td>${escapeHtml(entry.phone || '-')}</td>
            <td>${escapeHtml(entry.dietary_option || '-')}</td>
            <td>${escapeHtml(entry.dietary_details || '-')}</td>
            <td>${escapeHtml(formatDate(entry.created_at))}</td>
            <td>
              <button class="delete-button" data-id="${escapeHtml(entry.id)}">Delete</button>
            </td>
          </tr>
        `;
      })
      .join('');

    const deleteButtons = tableBody.querySelectorAll('.delete-button');

    deleteButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.id;

        if (!id) {
          return;
        }

        const confirmed = window.confirm('Delete this RSVP?');
        if (!confirmed) {
          return;
        }

        try {
          const response = await fetch(`/api/rsvp/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: {
              Accept: 'application/json'
            }
          });

          let result = {};
          try {
            result = await response.json();
          } catch {
            result = {};
          }

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
    tableBody.innerHTML = '<tr><td colspan="8">Unable to load RSVPs.</td></tr>';
  }
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

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

document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initRsvpForm();
  loadAdminDashboard();
});
