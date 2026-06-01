// js/utils.js

/**
 * debounce — closure that delays `func` until the user stops
 * triggering it for `delay` ms. The private `timeoutId` variable
 * is captured in a closure — no external code can reset it.
 *
 * Real use here: search input on dashboard so the API filter
 * only fires ~300 ms after the user pauses typing.
 */
export function debounce(func, delay) {
  let timeoutId; // private — closed over by the returned function
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * createSessionCounter — factory that returns a counter object
 * whose current `count` lives in a private closure variable.
 * Persists across reloads via localStorage.
 *
 * Real use: track how many bookings the user makes per session.
 */
export function createSessionCounter(storageKey) {
  let count = parseInt(localStorage.getItem(storageKey) || '0', 10);
  return {
    increment() { count++; localStorage.setItem(storageKey, count); return count; },
    get()       { return count; },
    reset()     { count = 0; localStorage.removeItem(storageKey); },
  };
}

/**
 * createPriceCalculator — factory that wraps a private Set of
 * selected service IDs. Persists to localStorage automatically.
 *
 * Real use: price estimator on the prices page.
 *
 * @param {Array}  services    — array of {id, name, price} objects
 * @param {string} storageKey  — localStorage key for persistence
 */
export function createPriceCalculator(services, storageKey = 'selectedServices') {
  const saved    = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const selected = new Set(saved); // private — not exposed directly

  function save() {
    localStorage.setItem(storageKey, JSON.stringify([...selected]));
  }

  return {
    toggle(id)      { selected.has(id) ? selected.delete(id) : selected.add(id); save(); return this.getTotal(); },
    getTotal()      { return services.filter(s => selected.has(s.id)).reduce((acc, s) => acc + s.price, 0); },
    isSelected(id)  { return selected.has(id); },
    getSelected()   { return [...selected]; },
    reset()         { selected.clear(); save(); },
  };
}

/**
 * formatDate — converts an ISO or date string to a
 * human-readable Georgian format.
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ka-GE', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * el — thin createElement wrapper used throughout the module.
 */
export function el(tag, className = '', html = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html)      node.innerHTML = html;
  return node;
}
