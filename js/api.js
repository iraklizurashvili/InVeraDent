// js/api.js — all network access to the appointments backend lives here

const MOCK_API = 'https://6a29a136f59cb8f65f1d6e62.mockapi.io';

/**
 * fetchAppointments — retrieves all appointment records from the
 * external MockAPI endpoint using async/await.
 *
 * Throws an Error on non-2xx responses so callers can catch it
 * and display a user-visible error message.
 */
export async function fetchAppointments() {
  const res = await fetch(`${MOCK_API}/appointments`);
  if (!res.ok) throw new Error(`სერვერის შეცდომა (${res.status})`);
  return res.json();
}

/**
 * createAppointment — sends a new booking to the backend (POST).
 * Returns the created record (including the server-assigned id).
 *
 * Used by the booking form on contact.html so a real submission
 * shows up on the dashboard.
 */
export async function createAppointment(appointment) {
  const res = await fetch(`${MOCK_API}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointment),
  });
  if (!res.ok) throw new Error(`ჩაწერა ვერ შეიქმნა (${res.status})`);
  return res.json();
}

/**
 * deleteAppointment — removes an appointment by id (DELETE).
 * Used by the 🗑️ button on each dashboard card.
 */
export async function deleteAppointment(id) {
  const res = await fetch(`${MOCK_API}/appointments/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`წაშლა ვერ მოხერხდა (${res.status})`);
  return res.json();
}
