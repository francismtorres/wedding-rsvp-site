const countdownTarget = new Date('2026-08-16T11:00:00-04:00').getTime();
const countdownEls = {
  days: document.getElementById('days'),
  hours: document.getElementById('hours'),
  minutes: document.getElementById('minutes'),
  seconds: document.getElementById('seconds')
};

function updateCountdown() {
  const now = Date.now();
  const distance = Math.max(countdownTarget - now, 0);

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((distance / (1000 * 60)) % 60);
  const seconds = Math.floor((distance / 1000) % 60);

  countdownEls.days.textContent = String(days).padStart(3, '0');
  countdownEls.hours.textContent = String(hours).padStart(2, '0');
  countdownEls.minutes.textContent = String(minutes).padStart(2, '0');
  countdownEls.seconds.textContent = String(seconds).padStart(2, '0');
}

updateCountdown();
setInterval(updateCountdown, 1000);

const dietaryOption = document.getElementById('dietaryOption');
const dietaryDetailsField = document.getElementById('dietaryDetailsField');
const form = document.getElementById('rsvpForm');
const formMessage = document.getElementById('formMessage');
const successState = document.getElementById('successState');

dietaryOption?.addEventListener('change', () => {
  const showDetails = dietaryOption.value === 'Other/Multiple Allergies';
  dietaryDetailsField.classList.toggle('hidden', !showDetails);
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  formMessage.textContent = 'Submitting your RSVP...';

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unable to submit RSVP.');
    }

    form.classList.add('hidden');
    successState.classList.remove('hidden');
    formMessage.textContent = '';
  } catch (error) {
    formMessage.textContent = error.message;
  }
});
