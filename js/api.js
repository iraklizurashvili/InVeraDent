// js/api.js

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
